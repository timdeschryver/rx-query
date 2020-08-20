import { Subject, of, scheduled, asapScheduler, EMPTY, timer } from 'rxjs';
import {
	scan,
	groupBy,
	mergeAll,
	map,
	tap,
	share,
	mergeScan,
	ignoreElements,
	observeOn,
	filter,
	switchMap,
	takeUntil,
	concatAll,
} from 'rxjs/operators';
import { QueryOutput, Revalidator } from './types';

export const revalidate = new Subject<Revalidator>();

export const cache = revalidate.pipe(
	// RxJS Live: What GroupsBy in Vegas, Stays in Vegas - Mike Ryan & Sam Julien
	// https://www.youtube.com/watch?v=hsr4ArAsOL4
	groupBy(
		(r) => r.key,
		(r) => r,
		(group) =>
			group.pipe(
				takeUntil(
					group.pipe(
						switchMap((g) => {
							switch (g.trigger) {
								case 'group-remove':
									return of(g);
								case 'group-unsubscribe':
									// cleanup the group when the whole group is unsubscribed,
									// after x milliseconds. This gives us a new cache for the group.
									return timer(g.config.cacheTime).pipe(
										tap(() => {
											revalidate.next({ ...g, trigger: 'group-remove' });
										}),
									);
								default:
									return EMPTY;
							}
						}),
					),
				),
				ignoreElements(),
			),
	),
	map((group) =>
		group.pipe(
			observeOn(asapScheduler),

			// keep a list of subscriptions
			// unsubscribe from the group when all subscribers are unsubscribed
			scan(
				(subscriptions, revalidator) => {
					if (
						subscriptions.subscriptions == 0 &&
						['interval', 'focus'].includes(revalidator.trigger)
					) {
						revalidator.trigger = 'query-subscribe';
					}

					const increment = {
						'query-subscribe': +1,
						'query-unsubscribe': -1,
					} as { [index: string]: number };

					subscriptions.revalidator = {
						...subscriptions.revalidator,
						...revalidator,
					};
					subscriptions.subscriptions += increment[revalidator.trigger] || 0;
					subscriptions.subscriptions = Math.max(
						subscriptions.subscriptions,
						0,
					);
					return subscriptions;
				},
				{
					subscriptions: 0,
				} as GroupSubscription,
			),
			// unsubscribe group when we lost the last subscriber
			tap((group) => {
				if (
					group.subscriptions === 0 &&
					!['group-remove', 'group-unsubscribe'].includes(
						group.revalidator.trigger,
					)
				) {
					revalidate.next({
						...group.revalidator,
						trigger: 'group-unsubscribe',
					});
				}
			}),
			mergeScan(
				({ groupState }, { revalidator, subscriptions }) => {
					// short-circuit, these triggers don't affect state
					if (
						['group-remove', 'query-unsubscribe'].includes(revalidator.trigger)
					) {
						return of({
							groupState: {
								...groupState,
								subscriptions,
							},
							trigger: revalidator.trigger,
						});
					}

					if (revalidator.trigger === 'group-unsubscribe') {
						if (
							groupState.result.state === 'loading' ||
							groupState.result.state === 'refreshing'
						) {
							return of({
								groupState: {
									...groupState,
									result: {
										...groupState.result,
										state: 'success' as QueryOutput['state'],
									},
									subscriptions,
								},
								trigger: revalidator.trigger,
							});
						} else {
							return of({
								groupState: {
									...groupState,
									subscriptions,
								},
								trigger: revalidator.trigger,
							});
						}
					}

					// we're already revalidating the cache
					// all subscribers will receive the latest value
					// when the query resolves
					if (
						groupState.result &&
						['loading', 'refreshing'].includes(groupState.result.state)
					) {
						return of({
							groupState: { ...groupState, subscriptions },
							trigger: revalidator.trigger,
						});
					}

					// return the cached data when it's still fresh
					if (
						revalidator.trigger !== 'manual' &&
						groupState.staleAt &&
						groupState.staleAt > Date.now()
					) {
						const cached: GroupState = {
							...groupState,
							subscriptions,
							result: {
								state: 'success',
								data: groupState.result?.data,
							},
						};

						return of({
							groupState: cached,
							trigger: revalidator.trigger,
						});
					}

					const hasCache = !!groupState.staleAt;
					const intialState = hasCache ? 'refreshing' : 'loading';

					// invoke the query, set the initial query state
					const invoker = revalidator
						.query(intialState, revalidator.params)
						.pipe(
							takeUntil(
								group.pipe(filter((r) => r.trigger === 'group-unsubscribe')),
							),
							map(
								(queryResult): GroupState => {
									const now = Date.now();
									return {
										key: revalidator.key,
										result: queryResult,
										staleAt:
											queryResult.state === 'success'
												? now + revalidator.config.staleTime
												: undefined,
										removeCacheAt:
											queryResult.state === 'success'
												? now + revalidator.config.cacheTime
												: undefined,
										// ignore subscriptions, query could already be unsubscribed and this will re-create a subscription because this subscription is outdate
										subscriptions: undefined,
									};
								},
							),
						);

					const initial: GroupState = {
						key: revalidator.key,
						result: {
							state: intialState,
							...(hasCache ? { data: groupState.result?.data } : {}),
						},
						staleAt: groupState.staleAt,
						subscriptions,
					};

					return scheduled([of(initial), invoker], asapScheduler).pipe(
						concatAll(),
						map((r) => {
							return {
								groupState: r,
								trigger: revalidator.trigger,
							};
						}),
					);
				},
				{
					groupState: {
						key: 'unknown',
						staleAt: undefined,
						subscriptions: 0,
						result: {
							state: 'idle',
						},
					} as GroupState,
					trigger: 'unknown' as Revalidator['trigger'],
				},
			),
		),
	),
	mergeAll(),
	// update the cache
	scan(
		(_cache, { groupState, trigger }) => {
			if (trigger === 'group-remove') {
				const { [groupState.key]: _removeGroupKey, ...remainingCache } = _cache;
				return remainingCache;
			}

			if (trigger === 'group-unsubscribe') {
				const { [groupState.key]: removeGroupKey, ...remainingCache } = _cache;
				if (removeGroupKey?.state.result.data === undefined) {
					return remainingCache;
				}
			}

			return {
				..._cache,
				[groupState.key]: {
					state: {
						...groupState,
						subscriptions:
							groupState.subscriptions === undefined
								? _cache[groupState.key]?.state.subscriptions ?? 0
								: groupState.subscriptions,
					},
					trigger: trigger,
				},
			};
		},
		{} as {
			[key: string]: {
				state: GroupState;
				trigger: Revalidator['trigger'];
			};
		},
	),
	share(),
);

type GroupSubscription = {
	subscriptions: number;
	revalidator: Revalidator;
};

type GroupState = {
	key: string;
	result: QueryOutput;
	staleAt?: number;
	removeCacheAt?: number;
	subscriptions?: number;
};

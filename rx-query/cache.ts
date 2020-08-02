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
				// cleanup the group when the whole group is unsubscribed,
				// after x milliseconds. This gives us a new cache for the group.
				takeUntil(
					group.pipe(
						filter((g) => g.trigger !== 'group-remove'),
						switchMap((g) => {
							if (g.trigger === 'group-unsubscribe') {
								return timer(g.config.cacheTime).pipe(
									tap(() => {
										revalidate.next({ ...g, trigger: 'group-remove' });
									}),
								);
							}
							return EMPTY;
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
					const count = {
						'query-subscribe': +1,
						'query-unsubscribe': -1,
					} as { [index: string]: number };

					subscriptions.revalidator = revalidator;
					subscriptions.subscriptions += count[revalidator.trigger] || 0;
					if (subscriptions.subscriptions < 0) {
						subscriptions.subscriptions = 0;
					}
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
						['group-remove', 'query-unsubscribe', 'group-unsubscribe'].includes(
							revalidator.trigger,
						)
					) {
						return of({
							groupState: {
								...groupState,
								subscriptions,
							},
							trigger: revalidator.trigger,
						});
					}

					// we're already revalidating the cache
					// all subscribers will receive the latest value
					// when the query resolves
					if (
						groupState.result &&
						['loading', 'refreshing'].includes(groupState.result.state)
					) {
						return of({ groupState, trigger: revalidator.trigger });
					}

					// return the cached data when it's still fresh
					if (groupState.staleAt && groupState.staleAt > Date.now()) {
						const cached: GroupState = {
							...groupState,
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
										// ignore subscriptions, query could already be unsubscribed to and this will re-create a subscription because this subscription is outdate
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
						mergeAll(),
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

			return {
				..._cache,
				[groupState.key]: {
					state: {
						...groupState,
						subscriptions:
							groupState.subscriptions === undefined
								? _cache[groupState.key]?.state.subscriptions
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
	result: QueryOutput<any>;
	staleAt?: number;
	removeCacheAt?: number;
	subscriptions?: number;
};

import {
	Subject,
	of,
	scheduled,
	asapScheduler,
	EMPTY,
	timer,
	Observable,
	GroupedObservable,
} from 'rxjs';
import {
	scan,
	groupBy,
	mergeAll,
	map,
	tap,
	mergeScan,
	ignoreElements,
	observeOn,
	filter,
	switchMap,
	takeUntil,
	concatAll,
	shareReplay,
} from 'rxjs/operators';
import { QueryOutput, Revalidator } from './types';

export const revalidate = new Subject<Revalidator>();

export const queryCache = revalidate.pipe(
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
			scan(
				(subscriptions, revalidator) =>
					holdSubscriptionsCount(subscriptions, revalidator),
				{
					subscriptions: 0,
				} as GroupSubscription,
			),
			unsubscribeOnNoSubscriptions(),
			mergeScan(
				({ groupState }, { revalidator, subscriptions }) => {
					const defaultHandlers = {
						'query-subscribe': () =>
							invokeQuery(groupState, revalidator, subscriptions, group),
						focus: () =>
							invokeQuery(groupState, revalidator, subscriptions, group),
						interval: () =>
							invokeQuery(groupState, revalidator, subscriptions, group),
						manual: () =>
							invokeQuery(groupState, revalidator, subscriptions, group),

						'group-unsubscribe': () => updateTrigger(groupState, revalidator),
						'query-unsubscribe': () =>
							updateSubscriptions(groupState, revalidator, subscriptions),
						'group-remove': () =>
							updateSubscriptions(groupState, revalidator, subscriptions),

						'mutate-optimistic': () => startMutation(groupState, revalidator),
						'mutate-success': () => mutationCommit(groupState, revalidator),
						'mutate-error': () => updateTrigger(groupState, revalidator),
					} as {
						[handler in Revalidator['trigger']]: () => Observable<Group>;
					};

					const handlers = {
						idle: {
							...defaultHandlers,
						},
						success: {
							...defaultHandlers,
						},
						error: {
							...defaultHandlers,
						},
						loading: {
							...defaultHandlers,

							// reset the status to allow a resubscription later
							'group-unsubscribe': () =>
								resetGroupStatus(groupState, revalidator),

							// a query is already pending, when it resolves all queries will be updated
							'query-subscribe': () =>
								updateSubscriptions(groupState, revalidator, subscriptions),
							interval: () =>
								updateSubscriptions(groupState, revalidator, subscriptions),
							focus: () =>
								updateSubscriptions(groupState, revalidator, subscriptions),
							manual: () =>
								updateSubscriptions(groupState, revalidator, subscriptions),
						},
						refreshing: {
							...defaultHandlers,

							// reset the status to allow a resubscription later
							'group-unsubscribe': () =>
								resetGroupStatus(groupState, revalidator),

							// a query is already pending, when it resolves all queries will be updated
							'query-subscribe': () =>
								updateSubscriptions(groupState, revalidator, subscriptions),
							interval: () =>
								updateSubscriptions(groupState, revalidator, subscriptions),
							focus: () =>
								updateSubscriptions(groupState, revalidator, subscriptions),
							manual: () =>
								updateSubscriptions(groupState, revalidator, subscriptions),
						},
						mutating: {
							...defaultHandlers,

							// ignore refreshes while mutating until the mutation resolves
							'query-subscribe': () =>
								updateSubscriptions(groupState, revalidator, subscriptions),
							interval: () =>
								updateSubscriptions(groupState, revalidator, subscriptions),
							focus: () =>
								updateSubscriptions(groupState, revalidator, subscriptions),
							manual: () =>
								updateSubscriptions(groupState, revalidator, subscriptions),

							// handle mutation results
							'mutate-optimistic': () => updateTrigger(groupState, revalidator),
							'mutate-error': () => mutationRollback(groupState, revalidator),
						},
						'mutate-error': {
							...defaultHandlers,
						},
					} as {
						[status in QueryOutput['status']]: {
							[handler in Revalidator['trigger']]: () => Observable<Group>;
						};
					};

					const handler =
						handlers[groupState.result.status][revalidator.trigger];

					if (!handler) {
						console.warn('[rx-query] Handler not found', {
							current: groupState.result.status,
							event: revalidator.trigger,
						});
						return updateTrigger(groupState, revalidator);
					}

					return handler();
				},
				{
					groupState: {
						key: '__rx-query-unknown',
						staleAt: undefined,
						subscriptions: 0,
						result: {
							status: 'idle',
						},
					},
					trigger: 'initial' as Revalidator['trigger'],
				} as Group,
			),
		),
	),
	mergeAll(),
	// update the cache
	scan((_cache, { groupState, trigger }) => {
		return updateCache(trigger, groupState, _cache);
	}, {} as Cache),
	shareReplay(1),
);

/**
 * Updates cache for the current key
 */
function updateCache(
	trigger: Revalidator['trigger'],
	groupState: GroupState,
	_cache: Cache,
): Cache {
	switch (trigger) {
		case 'group-remove':
			const {
				[groupState.key]: _removeGroupKey,
				...remainingCacheRemove
			} = _cache;
			return remainingCacheRemove;
		case 'group-unsubscribe':
			const {
				[groupState.key]: removeGroupKey,
				...remainingCacheUnsubscribe
			} = _cache;
			if (removeGroupKey?.groupState.result.data === undefined) {
				return remainingCacheUnsubscribe;
			}
			return {
				..._cache,
				[groupState.key]: {
					groupState: {
						...groupState,
						subscriptions: 0,
					},
					trigger: trigger,
				},
			};
		default:
			return {
				..._cache,
				[groupState.key]: {
					groupState: {
						...groupState,
						subscriptions:
							groupState.subscriptions === undefined
								? _cache[groupState.key]?.groupState.subscriptions ?? 0
								: groupState.subscriptions,
					},
					trigger: trigger,
				},
			};
	}
}

/**
 * Invokes the query and updates the state by the response
 * Starts with an initial state
 */
function invokeQuery(
	groupState: GroupState,
	revalidator: Revalidator<unknown, unknown>,
	subscriptions: number,
	group: GroupedObservable<string, Revalidator<unknown, unknown>>,
): Observable<Group> {
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
				...groupState.result,
				status: 'success',
			},
		};

		return of({
			groupState: cached,
			trigger: revalidator.trigger,
		});
	}

	if (!revalidator.query) {
		console.warn(`[rx-query] Revalidator should have a query`, {
			key: revalidator.key,
			trigger: revalidator.trigger,
		});
		return of({ groupState, trigger: revalidator.trigger });
	}

	const hasCache = !!groupState.staleAt;
	const intialState = hasCache ? 'refreshing' : 'loading';

	const invoker = revalidator.query(intialState, revalidator.params).pipe(
		takeUntil(
			group.pipe(
				filter(
					(r) =>
						r.trigger === 'group-unsubscribe' || r.trigger === 'group-remove',
				),
			),
		),
		map(
			(queryResult): GroupState => {
				const now = Date.now();
				return {
					key: revalidator.key,
					result: queryResult,
					staleAt:
						queryResult.status === 'success'
							? now + revalidator.config.staleTime
							: undefined,
					removeCacheAt:
						queryResult.status === 'success'
							? now + revalidator.config.cacheTime
							: undefined,
					originalResultData: undefined,
					// ignore subscriptions, query could already be unsubscribed and this will re-create a subscription because this subscription is outdate
					subscriptions: undefined,
				};
			},
		),
	);

	const initial: GroupState = {
		key: revalidator.key,
		result: {
			status: intialState,
			...(hasCache ? { data: groupState.result.data } : {}),
			mutate: groupState.result.mutate,
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
}

/**
 * Starts the mutation and adds the old state to the group state
 */
function startMutation(
	groupState: GroupState,
	revalidator: Revalidator<unknown, unknown>,
): Observable<Group> {
	return guardAgainstUnknownState(groupState, () => {
		if (!revalidator.data) {
			console.warn(`[rx-query] Revalidator should have data`, {
				key: revalidator.key,
				trigger: revalidator.trigger,
			});
		}

		const newResult: QueryOutput = {
			...groupState.result,
			data: (typeof revalidator.data === 'object'
				? {
						...groupState.result.data,
						...revalidator.data,
				  }
				: revalidator.data) as Readonly<unknown>,
			status: 'mutating',
		};
		return of({
			groupState: {
				...groupState,
				result: newResult,
				originalResultData: groupState.result.data,
			},
			trigger: revalidator.trigger,
		});
	});
}

function mutationCommit(
	groupState: GroupState,
	revalidator: Revalidator<unknown, unknown>,
): Observable<Group> {
	return guardAgainstUnknownState(groupState, () => {
		if (!revalidator.data) {
			console.warn(`[rx-query] Revalidator should have data`, {
				key: revalidator.key,
				trigger: revalidator.trigger,
			});
		}

		const newResult: QueryOutput = {
			...groupState.result,
			data: (typeof revalidator.data === 'object'
				? {
						...groupState.result.data,
						...revalidator.data,
				  }
				: revalidator.data) as Readonly<unknown>,
			status: 'success',
		};

		return of({
			groupState: {
				...groupState,
				result: newResult,
				originalResultData: undefined,
			},
			trigger: revalidator.trigger,
		});
	});
}

/**
 *  Rollbacks the mutation and clears the previous data
 */
function mutationRollback(
	groupState: GroupState,
	revalidator: Revalidator<unknown, unknown>,
): Observable<Group> {
	return guardAgainstUnknownState(groupState, () => {
		if (!revalidator.data) {
			console.warn(`[rx-query] Revalidator should have data`, {
				key: revalidator.key,
				trigger: revalidator.trigger,
			});
		}

		const newResult: QueryOutput = {
			...groupState.result,
			data: groupState.originalResultData as Readonly<unknown>,
			error: revalidator.data as Readonly<unknown>,
			status: 'mutate-error',
		};

		return of({
			groupState: {
				...groupState,
				result: newResult,
			},
			trigger: revalidator.trigger,
		});
	});
}

/**
 * Holds the number of subscribers
 * Increments when there's a new consumer (query-subscribe)
 * Decrements when the consumer unsubscribes (query-unsubscribe)
 */
function holdSubscriptionsCount(
	subscriptions: GroupSubscription,
	revalidator: Revalidator<unknown, unknown>,
) {
	let { trigger } = revalidator;

	// reset trigger to `query-subscribe` when all subscriptions are lost
	if (
		subscriptions.subscriptions == 0 &&
		['interval', 'focus'].includes(trigger)
	) {
		trigger = 'query-subscribe';
	}

	const increment = {
		'query-subscribe': +1,
		'query-unsubscribe': -1,
	} as { [index: string]: number };

	subscriptions.revalidator = {
		...subscriptions.revalidator,
		...revalidator,
	};
	subscriptions.subscriptions += increment[trigger] || 0;
	subscriptions.subscriptions = Math.max(subscriptions.subscriptions, 0);
	return subscriptions;
}

/**
 * Sends a `group-unsubscribe` event when all subscribers have unsubscribed
 */
function unsubscribeOnNoSubscriptions() {
	return (source: Observable<GroupSubscription>) => {
		return source.pipe(
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
		);
	};
}

/**
 * Update the state with the new subscription count
 */
function updateSubscriptions(
	groupState: GroupState,
	revalidator: Revalidator,
	subscriptions: number,
): Observable<Group> {
	return guardAgainstUnknownState(groupState, () => {
		if (groupState.subscriptions === subscriptions) {
			return updateTrigger(groupState, revalidator);
		}

		return of({
			groupState: {
				...groupState,
				subscriptions,
			},
			trigger: revalidator.trigger,
		});
	});
}

/**
 * Reset status to idle to allow a resubscribe
 */
function resetGroupStatus(
	groupState: GroupState,
	revalidator: Revalidator,
): Observable<Group> {
	return guardAgainstUnknownState(groupState, () => {
		return of({
			groupState: {
				...groupState,
				result: {
					...groupState.result,
					status: 'idle',
				},
			},
			trigger: revalidator.trigger,
		});
	});
}

/**
 * Update the state with the new trigger
 */
function updateTrigger(
	groupState: GroupState,
	revalidator: Revalidator,
): Observable<Group> {
	return guardAgainstUnknownState(groupState, () => {
		return of({
			groupState,
			trigger: revalidator.trigger,
		});
	});
}

/**
 * When this happens it means that the cache is already cleared
 * We can ignore this event
 */
function guardAgainstUnknownState(
	groupState: GroupState,
	fn: () => Observable<Group>,
): Observable<Group> {
	if (groupState.key === '__rx-query-unknown') {
		return EMPTY;
	}

	return fn();
}

type GroupSubscription = {
	subscriptions: number;
	revalidator: Revalidator;
};

type GroupState = {
	key: string;
	originalResultData?: unknown;
	result: QueryOutput;
	staleAt?: number;
	removeCacheAt?: number;
	subscriptions?: number;
};

type Group = {
	groupState: GroupState;
	trigger: Revalidator['trigger'];
};

type Cache = {
	[key: string]: Group;
};

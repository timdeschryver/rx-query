import {
	Observable,
	of,
	isObservable,
	defer,
	timer,
	fromEvent,
	EMPTY,
	interval,
	NEVER,
	asyncScheduler,
	merge,
} from 'rxjs';
import {
	map,
	startWith,
	catchError,
	expand,
	withLatestFrom,
	distinctUntilChanged,
	finalize,
	filter,
	take,
	pairwise,
	concatMap,
	shareReplay,
	observeOn,
	debounceTime,
} from 'rxjs/operators';
import { revalidate, queryCache } from './cache';
import { getQueryConfig } from './config';
import { createQueryKey } from './key';
import { mutateSuccess, mutateError, mutateOptimistic } from './mutate';
import { QueryOutput, QueryConfig, Revalidator, Mutator } from './types';
export function query<QueryResult, QueryParam>(
	key: string,
	query: (params: QueryParam) => Observable<QueryResult>,
	config?: QueryConfig<QueryResult, QueryParam>,
): Observable<QueryOutput<QueryResult>>;
export function query<QueryResult, QueryParam>(
	key: string,
	observableOrStaticParam: QueryParam | Observable<QueryParam>,
	query: (params: QueryParam) => Observable<QueryResult>,
	config?: QueryConfig<QueryResult, QueryParam>,
): Observable<QueryOutput<QueryResult>>;

export function query(
	key: string,
	...inputs: unknown[]
): Observable<QueryOutput> {
	const { query, queryParam, queryConfig } = parseInput(inputs);
	const retryCondition = createRetryCondition(queryConfig);
	const retryDelay = createRetryDelay(queryConfig);

	const invokeQuery: QueryInvoker = (
		loadingStatus: string,
		queryParameters?: unknown,
	): Observable<QueryOutput> => {
		const invoke = (retries: number) => {
			return query(queryParameters).pipe(
				map(
					(data): Omit<QueryOutput, 'mutate'> => {
						return {
							status: 'success',
							data: data as Readonly<unknown>,
						};
					},
				),
				catchError(
					(error): Observable<Omit<QueryOutput, 'mutate'>> => {
						return of({
							status: 'error',
							error,
							retries,
						});
					},
				),
			);
		};

		const mutateQuery: Mutator = (
			data: unknown,
			updater?: (current: unknown) => unknown,
		) => {
			const cacheKey = createQueryKey(key, queryParameters);
			const mutate$ = queryConfig.mutator(data, { queryParameters, cacheKey });
			if (isObservable(mutate$)) {
				mutate$
					.pipe(
						map((newData) => () => mutateSuccess(cacheKey, newData)),
						take(1),
						startWith(() => mutateOptimistic(cacheKey, updater || data)),
					)
					.subscribe({
						next: (evt) => evt(),
						error: (errorData) => mutateError(cacheKey, errorData),
					});
				return;
			}

			mutateSuccess(cacheKey, mutate$);
		};

		const callResult$: Observable<QueryOutput> = defer(() =>
			invoke(0).pipe(
				expand((result) => {
					if (
						result.status === 'error' &&
						retryCondition(result.retries || 0, result.error)
					) {
						return timer(retryDelay(result.retries || 0)).pipe(
							concatMap(() => invoke((result.retries || 0) + 1)),

							// retry internally
							// for consumers we're still loading
							startWith({
								...result,
								status: loadingStatus,
							} as QueryOutput),
						);
					}

					return EMPTY;
				}),
				// prevents that there's multiple emits in the same tick
				// for when the status is swapped from error to loading (to retry)
				debounceTime(0),
				map((r) => {
					return {
						...r,
						mutate: mutateQuery,
					};
				}),
			),
		);

		return callResult$;
	};

	return defer(() => {
		const params$ = paramsTrigger(queryConfig, queryParam, key, invokeQuery);
		const focus$ = focusTrigger(queryConfig, queryParam, key, invokeQuery);
		const reconnect$ = reconnectTrigger(
			queryConfig,
			queryParam,
			key,
			invokeQuery,
		);
		const interval$ = intervalTrigger(
			queryConfig,
			queryParam,
			key,
			invokeQuery,
		);

		const triggersSubscription = merge(
			params$, focus$, reconnect$, interval$,
		)
			.pipe(
				observeOn(asyncScheduler),
			)
			.subscribe({
				next: (c) => revalidate.next(c),
			});

		return queryCache.pipe(
			withLatestFrom(params$),
			map(([c, k]) => c[k.key]),
			filter(
				(v) =>
					!!v &&
					// exclude state changes that are unimportant to the consumer
					!['query-unsubscribe', 'group-unsubscribe'].includes(v.trigger),
			),
			map((v) => v.groupState.result as QueryOutput),
			distinctUntilChanged(),
			patchDataWithPreviousData(queryConfig.keepPreviousData),
			finalize(() => {
				params$.pipe(take(1)).subscribe({
					next: (params) => {
						revalidate.next({
							...params,
							trigger: 'query-unsubscribe',
						});
					},
				});

				triggersSubscription.unsubscribe();
			}),
		);
	});
}

function createRetryDelay(queryConfig: Required<QueryConfig>) {
	return typeof queryConfig.retryDelay === 'number'
		? () => queryConfig.retryDelay as number
		: queryConfig.retryDelay || (() => 0);
}

function createRetryCondition(queryConfig: Required<QueryConfig>) {
	return typeof queryConfig.retries === 'number'
		? (n: number) => n < (queryConfig.retries || 0)
		: queryConfig.retries || (() => false);
}

function paramsTrigger(
	queryConfig: Required<QueryConfig>,
	queryParam: Observable<unknown>,
	key: string,
	invokeQuery: QueryInvoker,
): Observable<Revalidator> {
	return queryParam.pipe(
		startWith(undefined),
		distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
		pairwise(),
		concatMap(([previous, params]) => {
			const revalidates = [];
			if (previous !== undefined) {
				const unsubscribe: Revalidator = {
					key: createQueryKey(key, previous),
					query: invokeQuery,
					trigger: 'query-unsubscribe',
					params: previous,
					config: queryConfig,
				};
				revalidates.push(unsubscribe);
			}

			const init: Revalidator = {
				key: createQueryKey(key, params),
				query: invokeQuery,
				trigger: 'query-subscribe',
				params,
				config: queryConfig,
			};
			revalidates.push(init);
			return revalidates;
		}),
	);
}

function intervalTrigger(
	queryConfig: Required<QueryConfig>,
	queryParam: Observable<unknown>,
	key: string,
	invokeQuery: QueryInvoker,
): Observable<Revalidator> {
	return queryConfig.refetchInterval !== Infinity
		? (isObservable(queryConfig.refetchInterval)
			? queryConfig.refetchInterval
			: interval(queryConfig.refetchInterval)
		).pipe(
			withLatestFrom(queryParam),
			map(([_, params]) => {
				const interval: Revalidator = {
					key: createQueryKey(key, params),
					query: invokeQuery,
					trigger: 'interval',
					params,
					config: queryConfig,
				};
				return interval;
			}),
		)
		: NEVER;
}

function focusTrigger(
	queryConfig: Required<QueryConfig>,
	queryParam: Observable<unknown>,
	key: string,
	invokeQuery: QueryInvoker,
): Observable<Revalidator> {
	return queryConfig.refetchOnWindowFocus
		? fromEvent(window, 'focus').pipe(
			withLatestFrom(queryParam),
			map(([_, params]) => {
				const focused: Revalidator = {
					key: createQueryKey(key, params),
					query: invokeQuery,
					trigger: 'focus',
					params,
					config: queryConfig,
				};
				return focused;
			}),
		)
		: NEVER;
}

function reconnectTrigger(
	queryConfig: Required<QueryConfig>,
	queryParam: Observable<unknown>,
	key: string,
	invokeQuery: QueryInvoker,
): Observable<Revalidator> {
	return queryConfig.refetchOnReconnect
		? fromEvent(window, 'online').pipe(
			withLatestFrom(queryParam),
			map(([_, params]) => {
				const reconnected: Revalidator = {
					key: createQueryKey(key, params),
					query: invokeQuery,
					trigger: 'reconnect',
					params,
					config: queryConfig,
				};
				return reconnected;
			}),
		)
		: NEVER;
}

function parseInput(inputs: unknown[]) {
	const [firstInput, secondInput, thirdInput] = inputs;

	const hasParamInput = typeof firstInput !== 'function';

	const queryParam = hasParamInput
		? isObservable(firstInput)
			? firstInput
			: of(firstInput)
		: of(null);

	const query = (typeof firstInput === 'function'
		? firstInput
		: secondInput) as (params?: unknown) => Observable<unknown>;

	const inputConfig = (hasParamInput ? thirdInput : secondInput) as
		| QueryConfig
		| undefined;

	const queryConfig = {
		...getQueryConfig(),
		...inputConfig,
	};

	return {
		query,
		queryParam: queryParam.pipe(
			shareReplay({
				refCount: true,
				bufferSize: 1,
			}),
		),
		queryConfig,
	};
}

function patchDataWithPreviousData(keepPreviousData: boolean) {
	let data: any;
	return (
		source: Observable<QueryOutput<unknown>>,
	): Observable<QueryOutput<unknown>> => {
		if (!keepPreviousData) return source;
		return source.pipe(
			map((value) => {
				if (
					data !== undefined &&
					value.data === undefined &&
					value.status === 'loading'
				) {
					return {
						...value,
						data,
						status: 'refreshing',
					};
				}

				data = value.data;
				return value;
			}),
		);
	};
}

type QueryInvoker = (
	status: string,
	params?: unknown,
) => Observable<QueryOutput>;

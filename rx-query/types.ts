import { Observable } from 'rxjs';

export type QueryOutput<QueryResult = unknown> = {
	status: Readonly<
		| 'idle'
		| 'success'
		| 'error'
		| 'loading'
		| 'refreshing'
		| 'mutating'
		| 'mutate-error'
	>;
	data?: Readonly<QueryResult>;
	error?: Readonly<unknown>;
	retries?: Readonly<number>;
	mutate: Mutator<QueryResult>;
};

export type Mutator<QueryResult = unknown> = (
	data: QueryResult,
	updater?: (current: QueryResult) => QueryResult,
) => void;

export type QueryConfig<QueryResult = unknown, QueryParam = unknown> = {
	/**
	 * How many times a query should be retried before ending up in the `error` state
	 *
	 * @default 3
	 */
	retries?: number | ((retryAttempt: number, error: unknown) => boolean);
	/**
	 * The delay between consecutive retries
	 *
	 * @default (n) => (n + 1) * 1000
	 */
	retryDelay?: number | ((retryAttempt: number) => number);
	/**
	 * The interval in milliseconds to fetch the query
	 *
	 * @default Number.MAX_VALUE
	 */
	refetchInterval?: number | Observable<unknown>;
	/**
	 * When `true` a fetch will be invoken when the window is refocused
	 *
	 * @default false
	 */
	refetchOnWindowFocus?: boolean;
	/**
	 * How long an item is "fresh" in milliseconds
	 * When an item is fresh, it won't get refetched
	 *
	 * @default 0
	 */
	staleTime?: number;
	/**
	 * How long an item remains in the cache (in milliseconds) when there are no subscribers
	 *
	 * @default 30_0000 (5 minutes)
	 */
	cacheTime?: number;
	/**
	 * Return the latest result
	 *
	 * @default false
	 */
	keepPreviousData?: boolean;
	/**
	 * A mutate function to update the cache
	 *
	 * @default  (data) => data
	 */
	mutator?: (
		data: QueryResult,
		options: {
			params: QueryParam;
			cacheKey: string;
		},
	) => QueryResult | Observable<QueryResult>;
};

export type Revalidator<QueryResult = unknown, QueryParam = unknown> = {
	key: string;
	trigger:
		| 'query-subscribe' // params change, subscribe to new group (key + params)
		| 'query-unsubscribe' // remove previous group
		| 'interval' // refresh after x ms
		| 'focus' // refresh after re-focus
		| 'manual' // manual refresh
		| 'group-unsubscribe' // all subscribers are unsubscribed for a group
		| 'group-remove' // remove the group after x ms after unsubscribe
		| 'mutate-optimistic' // mutate the data
		| 'mutate-error' // mutate the data
		| 'mutate-success' // mutate the data
		| 'reset-cache'; // reset the cache
	config: Required<QueryConfig>;
	params?: QueryParam;
	query?: (
		status: string,
		params?: QueryParam,
	) => Observable<QueryOutput<QueryResult>>;
	data?: QueryResult;
};

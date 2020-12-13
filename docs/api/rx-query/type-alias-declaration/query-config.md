---
kind: TypeAliasDeclaration
name: QueryConfig
module: rx-query
---

# QueryConfig

```ts
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
	 * When `true` a fetch will be invoken when the window is refocused
	 *
	 * @default true
	 */
	refetchOnWindowFocus?: boolean;
	/**
	 * When `true` a fetch will be invoken when the client is online
	 *
	 * @default true
	 */
	refetchOnReconnect?: boolean;
	/**
	 * The interval in milliseconds to fetch the query
	 *
	 * @default Infinity
	 */
	refetchInterval?: number | Observable<unknown>;
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
	 * @default (data) => data
	 */
	mutator?: (
		data: any,
		options: {
			queryParameters: QueryParam;
			cacheKey: string;
		},
	) =>
		| QueryResult
		| Observable<QueryResult>
		| NOOP_MUTATE_TYPE
		| Observable<NOOP_MUTATE_TYPE>;
};
```

[Link to repo](https://github.com/timdeschryver/rx-query/blob/master/rx-query/types.ts#L27-L93)

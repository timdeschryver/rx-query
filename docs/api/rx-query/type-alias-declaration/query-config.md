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
   * A mutate function to update the cache
   *
   * @default  (data) => data
   */
  mutator?: (
    data: QueryResult,
    options: {
      params: QueryParam;
      cacheKey: string;
    }
  ) => QueryResult | Observable<QueryResult>;
};
```

[Link to repo](https://github.com/timdeschryver/rx-query/blob/master/rx-query/types.ts#L24-L74)

---
kind: TypeAliasDeclaration
name: Revalidator
module: rx-query
---

# Revalidator

```ts
export type Revalidator<QueryResult = unknown, QueryParam = unknown> = {
  key: string;
  trigger:
    | "query-subscribe" // params change, subscribe to new group (key + params)
    | "query-unsubscribe" // remove previous group
    | "interval" // refresh after x ms
    | "focus" // refresh after re-focus
    | "reconnect" // refresh after online
    | "manual" // manual refresh
    | "group-unsubscribe" // all subscribers are unsubscribed for a group
    | "group-remove" // remove the group after x ms after unsubscribe
    | "mutate-optimistic" // mutate the data
    | "mutate-error" // mutate the data
    | "mutate-success" // mutate the data
    | "reset-cache"; // reset the cache
  config: Required<QueryConfig>;
  params?: QueryParam;
  query?: (
    status: string,
    params?: QueryParam
  ) => Observable<QueryOutput<QueryResult>>;
  data?: QueryResult;
};
```

[Link to repo](https://github.com/timdeschryver/rx-query/blob/master/rx-query/types.ts#L95-L117)

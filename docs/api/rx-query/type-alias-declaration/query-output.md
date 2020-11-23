---
kind: TypeAliasDeclaration
name: QueryOutput
module: rx-query
---

# QueryOutput

```ts
export type QueryOutput<QueryResult = unknown> = {
  status: Readonly<
    | "idle"
    | "success"
    | "error"
    | "loading"
    | "refreshing"
    | "mutating"
    | "mutate-error"
  >;
  data?: Readonly<QueryResult>;
  error?: Readonly<unknown>;
  retries?: Readonly<number>;
  mutate: Mutator<QueryResult>;
};
```

[Link to repo](https://github.com/timdeschryver/rx-query/blob/master/rx-query/types.ts#L6-L20)

---
kind: TypeAliasDeclaration
name: Mutator
module: rx-query
---

# Mutator

```ts
export type Mutator<QueryResult = unknown> = (
  data: QueryResult,
  updater?: (current: QueryResult) => QueryResult
) => void;
```

[Link to repo](https://github.com/timdeschryver/rx-query/blob/master/rx-query/types.ts#L19-L22)

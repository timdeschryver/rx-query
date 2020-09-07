---
kind: FunctionDeclaration
name: mutateOptimistic
module: rx-query
---

# mutateOptimistic

```ts
function mutateOptimistic<Result = unknown>(
  key: string,
  data: Result | ((current: Result) => Result)
): void;
```

[Link to repo](https://github.com/timdeschryver/rx-query/blob/master/rx-query/mutate.ts#L4-L14)

## Parameters

| Name | Type     | Description                    |
| ---- | -------- | ------------------------------ |
| key  | `string` |                                |
| data | `Result  | ((current: Result) => Result)` |  |

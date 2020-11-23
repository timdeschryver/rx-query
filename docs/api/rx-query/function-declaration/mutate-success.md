---
kind: FunctionDeclaration
name: mutateSuccess
module: rx-query
---

# mutateSuccess

```ts
function mutateSuccess<Result = unknown>(
  key: string,
  data?: Result | ((current: Result) => Result)
): void;
```

[Link to repo](https://github.com/timdeschryver/rx-query/blob/master/rx-query/mutate.ts#L16-L26)

## Parameters

| Name | Type     | Description                    |
| ---- | -------- | ------------------------------ | --- |
| key  | `string` |                                |
| data | `Result  | ((current: Result) => Result)` |     |

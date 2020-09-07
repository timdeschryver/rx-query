---
kind: FunctionDeclaration
name: prefetch
module: rx-query
---

# prefetch

```ts
function prefetch(key: string, ...inputs: unknown[]): void;
```

[Link to repo](https://github.com/timdeschryver/rx-query/blob/master/rx-query/prefetch.ts#L17-L27)

## Parameters

| Name   | Type        | Description |
| ------ | ----------- | ----------- |
| key    | `string`    |             |
| inputs | `unknown[]` |             |

## Overloads

```ts
function prefetch<QueryParam, QueryResult>(
	key: string,
	query: (params: QueryParam) => Observable<QueryResult>,
	config?: QueryConfig,
): void;
```

[Link to repo](https://github.com/timdeschryver/rx-query/blob/master/rx-query/prefetch.ts#L6-L10)

### Parameters

| Name   | Type                                              | Description |
| ------ | ------------------------------------------------- | ----------- |
| key    | `string`                                          |             |
| query  | `(params: QueryParam) => Observable<QueryResult>` |             |
| config | `QueryConfig<unknown, unknown>`                   |             |

```ts
function prefetch<QueryParam, QueryResult>(
	key: string,
	observableOrStaticParam: QueryParam | Observable<QueryParam>,
	query: (params: QueryParam) => Observable<QueryResult>,
	config?: QueryConfig,
): void;
```

[Link to repo](https://github.com/timdeschryver/rx-query/blob/master/rx-query/prefetch.ts#L11-L16)

### Parameters

| Name                    | Type                                              | Description |
| ----------------------- | ------------------------------------------------- | ----------- |
| key                     | `string`                                          |             |
| observableOrStaticParam | `QueryParam | Observable<QueryParam>`             |             |
| query                   | `(params: QueryParam) => Observable<QueryResult>` |             |
| config                  | `QueryConfig<unknown, unknown>`                   |             |

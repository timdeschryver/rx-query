---
kind: FunctionDeclaration
name: query
module: rx-query
---

# query

```ts
function query(key: string, ...inputs: unknown[]): Observable<QueryOutput>;
```

[Link to repo](https://github.com/timdeschryver/rx-query/blob/master/rx-query/query.ts#L48-L184)

## Parameters

| Name   | Type        | Description |
| ------ | ----------- | ----------- |
| key    | `string`    |             |
| inputs | `unknown[]` |             |

## Overloads

```ts
function query<QueryResult, QueryParam>(
  key: string,
  query: (params: QueryParam) => Observable<QueryResult>,
  config?: QueryConfig<QueryResult, QueryParam>
): Observable<QueryOutput<QueryResult>>;
```

[Link to repo](https://github.com/timdeschryver/rx-query/blob/master/rx-query/query.ts#L36-L40)

### Parameters

| Name   | Type                                              | Description |
| ------ | ------------------------------------------------- | ----------- |
| key    | `string`                                          |             |
| query  | `(params: QueryParam) => Observable<QueryResult>` |             |
| config | `QueryConfig<QueryResult, QueryParam>`            |             |

```ts
function query<QueryResult, QueryParam>(
  key: string,
  observableOrStaticParam: QueryParam | Observable<QueryParam>,
  query: (params: QueryParam) => Observable<QueryResult>,
  config?: QueryConfig<QueryResult, QueryParam>
): Observable<QueryOutput<QueryResult>>;
```

[Link to repo](https://github.com/timdeschryver/rx-query/blob/master/rx-query/query.ts#L41-L46)

### Parameters

| Name                    | Type                                              | Description             |
| ----------------------- | ------------------------------------------------- | ----------------------- |
| key                     | `string`                                          |                         |
| observableOrStaticParam | `QueryParam                                       | Observable<QueryParam>` |  |
| query                   | `(params: QueryParam) => Observable<QueryResult>` |                         |
| config                  | `QueryConfig<QueryResult, QueryParam>`            |                         |

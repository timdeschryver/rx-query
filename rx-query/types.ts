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

export type Mutator<QueryResult = unknown> = (data: QueryResult) => void;

export type QueryConfig<QueryResult = unknown, QueryParam = unknown> = {
	retries?: number | ((retryAttempt: number, error: unknown) => boolean);
	retryDelay?: number | ((retryAttempt: number) => number);
	refetchInterval?: number | Observable<unknown>;
	refetchOnWindowFocus?: boolean;
	staleTime?: number;
	cacheTime?: number;
	mutator?: (data: QueryResult, params: QueryParam) => QueryResult;
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
		| 'mutate-success'; // mutate the data
	config: Required<QueryConfig>;
	params?: QueryParam;
	query?: (
		status: string,
		params?: QueryParam,
	) => Observable<QueryOutput<QueryResult>>;
	data?: QueryResult;
};

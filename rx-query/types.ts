import { Observable } from 'rxjs';

export type QueryOutput<QueryResult = unknown> = {
	state: 'idle' | 'success' | 'error' | 'loading' | 'refreshing';
	data?: QueryResult;
	error?: unknown;
	retries?: number;
};

export type QueryConfig = {
	retries?: number | ((retryAttempt: number, error: unknown) => boolean);
	retryDelay?: number | ((retryAttempt: number) => number);
	refetchInterval?: number | Observable<unknown>;
	refetchOnWindowFocus?: boolean;
	staleTime?: number;
	cacheTime?: number;
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
		| 'group-remove'; // remove the group after x ms after unsubscribe
	params: QueryParam;
	query: (
		state: string,
		params?: QueryParam,
	) => Observable<QueryOutput<QueryResult>>;
	config: Required<QueryConfig>;
};

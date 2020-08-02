import { Observable } from 'rxjs';

export interface Trigger<T> {
	params: T;
	trigger: 'params' | 'focus' | 'interval';
	paramsKey: string;
}

export type QueryOutput<QueryResult = any> = {
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

export type Revalidator<P = any, R = any> = {
	key: string;
	trigger:
		| 'query-subscribe' // params change, subscribe to new group (key + params)
		| 'query-unsubscribe' // remove previous group
		| 'interval' // refresh after x ms
		| 'focus' // refresh after re-focus
		| 'group-unsubscribe' // all subscribers are unsubscribed for a group
		| 'group-remove'; // remove the group after x ms after unsubscribe
	params: P;
	query: (state: string, params?: P) => Observable<QueryOutput<R>>;
	config: Required<QueryConfig>;
};

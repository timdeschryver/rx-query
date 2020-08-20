import { Observable, of, isObservable } from 'rxjs';
import { take, mergeMap } from 'rxjs/operators';
import { query } from './query';
import { QueryConfig } from './types';

export function prefetch<
	QueryParam,
	QueryResult,
	Query extends (params: QueryParam) => Observable<QueryResult>
>(key: string, query: Query, config?: QueryConfig): void;
export function prefetch<
	QueryParam,
	QueryResult,
	Query extends (params: QueryParam) => Observable<QueryResult>
>(
	key: string,
	observableOrStaticParam: QueryParam | Observable<QueryParam>,
	query: Query,
	config?: QueryConfig,
): void;
export function prefetch<
	QueryParam,
	QueryResult,
	Query extends (params?: QueryParam) => Observable<QueryResult>
>(key: string, ...inputs: unknown[]): void {
	const { query: inputQuery, queryParam, queryConfig } = parseInput<
		QueryParam,
		Query
	>(inputs);

	queryParam
		.pipe(
			mergeMap((parameter) =>
				query(key, parameter, inputQuery, queryConfig).pipe(take(1)),
			),
		)
		.subscribe();
}

function parseInput<QueryParam, Query>(inputs: unknown[]) {
	const [firstInput, secondInput, thirdInput] = inputs;

	const hasParamInput = typeof firstInput !== 'function';

	const queryParam = (hasParamInput
		? isObservable(firstInput)
			? firstInput
			: of(firstInput)
		: of(null)) as Observable<QueryParam>;

	const query = (typeof firstInput === 'function'
		? firstInput
		: secondInput) as Query;

	const inputConfig = (hasParamInput ? thirdInput : secondInput) as
		| QueryConfig
		| undefined;

	return {
		query,
		queryParam,
		queryConfig: inputConfig,
	};
}

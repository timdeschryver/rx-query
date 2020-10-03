import { Observable, of, isObservable } from 'rxjs';
import { take, mergeMap, shareReplay } from 'rxjs/operators';
import { query } from './query';
import { QueryConfig } from './types';

export function prefetch<QueryParam, QueryResult>(
	key: string,
	query: (params: QueryParam) => Observable<QueryResult>,
	config?: QueryConfig,
): void;
export function prefetch<QueryParam, QueryResult>(
	key: string,
	observableOrStaticParam: QueryParam | Observable<QueryParam>,
	query: (params: QueryParam) => Observable<QueryResult>,
	config?: QueryConfig,
): void;
export function prefetch(key: string, ...inputs: unknown[]): void {
	const { query: inputQuery, queryParam, queryConfig } = parseInput(inputs);

	queryParam
		.pipe(
			mergeMap((parameter) =>
				query(key, parameter, inputQuery, queryConfig).pipe(take(1)),
			),
		)
		.subscribe();
}

function parseInput(inputs: unknown[]) {
	const [firstInput, secondInput, thirdInput] = inputs;

	const hasParamInput = typeof firstInput !== 'function';

	const queryParam = hasParamInput
		? isObservable(firstInput)
			? firstInput
			: of(firstInput)
		: of(null);

	const query = (typeof firstInput === 'function'
		? firstInput
		: secondInput) as (params?: unknown) => Observable<unknown>;

	const inputConfig = (hasParamInput ? thirdInput : secondInput) as
		| QueryConfig
		| undefined;

	return {
		query,
		queryParam: queryParam.pipe(
			shareReplay({
				refCount: true,
				bufferSize: 1,
			}),
		),
		queryConfig: inputConfig,
	};
}

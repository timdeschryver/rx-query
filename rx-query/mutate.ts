import { revalidate } from './cache';
import { DEFAULT_QUERY_CONFIG } from './config';

export function mutateOptimistic<Result = unknown>(
	key: string,
	data: Result | ((current: Result) => Result),
): void {
	revalidate.next({
		key,
		data,
		trigger: 'mutate-optimistic',
		config: DEFAULT_QUERY_CONFIG,
	});
}

export function mutateSuccess<Result = unknown>(
	key: string,
	data?: Result | ((current: Result) => Result),
): void {
	revalidate.next({
		key,
		data,
		trigger: 'mutate-success',
		config: DEFAULT_QUERY_CONFIG,
	});
}

export function mutateError(key: string, error: unknown): void {
	revalidate.next({
		key,
		data: error,
		trigger: 'mutate-error',
		config: DEFAULT_QUERY_CONFIG,
	});
}

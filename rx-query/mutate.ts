import { revalidate } from './cache';
import { getQueryConfig } from './config';

export function mutateOptimistic<Result = unknown>(
	key: string,
	data: Result | ((current: Result) => Result),
): void {
	revalidate.next({
		key,
		data,
		trigger: 'mutate-optimistic',
		config: getQueryConfig(),
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
		config: getQueryConfig(),
	});
}

export function mutateError(key: string, error: unknown): void {
	revalidate.next({
		key,
		data: error,
		trigger: 'mutate-error',
		config: getQueryConfig(),
	});
}

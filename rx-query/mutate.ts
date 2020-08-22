import { DEFAULT_QUERY_CONFIG } from '.';
import { revalidate } from './cache';

export function mutateOptimistic(key: string, data: unknown): void {
	revalidate.next({
		key,
		data,
		trigger: 'mutate-optimistic',
		config: DEFAULT_QUERY_CONFIG,
	});
}

export function mutate(key: string, data: unknown): void {
	revalidate.next({
		key,
		data,
		trigger: 'mutate-success',
		config: DEFAULT_QUERY_CONFIG,
	});
}

export function mutateError(key: string, data: unknown): void {
	revalidate.next({
		key,
		data,
		trigger: 'mutate-error',
		config: DEFAULT_QUERY_CONFIG,
	});
}

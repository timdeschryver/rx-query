import { revalidate } from './cache';
import { QueryConfig } from './types';
import { createQueryKey } from './key';

/**
 *  Trigger a refresh of the query
 */
export function refreshQuery(key: string, paramInput?: unknown): void {
	revalidate.next({
		key: createQueryKey(key, paramInput),
		trigger: 'manual',
		config: (undefined as unknown) as Required<QueryConfig>,
	});
}

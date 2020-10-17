import { QueryConfig } from './types';

export const DEFAULT_QUERY_CONFIG: Required<QueryConfig> = {
	retries: 3,
	retryDelay: (n) => (n + 1) * 1000,
	refetchOnWindowFocus: true,
	refetchOnReconnect: true,
	refetchInterval: Number.MAX_VALUE,
	staleTime: 0,
	cacheTime: 30_0000, // 5 minutes
	mutator: (data) => data,
	keepPreviousData: false,
};

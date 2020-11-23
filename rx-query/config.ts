import { QueryConfig } from './types';

const DEFAULT_QUERY_CONFIG: Required<QueryConfig> = {
	retries: 3,
	retryDelay: (n) => (n + 1) * 1000,
	refetchOnWindowFocus: true,
	refetchOnReconnect: true,
	refetchInterval: Number.MAX_VALUE,
	staleTime: 0,
	cacheTime: 30_0000, // 5 minutes
	keepPreviousData: false,
	mutator: (data) => data,
};

let config = DEFAULT_QUERY_CONFIG;

export function setQueryConfig(override: Partial<QueryConfig>): void {
	config = {
		...config,
		...override,
	};
}

export function getQueryConfig(): Required<QueryConfig> {
	return config;
}

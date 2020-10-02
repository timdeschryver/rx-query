/**
 * Creates a query key based on the key and the params
 */
export function createQueryKey(key: string, params: unknown): string {
	if (params !== undefined && params !== null) {
		return (
			key +
			'-' +
			(['string', 'number'].includes(typeof params)
				? params
				: JSON.stringify(params))
		);
	}

	return key;
}

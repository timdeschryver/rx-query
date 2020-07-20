let DEBUG = false;

export function enableQueryDebug(): void {
	DEBUG = true;
}

export function isDebug(): boolean {
	return DEBUG;
}

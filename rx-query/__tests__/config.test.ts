import { setQueryConfig, getQueryConfig } from '..';

it('can override the default config', () => {
	expect(getQueryConfig().refetchOnWindowFocus).toBe(true);
	setQueryConfig({
		refetchOnWindowFocus: false,
	});
	expect(getQueryConfig().refetchOnWindowFocus).toBe(false);
});

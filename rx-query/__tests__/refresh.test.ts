import { refreshQuery, revalidate, queryCache } from '..';

it('sends emits a refresh event', (done) => {
	revalidate.subscribe({
		next: (value) => {
			expect(value.trigger).toBe('manual');
			expect(value.key).toBe('key-param');
			done();
		},
	});

	refreshQuery('key', 'param');
});

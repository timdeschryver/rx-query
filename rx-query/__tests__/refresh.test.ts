import { refreshQuery, revalidate } from '..';

it('sends a refresh event', (done) => {
	revalidate.subscribe({
		next: (value) => {
			expect(value.trigger).toBe('manual');
			expect(value.key).toBe('key-param');
			done();
		},
	});

	refreshQuery('key', 'param');
});

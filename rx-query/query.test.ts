import { interval, of, throwError } from 'rxjs';
import { take, takeWhile, map } from 'rxjs/operators';
import { eachValueFrom } from 'rxjs-for-await';
import { fireEvent } from '@testing-library/dom';
import { query, DEFAULT_QUERY_CONFIG } from '.';

it('first loads then succeeds', async () => {
	const values = [];
	for await (const value of eachValueFrom(
		query('test', () => of({ id: '3' })).pipe(
			takeWhile((x) => x.state !== 'success', true),
		),
	)) {
		values.push(value);
	}
	expect(values).toEqual([
		{
			state: 'loading',
		},
		{
			state: 'success',
			data: { id: '3' },
		},
	]);
});

it('retries then errors', async () => {
	const values = [];
	for await (const value of eachValueFrom(
		query('test', () => throwError('Error')).pipe(
			takeWhile((x) => x.state !== 'error', true),
		),
	)) {
		values.push(value);
	}

	expect(values).toEqual([
		{
			state: 'loading',
		},
		...Array.from({ length: DEFAULT_QUERY_CONFIG.retries as number }).map(
			(_, i) => ({
				state: 'loading',
				retries: i,
				error: 'Error',
			}),
		),
		{
			state: 'error',
			retries: 3,
			error: 'Error',
		},
	]);
}, 7000);

it('can override default error config with retries', async () => {
	const values = [];
	for await (const value of eachValueFrom(
		query('test', () => throwError('Error'), {
			retries: 1,
			retryDelay: 1,
		}).pipe(takeWhile((x) => x.state !== 'error', true)),
	)) {
		values.push(value);
	}

	expect(values).toEqual([
		{
			state: 'loading',
		},
		{
			state: 'loading',
			retries: 0,
			error: 'Error',
		},
		{
			state: 'error',
			retries: 1,
			error: 'Error',
		},
	]);
});

it('can override default error config with custom retry', async () => {
	const values = [];
	for await (const value of eachValueFrom(
		query('test', () => throwError('Error'), {
			retries: (n, error) => {
				expect(error).toBe('Error');
				return n < 5;
			},
			retryDelay: 1,
		}).pipe(takeWhile((x) => x.state !== 'error', true)),
	)) {
		values.push(value);
	}

	expect(values).toEqual([
		{
			state: 'loading',
		},
		...Array.from({ length: 5 }).map((_, i) => ({
			state: 'loading',
			retries: i,
			error: 'Error',
		})),
		{
			state: 'error',
			retries: 5,
			error: 'Error',
		},
	]);
});

it('retrieves data when params change and caches previous results', async () => {
	const values = [];
	let success = 0;

	// keep true alive, to keep the true group alive
	const sub = query('test', true, () => of(true)).subscribe();

	for await (const value of eachValueFrom(
		query(
			'test',
			interval(5).pipe(
				take(3),
				map((x) => x % 2 === 0),
			),
			(bool) => of(bool),
		).pipe(
			takeWhile((x) => {
				success += x.state === 'success' ? 1 : 0;
				return success !== 3;
			}, true),
		),
	)) {
		values.push(value);
	}

	expect(values).toEqual([
		// true is already in cache, so it refreshes
		{ state: 'refreshing', data: true },
		{ state: 'success', data: true },
		{ state: 'loading' },
		{ state: 'success', data: false },

		// true again -> refresh the cache
		{ state: 'refreshing', data: true },
		{ state: 'success', data: true },
	]);

	sub.unsubscribe();
});

it('groups cache continues to live until cacheTime resolves', async () => {
	const values = [];
	let success = 0;

	for await (const value of eachValueFrom(
		query(
			'test',
			interval(5).pipe(
				take(3),
				map((x) => x % 2 === 0),
			),
			(bool) => of(bool),
			{
				cacheTime: 1000,
			},
		).pipe(
			takeWhile((x) => {
				success += x.state === 'success' ? 1 : 0;
				return success !== 3;
			}, true),
		),
	)) {
		values.push(value);
	}

	expect(values).toEqual([
		{ state: 'loading' },
		{ state: 'success', data: true },
		{ state: 'loading' },
		{ state: 'success', data: false },

		// true was already cached and while being unsubscribed to, the cache remains
		{ state: 'refreshing', data: true },
		{ state: 'success', data: true },
	]);
});

it('groups clean up after last unsubscribe', async () => {
	const values = [];
	let success = 0;

	for await (const value of eachValueFrom(
		query(
			'test',
			interval(5).pipe(
				take(3),
				map((x) => x % 2 === 0),
			),
			(bool) => of(bool),
			{
				cacheTime: 0,
			},
		).pipe(
			takeWhile((x) => {
				success += x.state === 'success' ? 1 : 0;
				return success !== 3;
			}, true),
		),
	)) {
		values.push(value);
	}

	expect(values).toEqual([
		{ state: 'loading' },
		{ state: 'success', data: true },
		{ state: 'loading' },
		{ state: 'success', data: false },

		// true was unsubscribed too, so it loses its cache
		{ state: 'loading' },
		{ state: 'success', data: true },
	]);
});

it('ignores following params with same key', async () => {
	const values = [];

	for await (const value of eachValueFrom(
		query(
			'test',
			interval(5).pipe(
				take(5),
				map((_, i) => (i < 4 ? 'same' : 'other')),
			),
			(result) => of(result),
		).pipe(takeWhile((x) => x.data !== 'other', true)),
	)) {
		values.push(value);
	}

	expect(values).toEqual([
		{ state: 'loading' },
		{ state: 'success', data: 'same' },
		{ state: 'loading' },
		{ state: 'success', data: 'other' },
	]);
});

it('can disable cache', async () => {
	const values = [];
	let success = 0;
	for await (const value of eachValueFrom(
		query(
			'test',
			interval(5).pipe(
				take(3),
				map((x) => x % 2 === 0),
			),
			(bool) => of(bool),
			{
				cacheTime: 0,
			},
		).pipe(
			takeWhile((x) => {
				success += x.state === 'success' ? 1 : 0;
				return success !== 3;
			}, true),
		),
	)) {
		values.push(value);
	}

	expect(values).toEqual([
		{ state: 'loading' },
		{ state: 'success', data: true },
		{ state: 'loading' },
		{ state: 'success', data: false },

		// no cache -> data is undefined
		{ state: 'loading' },
		{ state: 'success', data: true },
	]);
});

it('invokes query on refresh', async () => {
	const values = [];
	let i = 20;

	for await (const value of eachValueFrom(
		query('test', () => of(i++), {
			refetchInterval: 5,
		}).pipe(takeWhile(() => i <= 24, true)),
	)) {
		values.push(value);
	}

	expect(values).toEqual([
		{
			state: 'loading',
		},
		{
			state: 'success',
			data: 20,
		},
		{
			state: 'refreshing',
			data: 20,
		},
		{
			state: 'success',
			data: 21,
		},
		{
			state: 'refreshing',
			data: 21,
		},
		{
			state: 'success',
			data: 22,
		},
		{
			state: 'refreshing',
			data: 22,
		},
		{
			state: 'success',
			data: 23,
		},
		{
			state: 'refreshing',
			data: 23,
		},
		{
			state: 'success',
			data: 24,
		},
	]);
});

it('invokes query on focus', async () => {
	const values = [];
	let i = 20;

	setInterval(() => {
		fireEvent.focus(window);
	}, 10);

	for await (const value of eachValueFrom(
		query('test', () => of(i++), {
			refetchOnWindowFocus: true,
		}).pipe(take(4)),
	)) {
		values.push(value);
	}

	expect(values).toEqual([
		{
			state: 'loading',
		},
		{
			state: 'success',
			data: 20,
		},
		// refetch because window is focused
		{
			state: 'refreshing',
			data: 20,
		},
		{
			state: 'success',
			data: 21,
		},
	]);
});

it('can disable refresh on data when data is still fresh', async () => {
	const values = [];
	let success = 0;

	// keep true alive, to keep the true group alive
	const sub = query('test', true, () => of(true), {
		staleTime: Number.POSITIVE_INFINITY,
	}).subscribe();

	for await (const value of eachValueFrom(
		query(
			'test',
			interval(5).pipe(
				take(3),
				map((x) => x % 2 === 0),
			),
			(bool) => of(bool),
		).pipe(
			takeWhile((x) => {
				success += x.state === 'success' ? 1 : 0;
				return success !== 2;
			}, true),
		),
	)) {
		values.push(value);
	}

	expect(values).toEqual([
		// doesn't fire a load, nor a refresh
		{ state: 'success', data: true },
		{ state: 'loading' },
		{ state: 'success', data: false },
	]);

	sub.unsubscribe();
});

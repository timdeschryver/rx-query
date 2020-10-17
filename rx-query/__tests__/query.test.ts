import { interval, of, throwError } from 'rxjs';
import { take, takeWhile, map } from 'rxjs/operators';
import { eachValueFrom } from 'rxjs-for-await';
import { fireEvent } from '@testing-library/dom';
import {
	query,
	DEFAULT_QUERY_CONFIG,
	revalidate,
	QueryOutput,
	Revalidator,
	resetQueryCache,
	refreshQuery,
} from '..';

beforeEach(() => {
	resetQueryCache();
});

it('first loads then succeeds', async () => {
	const values = [];
	for await (const value of eachValueFrom(
		query('test', () => of({ id: '3' })).pipe(
			takeWhile((x) => x.status !== 'success', true),
		),
	)) {
		values.push(value);
	}
	expect(valuesWithoutMutate(values)).toEqual([
		{
			status: 'loading',
		},
		{
			status: 'success',
			data: { id: '3' },
		},
	]);
});

it('retries then errors', async () => {
	const values: any[] = [];
	for await (const value of eachValueFrom(
		query('test', () => throwError('Error')).pipe(
			takeWhile((x) => x.status !== 'error', true),
		),
	)) {
		values.push(value);
	}

	expect(valuesWithoutMutate(values)).toEqual([
		{
			status: 'loading',
		},
		...Array.from({ length: DEFAULT_QUERY_CONFIG.retries as number }).map(
			(_, i) => ({
				status: 'loading',
				retries: i,
				error: 'Error',
			}),
		),
		{
			status: 'error',
			retries: 3,
			error: 'Error',
		},
	]);
}, 7000);

it('can override default error config with retries', async () => {
	const values: any[] = [];
	for await (const value of eachValueFrom(
		query('test', () => throwError('Error'), {
			retries: 1,
			retryDelay: 1,
		}).pipe(takeWhile((x) => x.status !== 'error', true)),
	)) {
		values.push(value);
	}

	expect(valuesWithoutMutate(values)).toEqual([
		{
			status: 'loading',
		},
		{
			status: 'loading',
			retries: 0,
			error: 'Error',
		},
		{
			status: 'error',
			retries: 1,
			error: 'Error',
		},
	]);
});

it('can override default error config with custom retry', async () => {
	const values: any[] = [];
	for await (const value of eachValueFrom(
		query('test', () => throwError('Error'), {
			retries: (n, error) => {
				expect(error).toBe('Error');
				return n < 5;
			},
			retryDelay: 1,
		}).pipe(takeWhile((x) => x.status !== 'error', true)),
	)) {
		values.push(value);
	}

	expect(valuesWithoutMutate(values)).toEqual([
		{
			status: 'loading',
		},
		...Array.from({ length: 5 }).map((_, i) => ({
			status: 'loading',
			retries: i,
			error: 'Error',
		})),
		{
			status: 'error',
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
				success += x.status === 'success' ? 1 : 0;
				return success !== 3;
			}, true),
		),
	)) {
		values.push(value);
	}

	expect(valuesWithoutMutate(values)).toEqual([
		// true is already in cache, so it refreshes
		{ status: 'refreshing', data: true },
		{ status: 'success', data: true },
		{ status: 'loading' },
		{ status: 'success', data: false },

		// true again -> refresh the cache
		{ status: 'refreshing', data: true },
		{ status: 'success', data: true },
	]);

	sub.unsubscribe();
});

it('keepPreviousData uses previous data until it receives new data', async () => {
	const values = [];

	for await (const value of eachValueFrom(
		query(
			'test',
			interval(5).pipe(takeWhile((x) => x <= 3)),
			(bool) => of(bool),
			{
				keepPreviousData: true,
			},
		).pipe(
			takeWhile((x) => {
				return x.data !== 3;
			}, true),
		),
	)) {
		values.push(value);
	}

	expect(valuesWithoutMutate(values)).toEqual([
		{ status: 'loading' },
		{ status: 'success', data: 0 },
		// while 1 is loading use previous data and set status as refreshing
		{
			data: 0,
			status: 'refreshing',
		},
		// 1 receievs a response
		{
			data: 1,
			status: 'success',
		},
		// while 2 is loading use previous data and set status as refreshing
		{
			data: 1,
			status: 'refreshing',
		},
		// 2 receievs a response
		{
			data: 2,
			status: 'success',
		},
		// while 3 is loading use previous data and set status as refreshing
		{
			data: 2,
			status: 'refreshing',
		},
		// 3 receievs a response
		{
			data: 3,
			status: 'success',
		},
	]);
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
				success += x.status === 'success' ? 1 : 0;
				return success !== 3;
			}, true),
		),
	)) {
		values.push(value);
	}

	expect(valuesWithoutMutate(values)).toEqual([
		{ status: 'loading' },
		{ status: 'success', data: true },
		{ status: 'loading' },
		{ status: 'success', data: false },

		// true was already cached and while being unsubscribed to, the cache remains
		{ status: 'refreshing', data: true },
		{ status: 'success', data: true },
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
				success += x.status === 'success' ? 1 : 0;
				return success !== 3;
			}, true),
		),
	)) {
		values.push(value);
	}

	expect(valuesWithoutMutate(values)).toEqual([
		{ status: 'loading' },
		{ status: 'success', data: true },
		{ status: 'loading' },
		{ status: 'success', data: false },

		// true was unsubscribed too, so it loses its cache
		{ status: 'loading' },
		{ status: 'success', data: true },
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

	expect(valuesWithoutMutate(values)).toEqual([
		{ status: 'loading' },
		{ status: 'success', data: 'same' },
		{ status: 'loading' },
		{ status: 'success', data: 'other' },
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
				success += x.status === 'success' ? 1 : 0;
				return success !== 3;
			}, true),
		),
	)) {
		values.push(value);
	}

	expect(valuesWithoutMutate(values)).toEqual([
		{ status: 'loading' },
		{ status: 'success', data: true },
		{ status: 'loading' },
		{ status: 'success', data: false },

		// no cache -> data is undefined
		{ status: 'loading' },
		{ status: 'success', data: true },
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

	expect(valuesWithoutMutate(values)).toEqual([
		{
			status: 'loading',
		},
		{
			status: 'success',
			data: 20,
		},
		{
			status: 'refreshing',
			data: 20,
		},
		{
			status: 'success',
			data: 21,
		},
		{
			status: 'refreshing',
			data: 21,
		},
		{
			status: 'success',
			data: 22,
		},
		{
			status: 'refreshing',
			data: 22,
		},
		{
			status: 'success',
			data: 23,
		},
		{
			status: 'refreshing',
			data: 23,
		},
		{
			status: 'success',
			data: 24,
		},
	]);
});

it('invokes query on focus', async () => {
	const values = [];
	let i = 20;

	setTimeout(() => {
		fireEvent.focus(window);
	}, 10);

	for await (const value of eachValueFrom(
		query('test', () => of(i++), {
			refetchOnWindowFocus: true,
		}).pipe(take(4)),
	)) {
		values.push(value);
	}

	expect(valuesWithoutMutate(values)).toEqual([
		{
			status: 'loading',
		},
		{
			status: 'success',
			data: 20,
		},
		// refetch because window is focused
		{
			status: 'refreshing',
			data: 20,
		},
		{
			status: 'success',
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
				success += x.status === 'success' ? 1 : 0;
				return success !== 2;
			}, true),
		),
	)) {
		values.push(value);
	}

	expect(valuesWithoutMutate(values)).toEqual([
		// doesn't fire a load, nor a refresh
		{ status: 'success', data: true },
		{ status: 'loading' },
		{ status: 'success', data: false },
	]);

	sub.unsubscribe();
});

it('can refresh on demand', async () => {
	const values = [];
	let i = 20;

	for await (const value of eachValueFrom(
		query('test', () => of(i++)).pipe(takeWhile(() => i <= 24, true)),
	)) {
		refreshQuery('test');
		values.push(value);
	}

	expect(valuesWithoutMutate(values)).toEqual([
		{
			status: 'loading',
		},
		{
			status: 'success',
			data: 20,
		},
		{
			status: 'refreshing',
			data: 20,
		},
		{
			status: 'success',
			data: 21,
		},
		{
			status: 'refreshing',
			data: 21,
		},
		{
			status: 'success',
			data: 22,
		},
		{
			status: 'refreshing',
			data: 22,
		},
		{
			status: 'success',
			data: 23,
		},
		{
			status: 'refreshing',
			data: 23,
		},
		{
			status: 'success',
			data: 24,
		},
	]);
});

it('can mutate data (data overwrite)', async () => {
	const values = [];
	setTimeout(() => {
		revalidate.next({
			key: 'test',
			data: { name: 'updated' },
			trigger: 'mutate-success',
			config: DEFAULT_QUERY_CONFIG,
		});
	}, 10);
	for await (const value of eachValueFrom(
		query('test', () =>
			of({ name: 'initial', description: 'just a description' }),
		).pipe(
			takeWhile((x) => {
				return x.data?.name !== 'updated';
			}, true),
		),
	)) {
		values.push(value);
	}

	expect(valuesWithoutMutate(values)).toEqual([
		{ status: 'loading' },
		{
			status: 'success',
			data: { name: 'initial', description: 'just a description' },
		},
		{
			status: 'success',
			data: { name: 'updated' },
		},
	]);
});

it('can mutate data (updator fn)', async () => {
	const values = [];
	setTimeout(() => {
		revalidate.next({
			key: 'test',
			data: (current: any) => ({ ...current, name: 'updated' }),
			trigger: 'mutate-success',
			config: DEFAULT_QUERY_CONFIG,
		});
	}, 10);
	for await (const value of eachValueFrom(
		query('test', () =>
			of({ name: 'initial', description: 'just a description' }),
		).pipe(
			takeWhile((x) => {
				return x.data?.name !== 'updated';
			}, true),
		),
	)) {
		values.push(value);
	}

	expect(valuesWithoutMutate(values)).toEqual([
		{ status: 'loading' },
		{
			status: 'success',
			data: { name: 'initial', description: 'just a description' },
		},
		{
			status: 'success',
			data: { name: 'updated', description: 'just a description' },
		},
	]);
});

it('rollbacks when a mutation errors', async () => {
	const values = [];
	const events: Revalidator[] = [
		{
			key: 'test',
			data: 'new value',
			trigger: 'mutate-optimistic',
			config: DEFAULT_QUERY_CONFIG,
		},
		// 👇 gets ignored because we're in `mutating` state
		{
			key: 'test',
			trigger: 'interval',
			config: DEFAULT_QUERY_CONFIG,
		},
		{
			key: 'test',
			data: 'new value 2',
			trigger: 'mutate-optimistic',
			config: DEFAULT_QUERY_CONFIG,
		},
		{
			key: 'test',
			data: 'this is the error',
			trigger: 'mutate-error',
			config: DEFAULT_QUERY_CONFIG,
		},
	];
	let i = 0;
	const interval = setInterval(() => {
		const evt = events[i++];
		if (evt) {
			revalidate.next(evt);
		} else {
			clearInterval(interval);
		}
	}, 10);

	for await (const value of eachValueFrom(
		query('test', () => of('initial')).pipe(
			takeWhile((x) => {
				return x.error !== 'this is the error';
			}, true),
		),
	)) {
		values.push(value);
	}

	expect(valuesWithoutMutate(values)).toEqual([
		{ status: 'loading' },
		{ status: 'success', data: 'initial' },
		{ status: 'mutating', data: 'new value' },
		{ status: 'mutating', data: 'new value 2' },
		// 👆 new value 2 is lost because it rollbacks, what to do about it?
		{ status: 'mutate-error', data: 'new value', error: 'this is the error' },
	]);
});

function valuesWithoutMutate(values: QueryOutput<any>[]) {
	return values.map((v) => {
		const { mutate: _, ...value } = v;
		return value;
	});
}

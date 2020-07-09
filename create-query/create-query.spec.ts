import { createQuery, DEFAULT_QUERY_CONFIG } from './create-query';
import { interval, of, throwError } from 'rxjs';
import { take, takeWhile, map } from 'rxjs/operators';
import { eachValueFrom } from 'rxjs-for-await';
import { fireEvent } from '@testing-library/dom';

it('first loads then succeeds', async () => {
  let values = [];
  for await (const value of eachValueFrom(
    createQuery(() => of({ id: '3' })).pipe(
      takeWhile((x) => x.state !== 'success', true)
    )
  )) {
    values.push(value);
  }
  expect(values).toEqual([
    {
      state: 'loading',
      retries: 0,
    },
    {
      state: 'success',
      data: { id: '3' },
      retries: 0,
    },
  ]);
});

it('retries then errors', async () => {
  let values = [];
  for await (const value of eachValueFrom(
    createQuery(() => throwError('Error')).pipe(
      takeWhile((x) => x.state !== 'error', true)
    )
  )) {
    values.push(value);
  }

  expect(values).toEqual([
    {
      state: 'loading',
      retries: 0,
    },
    ...Array.from({ length: DEFAULT_QUERY_CONFIG.retries as number }).map(
      (_, i) => ({
        state: 'loading',
        retries: i,
        error: 'Error',
      })
    ),
    {
      state: 'error',
      retries: 3,
      error: 'Error',
    },
  ]);
}, 7000);

it('can override default error config with retries', async () => {
  let values = [];
  for await (const value of eachValueFrom(
    createQuery(() => throwError('Error'), {
      retries: 1,
      retryDelay: 1,
    }).pipe(takeWhile((x) => x.state !== 'error', true))
  )) {
    values.push(value);
  }

  expect(values).toEqual([
    {
      state: 'loading',
      retries: 0,
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
  let values = [];
  for await (const value of eachValueFrom(
    createQuery(() => throwError('Error'), {
      retries: (n, error) => {
        expect(error).toBe('Error');
        return n < 5;
      },
      retryDelay: 1,
    }).pipe(takeWhile((x) => x.state !== 'error', true))
  )) {
    values.push(value);
  }

  expect(values).toEqual([
    {
      state: 'loading',
      retries: 0,
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

it('caches previous results', async () => {
  let values = [];
  let success = 0;
  for await (const value of eachValueFrom(
    createQuery(
      interval(5).pipe(
        take(3),
        map((x) => x % 2 === 0)
      ),
      (bool) => of(bool)
    ).pipe(
      takeWhile((x) => {
        success += x.state === 'success' ? 1 : 0;
        return success !== 3;
      }, true)
    )
  )) {
    values.push(value);
  }

  expect(values).toEqual([
    { state: 'loading', retries: 0 },
    { state: 'success', data: true, retries: 0 },
    { state: 'loading', retries: 0 },
    { state: 'success', data: false, retries: 0 },

    // true again -> refresh the cache
    { state: 'refreshing', retries: 0, data: true },
    { state: 'success', data: true, retries: 0 },
  ]);
});

it('can disable cache', async () => {
  let values = [];
  let success = 0;
  for await (const value of eachValueFrom(
    createQuery(
      interval(5).pipe(
        take(3),
        map((x) => x % 2 === 0)
      ),
      (bool) => of(bool),
      {
        disableCache: true,
      }
    ).pipe(
      takeWhile((x) => {
        success += x.state === 'success' ? 1 : 0;
        return success !== 3;
      }, true)
    )
  )) {
    values.push(value);
  }

  expect(values).toEqual([
    { state: 'loading', retries: 0 },
    { state: 'success', data: true, retries: 0 },
    { state: 'loading', retries: 0 },
    { state: 'success', data: false, retries: 0 },

    // no cache -> data is undefined
    { state: 'loading', retries: 0 },
    { state: 'success', data: true, retries: 0 },
  ]);
});

it('invokes query on refresh', async () => {
  let values = [];
  let i = 20;

  for await (const value of eachValueFrom(
    createQuery(() => of(i++), {
      refetchInterval: 5,
      // can still refresh with an interval when refresh is disabled
      disableRefresh: true,
    }).pipe(takeWhile((x) => i <= 24))
  )) {
    values.push(value);
  }

  expect(values).toEqual([
    {
      state: 'loading',
      retries: 0,
    },
    {
      state: 'success',
      data: 20,
      retries: 0,
    },
    {
      state: 'refreshing',
      data: 20,
      retries: 0,
    },
    {
      state: 'success',
      data: 21,
      retries: 0,
    },
    {
      state: 'refreshing',
      data: 21,
      retries: 0,
    },
    {
      state: 'success',
      data: 22,
      retries: 0,
    },
    {
      state: 'refreshing',
      data: 22,
      retries: 0,
    },
    {
      state: 'success',
      data: 23,
      retries: 0,
    },
  ]);
});

it('invokes query on focus', async () => {
  let values = [];
  let i = 20;

  setInterval(() => {
    fireEvent.focus(window);
  }, 10);

  for await (const value of eachValueFrom(
    createQuery(() => of(i++), {
      refetchOnWindowFocus: true,
      // can still refresh with an interval when refresh is disabled
      disableRefresh: true,
    }).pipe(take(4))
  )) {
    values.push(value);
  }

  expect(values).toEqual([
    {
      state: 'loading',
      retries: 0,
    },
    {
      state: 'success',
      data: 20,
      retries: 0,
    },
    // refetch because window is focused
    {
      state: 'refreshing',
      data: 20,
      retries: 0,
    },
    {
      state: 'success',
      data: 21,
      retries: 0,
    },
  ]);
});

it('can disable refresh on cached data', async () => {
  let values = [];
  let success = 0;

  for await (const value of eachValueFrom(
    createQuery(
      interval(5).pipe(
        take(3),
        map((x) => x % 2 === 0)
      ),
      (bool) => of(bool),
      {
        disableRefresh: true,
      }
    ).pipe(
      takeWhile((x) => {
        success += x.state === 'success' ? 1 : 0;
        return success !== 3;
      }, true)
    )
  )) {
    values.push(value);
  }

  expect(values).toEqual([
    { state: 'loading', retries: 0 },
    { state: 'success', data: true, retries: 0 },
    { state: 'loading', retries: 0 },
    { state: 'success', data: false, retries: 0 },

    // doesn't fire a load
    // { state: 'refreshing', retries: 0, data: true },
    { state: 'success', data: true, retries: 0 },
  ]);
});

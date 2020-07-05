import { createQuery, DEFAULT_QUERY_CONFIG } from './create-query';
import { interval, of, throwError } from 'rxjs';
import { take, takeWhile, map, tap } from 'rxjs/operators';
import { eachValueFrom } from 'rxjs-for-await';
import { fireEvent } from '@testing-library/dom';

it('first loads then succeeds', async () => {
  let values = [];
  for await (const value of eachValueFrom(
    createQuery(() => of({ id: '3' })).pipe(
      takeWhile((x) => x.status !== 'success', true)
    )
  )) {
    values.push(value);
  }
  expect(values).toEqual([
    {
      status: 'loading',
      retries: 0,
    },
    {
      status: 'success',
      data: { id: '3' },
      retries: 0,
    },
  ]);
});

it('retries then errors', async () => {
  let values = [];
  for await (const value of eachValueFrom(
    createQuery(() => throwError('Error')).pipe(
      takeWhile((x) => x.status !== 'error', true)
    )
  )) {
    values.push(value);
  }

  expect(values).toEqual([
    {
      status: 'loading',
      retries: 0,
    },
    ...Array.from({ length: DEFAULT_QUERY_CONFIG.retries as number }).map(
      (_, i) => ({
        status: 'loading',
        retries: i,
        error: 'Error',
      })
    ),
    {
      status: 'error',
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
    }).pipe(takeWhile((x) => x.status !== 'error', true))
  )) {
    values.push(value);
  }

  expect(values).toEqual([
    {
      status: 'loading',
      retries: 0,
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
  let values = [];
  for await (const value of eachValueFrom(
    createQuery(() => throwError('Error'), {
      retries: (n, error) => {
        expect(error).toBe('Error');
        return n < 5;
      },
      retryDelay: 1,
    }).pipe(takeWhile((x) => x.status !== 'error', true))
  )) {
    values.push(value);
  }

  expect(values).toEqual([
    {
      status: 'loading',
      retries: 0,
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
        success += x.status === 'success' ? 1 : 0;
        return success !== 3;
      }, true)
    )
  )) {
    values.push(value);
  }

  expect(values).toEqual([
    { status: 'loading', retries: 0 },
    { status: 'success', data: true, retries: 0 },
    { status: 'loading', retries: 0 },
    { status: 'success', data: false, retries: 0 },

    // true again, so loading gets the cached data
    { status: 'loading', retries: 0, data: true },
    { status: 'success', data: true, retries: 0 },
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
        success += x.status === 'success' ? 1 : 0;
        return success !== 3;
      }, true)
    )
  )) {
    values.push(value);
  }

  expect(values).toEqual([
    { status: 'loading', retries: 0 },
    { status: 'success', data: true, retries: 0 },
    { status: 'loading', retries: 0 },
    { status: 'success', data: false, retries: 0 },

    // no cache, so data is undefined
    { status: 'loading', retries: 0 },
    { status: 'success', data: true, retries: 0 },
  ]);
});

it('invokes query on refresh', async () => {
  let values = [];
  let i = 20;

  for await (const value of eachValueFrom(
    createQuery(() => of(i++), {
      refetchInterval: 5,
    }).pipe(takeWhile((x) => i <= 24))
  )) {
    values.push(value);
  }

  expect(values).toEqual([
    {
      status: 'loading',
      retries: 0,
    },
    {
      status: 'success',
      data: 20,
      retries: 0,
    },
    {
      status: 'loading',
      data: 20,
      retries: 0,
    },
    {
      status: 'success',
      data: 21,
      retries: 0,
    },
    {
      status: 'loading',
      data: 21,
      retries: 0,
    },
    {
      status: 'success',
      data: 22,
      retries: 0,
    },
    {
      status: 'loading',
      data: 22,
      retries: 0,
    },
    {
      status: 'success',
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
    }).pipe(take(4))
  )) {
    values.push(value);
  }

  expect(values).toEqual([
    {
      status: 'loading',
      retries: 0,
    },
    {
      status: 'success',
      data: 20,
      retries: 0,
    },
    // refetch because window gets focused
    {
      status: 'loading',
      data: 20,
      retries: 0,
    },
    {
      status: 'success',
      data: 21,
      retries: 0,
    },
  ]);
});

// const createTestScheduler = () =>
//   new TestScheduler((actual, expected) => {
//     expect(actual).toEqual(expected);
//   });

// it('succeeds', () => {
//   const testScheduler = createTestScheduler();

//   testScheduler.run((helpers) => {
//     const { cold, expectObservable } = helpers;

//     const input = cold('--a|');

//     const values = {
//       l: {
//         data: undefined,
//         retries: 0,
//         status: 'loading',
//       },
//       s: {
//         data: 'a',
//         retries: 0,
//         status: 'success',
//         error: undefined,
//       },
//     };
//     const expected = 'l-s--';

//     expectObservable(createQuery('foo', () => input)).toBe(expected, values);
//   });
// });

// it('retries', () => {
//   const testScheduler = createTestScheduler();

//   testScheduler.run((helpers) => {
//     const { cold, expectObservable } = helpers;

//     const input = cold('--#');

//     const values = {
//       l: {
//         data: undefined,
//         retries: 0,
//         status: 'loading',
//       },

//       a: {
//         retries: 0,
//         status: 'error',
//         error: 'Error'
//       },
//       b: {
//         retries: 0,
//         status: 'loading',
//         error: 'Error'
//       },

//       c: {
//         retries: 1,
//         status: 'error',
//         error: 'Error'
//       },
//       d: {
//         retries: 1,
//         status: 'loading',
//         error: 'Error'
//       },

//       e: {
//         retries: 2,
//         status: 'error',
//         error: 'Error'
//       },
//       f: {
//         retries: 2,
//         status: 'loading',
//         error: 'Error'
//       },

//       z: {
//         retries: 3,
//         status: 'error',
//         error: 'Error'
//       },
//     };
//     const expected = 'l 1ms (ab) 98ms (cd) 198ms (ef) 298ms z--';

//     expectObservable(createQuery('foo', () => input)).toBe(expected, values);
//   });
// });

// it('caches', () => {
//   const testScheduler = createTestScheduler();

//   testScheduler.run((helpers) => {
//     const { cold, expectObservable } = helpers;

//     const input = cold('20ms a|');

//     const values = {
//       l: {
//         data: undefined,
//         retries: 0,
//         status: 'loading',
//       },
//       c: {
//         data: 'a',
//         retries: 0,
//         status: 'loading',
//         error: undefined,
//       },
//       s: {
//         data: 'a',
//         retries: 0,
//         status: 'success',
//         error: undefined,
//       },
//     };
//     const expected = '100ms l 19ms s 300ms c 19ms s';

//     expectObservable(
//       createQuery(interval(100).pipe(take(2), mapTo('a')), () => input)
//     ).toBe(expected, values);
//   });
// });

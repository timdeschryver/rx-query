import {
  Observable,
  of,
  isObservable,
  defer,
  timer,
  fromEvent,
  merge,
  EMPTY,
  interval,
  NEVER,
} from 'rxjs';
import {
  map,
  startWith,
  catchError,
  switchMap,
  tap,
  share,
  skip,
  expand,
  debounce,
  withLatestFrom,
  takeUntil,
  repeat,
} from 'rxjs/operators';

export type QueryStatus = 'loading' | 'success' | 'error';

export type QueryOutput<R> = {
  status: QueryStatus;
  data?: R;
  error?: any;
  retries: number;
};

export type QueryConfig = {
  retries?: number | ((retryAttempt: number, error: any) => boolean);
  retryDelay?: number | ((retryAttempt: number) => number);
  refetchInterval?: number | Observable<unknown>;
  refetchOnWindowFocus?: boolean;
  disableCache?: boolean;
};

export const DEFAULT_QUERY_CONFIG: QueryConfig = {
  retries: 3,
  retryDelay: (n) => (n + 1) * 1000,
  refetchOnWindowFocus: false,
  refetchInterval: undefined,
  disableCache: false,
};

export function createQuery<
  QueryParam,
  QueryResult,
  Query extends (params: QueryParam) => Observable<QueryResult>
>(
  observableOrValue: QueryParam | Observable<QueryParam>,
  query: Query,
  config?: QueryConfig
): Observable<QueryOutput<QueryResult>>;
export function createQuery<
  QueryParam,
  QueryResult,
  Query extends (params: QueryParam) => Observable<QueryResult>
>(query: Query, config?: QueryConfig): Observable<QueryOutput<QueryResult>>;
export function createQuery<
  QueryParam,
  QueryResult,
  Query extends (params: QueryParam) => Observable<QueryResult>
>(...inputs: any[]): Observable<QueryOutput<QueryResult>> {
  const [firstInput, secondInput, thirdInput] = inputs;

  const hasParamInput = typeof firstInput !== 'function';

  const inputQueryParam = (hasParamInput ? firstInput : of(undefined)) as
    | QueryParam
    | Observable<QueryParam>;

  const query = (typeof firstInput === 'function'
    ? firstInput
    : secondInput) as Query;

  const inputConfig = (hasParamInput ? thirdInput : secondInput) as
    | QueryConfig
    | undefined;

  const queryConfig = {
    ...DEFAULT_QUERY_CONFIG,
    ...inputConfig,
  };

  const queryCache: {
    [cacheKey: string]: QueryResult;
  } = {};

  const retryCondition =
    typeof queryConfig.retries === 'number'
      ? (n: number) => n < (queryConfig.retries || 0)
      : queryConfig.retries || (() => false);

  const retryDelay =
    typeof queryConfig.retryDelay === 'number'
      ? () => queryConfig.retryDelay as number
      : queryConfig.retryDelay || (() => 0);

  const mapToQueryParams = () => (source: Observable<any>) => {
    return source.pipe(
      withLatestFrom(params$),
      map(([_, params]) => params)
    );
  };

  const params$ = isObservable(inputQueryParam)
    ? inputQueryParam
    : of(inputQueryParam);

  const repeatOnFocus$ = queryConfig.refetchOnWindowFocus
    ? defer(() => fromEvent(window, 'focus').pipe(mapToQueryParams()))
    : NEVER;

  const refetch$ =
    queryConfig.refetchInterval === undefined
      ? undefined
      : (isObservable(queryConfig.refetchInterval)
          ? queryConfig.refetchInterval
          : interval(queryConfig.refetchInterval)
        ).pipe(
          takeUntil(merge(params$.pipe(skip(1)), repeatOnFocus$)),
          repeat(),
          mapToQueryParams()
        );

  const triggers = [params$, repeatOnFocus$, refetch$].filter(
    Boolean
  ) as Observable<QueryParam>[];
  const trigger$ = merge(...triggers);

  return trigger$.pipe(
    switchMap((queryParam) => {
      const cacheKey = JSON.stringify(queryParam);

      const call = (retries: number): Observable<QueryOutput<QueryResult>> => {
        return query(queryParam).pipe(
          map((data) => {
            const status: QueryStatus = 'success';
            return {
              status,
              data,
              retries,
            };
          }),
          catchError((error) => {
            const status: QueryStatus = 'error';
            return of({
              status,
              error,
              retries,
            });
          }),
          tap((result) => {
            if (
              queryConfig.disableCache !== true &&
              result.status === 'success' &&
              result.data
            ) {
              queryCache[cacheKey] = result.data;
            }
          })
        );
      };

      return call(0).pipe(
        expand((result) => {
          if (
            result.status === 'error' &&
            retryCondition(result.retries, result.error)
          ) {
            return timer(retryDelay(result.retries)).pipe(
              switchMap(() => call(result.retries + 1)),
              // retry internally
              // for consumers we're still loading
              startWith({
                ...result,
                status: 'loading' as QueryStatus,
              })
            );
          }

          return EMPTY;
        }),
        // prevents that there's multiple emits in the same tick
        // for when the status is swapped from error to loading (to retry)
        debounce((x) => (x.status === 'error' ? timer(0) : EMPTY)),
        startWith({
          status: 'loading' as QueryStatus,
          retries: 0,
          ...(queryConfig.disableCache !== true && queryCache[cacheKey]
            ? { data: queryCache[cacheKey] }
            : {}),
        })
      );
    }),
    share()
  );
}

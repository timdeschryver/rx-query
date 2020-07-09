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
  iif,
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

export type QueryStatus = 'loading' | 'refreshing' | 'success' | 'error';
export type QueryOutput<R> = {
  state: QueryStatus;
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
  disableRefresh?: boolean;
};

export const DEFAULT_QUERY_CONFIG: QueryConfig = {
  retries: 3,
  retryDelay: (n) => (n + 1) * 1000,
  refetchOnWindowFocus: false,
  refetchInterval: undefined,
  disableCache: false,
  disableRefresh: false,
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

  const mapToQueryParams = (trigger: Trigger<QueryParam>['trigger']) => (
    source: Observable<any>
  ): Observable<Trigger<QueryParam>> => {
    return source.pipe(
      withLatestFrom(params$),
      map(([_, params]) => ({
        ...params,
        trigger,
      }))
    );
  };

  const params$ = (isObservable(inputQueryParam)
    ? inputQueryParam
    : of(inputQueryParam)
  ).pipe(
    map((params) => ({
      params,
      trigger: 'params',
      key: JSON.stringify(params),
    }))
  );

  const repeatOnFocus$: Observable<Trigger<
    QueryParam
  >> = queryConfig.refetchOnWindowFocus
    ? defer(() => fromEvent(window, 'focus').pipe(mapToQueryParams('focus')))
    : NEVER;

  const refetchInterval$: Observable<Trigger<QueryParam>> =
    queryConfig.refetchInterval === undefined
      ? NEVER
      : (isObservable(queryConfig.refetchInterval)
          ? queryConfig.refetchInterval
          : interval(queryConfig.refetchInterval)
        ).pipe(
          takeUntil(merge(params$.pipe(skip(1)), repeatOnFocus$)),
          repeat(),
          mapToQueryParams('interval')
        );

  const triggers = [params$, repeatOnFocus$, refetchInterval$].filter(
    Boolean
  ) as Observable<Trigger<QueryParam>>[];
  const trigger$ = merge(...triggers);

  return trigger$.pipe(
    switchMap(({ trigger, key, params }) => {
      const call = (retries: number): Observable<QueryOutput<QueryResult>> => {
        return query(params).pipe(
          map(
            (data): QueryOutput<QueryResult> => {
              return {
                state: 'success',
                data,
                retries,
              };
            }
          ),
          catchError(
            (error): Observable<QueryOutput<QueryResult>> => {
              return of({
                state: 'error',
                error,
                retries,
              });
            }
          ),
          tap((result) => {
            if (
              queryConfig.disableCache !== true &&
              result.state === 'success' &&
              result.data
            ) {
              queryCache[key] = result.data;
            }
          })
        );
      };

      const cachedDataEntry =
        queryConfig.disableCache !== true && queryCache[key]
          ? { data: queryCache[key] }
          : undefined;

      // distinguish a load and a cache refresh
      const loadingState: QueryStatus = cachedDataEntry
        ? 'refreshing'
        : 'loading';

      const callResult$: Observable<QueryOutput<QueryResult>> = defer(() =>
        call(0).pipe(
          expand((result) => {
            if (
              result.state === 'error' &&
              retryCondition(result.retries, result.error)
            ) {
              return timer(retryDelay(result.retries)).pipe(
                switchMap(() => call(result.retries + 1)),
                // retry internally
                // for consumers we're still loading
                startWith({
                  ...result,
                  state: loadingState,
                })
              );
            }

            return EMPTY;
          }),
          // prevents that there's multiple emits in the same tick
          // for when the status is swapped from error to loading (to retry)
          debounce((result) => (result.state === 'error' ? timer(0) : EMPTY)),
          startWith({
            state: loadingState,
            retries: 0,
            ...cachedDataEntry,
          } as QueryOutput<QueryResult>)
        )
      );

      const cachedResult$: Observable<QueryOutput<QueryResult>> = defer(
        (): Observable<QueryOutput<QueryResult>> => {
          return of({
            retries: 0,
            state: 'success',
            data: cachedDataEntry!.data,
          });
        }
      );

      return iif(
        () =>
          Boolean(
            trigger === 'params' &&
              queryConfig.disableRefresh &&
              cachedDataEntry
          ),
        cachedResult$,
        callResult$
      ).pipe(share());
    })
  );
}

interface Trigger<T> {
  params: T;
  trigger: 'params' | 'focus' | 'interval';
  key: string;
}

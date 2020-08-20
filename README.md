# rx-query

Check out the example on [StackBlitz](https://stackblitz.com/github/timdeschryver/rx-query).

## Why

The User Interface of a page resembles the current state an application is in.
This library requires you to think of all the states during a query (HTTP request).

Besides this, `query` also handles **retries**, keeps a **cache**, and has some **refresh** methods built-in that can be toggled to fit multiple use cases.

## Basics

### Query without parameters

The most simple query is a parameter without parameters, it's just a wrapper around and Observable.
The `query` method expects a callback method to invoke the query.

```ts
import { query } from "rx-query";

characters$ = query(() => this.rickAndMortyService.getCharacters());
```

### Query without static parameter

A query that has a static parameter (a value that doesn't change over time), can be written in the same way as a query without parameters.

```ts
import { query } from "rx-query";

characters$ = query(() => this.rickAndMortyService.getCharacter(1));
```

An alternative way if to pass the static parameter as the first argument.
The query callback will then be invoked with the passed parameter.

```ts
import { query } from "rx-query";

characters$ = query(1, (characterId) =>
	this.rickAndMortyService.getCharacter(characterId),
);
```

### Query with dynamic parameter

If a parameter can change over time (aka an Observable), it can also be passed as a parameter to `query`.
When the input Observable emits a new value, the callback query will be invoked with the new input value.

```ts
character$ = query(
	this.activatedRoute.params.pipe(map((p) => p.characterId)),
	(characterId: number) => this.rickAndMortyService.getCharacter(characterId),
);
```

### Query status

A query can have 4 statuses:

- `loading`: when the query is being invoked and hasn't responded yet
- `refreshing`: when the query is being invoked, and there's a cached value (the cached value gets refreshed when the query is successful)
- `success`: when the query returns a successful response
- `error`: when the query threw an error

In the view layer you will often see a structure like this, with a segment to represent each status:

```html
<ng-container *ngIf="characters$ | async as characters">
	<ng-container [ngSwitch]="characters.status">
		<div *ngSwitchCase="'loading'">
			Loading ... ({{ characters.retries }})
		</div>

		<div *ngSwitchCase="'error'">
			Something went wrong ... ({{ characters.retries }})
		</div>

		<div *ngSwitchDefault>
			<ul>
				<li *ngFor="let character of characters.data">
					<a [routerLink]="character.id">{{ character.name }}</a>
				</li>
			</ul>
		</div>
	</ng-container>
</ng-container>
```

## Output

```ts
export type QueryStatus = "loading" | "refreshing" | "success" | "error";
export type QueryOutput<R> = {
	status: QueryStatus;
	data?: R;
	error?: unknown;
	retries: number;
};
```

### `status`

The current status of the query.

### `data`

The result of the query, or the cached result.

### `error`

The error object returned by the query.
Only available in the error status.

### `retries`

Number of query retries.
Is reset every time data is fetched.
Available on all statuses.

## Config

```ts
export type QueryConfig = {
	retries?: number | ((retryAttempt: number, error: unknown) => boolean);
	retryDelay?: number | ((retryAttempt: number) => number);
	refetchInterval?: number | Observable<unknown>;
	refetchOnWindowFocus?: boolean;
	staleTime?: number;
	cacheTime?: number;
};
```

### `retries`

The number of retries to retry a query before ending up in the error status.
Also accepts a callback method `((retryAttempt: number, error: unknown) => boolean)` to give more control to the consumer.
When a query is being retried, the status remains in the original (loading or refreshing) status.

Default: `3`

Usage:

```ts
{
	retries: 3,
}

{
  // Never retry when 3 attempts has been made already, or when the query is totally broken
	retries: (retryAttempt: number, error: string) =>
		retryAttempt < 3 && !error !== "Totally broken",
}
```

### `retryDelay`

The delay in milliseconds before retrying the query.
Also accepts a callback method `((retryAttempt: number) => number)` to give more control to the consumer.

Default: `(n) => (n + 1) * 1000`

Usage:

```ts
{
	retryDelay: 100,
}

{
  // Increase the delay with 1 second after every attempt
	retryDelay: (retryAttempt) => retryAttempt * 1000,
}
```

### `refetchInterval`

Invoke the query in the background every x milliseconds, and emit the new value when the query is resolved.

Default: `Number.MAX_VALUE`

Usage:

```ts
{
  // every 5 minutes
	refetchInterval: 6000 * 5,
}
```

### `refetchOnWindowFocus`

Invoke the query in the background when the window is focused, and emit the new value when the query is resolved.

Default: `false`

Usage:

```ts
{
	refetchOnWindowFocus: true,
}
```

### `cacheTime`

Set the cache time (in milliseconds) for a query key.

Default: `30_000` (5 minutes)

Usage:

```ts
{
	cacheTime: 60_000,
}
```

### `staleTime`

Decides when a query should be refetched when it receives a trigger.

Default: `0`

Usage:

```ts
{
	staleTime: 60_000,
}
```

## Inspiration

This library is inspired by:

- [react-query](https://github.com/tannerlinsley/react-query), written by [Tanner Linsley](https://twitter.com/tannerlinsley)
- [vercel/swr](https://github.com/vercel/swr)

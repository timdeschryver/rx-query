import { ChangeDetectorRef, Component } from '@angular/core';
import { timer } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { queryCache, revalidate } from '../../rx-query';

@Component({
	selector: 'rx-query-devtool',
	template: `
		<h3 *ngIf="refresher$ | async">Rx Queries</h3>
		<div id="rx-query-devtool">
			<div *ngFor="let entry of cache$ | async" (click)="logClicked(entry)">
				<div [attr.data-state]="getState($any(entry))" class="subscriptions">
					{{ entry.subscriptions }}
				</div>
				<div class="key">{{ entry.key }}</div>
				<button (click)="intervalClicked(entry.key)">Refresh</button>
				<button (click)="removeClicked(entry.key)">Remove</button>
			</div>
		</div>
	`,
	styles: [
		`
			:host {
				position: fixed;
				bottom: 0;
				left: 0;
				height: 200px;
				width: 100%;
				background: rgba(255, 255, 255, 0.5);
				overflow: auto;
				padding: 8px;
				border-top: 1px solid rgba(0, 0, 0, 0.2);
			}

			#rx-query-devtool > div {
				display: grid;
				grid-template-columns: 2rem 1fr repeat(2, auto);
				gap: 5px;
				cursor: pointer;
				line-height: 2;
				margin-top: 3px;
			}

			#rx-query-devtool > div > * {
				padding: 3px;
			}

			#rx-query-devtool > div:hover {
				background: rgba(0, 0, 0, 0.1);
			}

			button {
				padding: 5px 8px;
				border-radius: 8px;
				border: 1px solid rgba(0, 0, 0, 0.5);
				background: rgba(255, 255, 255, 0.5);
			}

			button:hover {
				background: rgba(0, 0, 0, 0.2);
			}

			.subscriptions {
				text-align: center;
				border-radius: 8px;
			}

			.subscriptions[data-state='fresh'] {
				background: limegreen;
			}

			.subscriptions[data-state='stale'] {
				background: gold;
			}

			.subscriptions[data-state='error'] {
				background: crimson;
			}

			.subscriptions[data-state='loading'] {
				background: deepskyblue;
			}

			.subscriptions[data-state='refreshing'] {
				background: lightseagreen;
			}

			.subscriptions[data-state='mutating'] {
				background: blueviolet;
			}

			.subscriptions[data-state='mutate-error'] {
				background: firebrick;
			}
		`,
	],
})
export class RxQueryDevToolComponent {
	cache$ = queryCache.pipe(
		map((c) => {
			return Object.entries(c).map(([key, value]) => {
				return {
					key,
					data: value.groupState.result.data,
					subscriptions: value.groupState.subscriptions,
					status: value.groupState.result.status,
					staleAt: value.groupState.staleAt,
					removeCacheAt: value.groupState.removeCacheAt,
					error: value.groupState.result.error,
					trigger: value.trigger,
				};
			});
		}),
	);

	refresher$ = timer(0, 1000).pipe(
		map(() => true),
		tap(() => this.cdr.markForCheck()),
	);

	constructor(private cdr: ChangeDetectorRef) { }

	removeClicked(key: string): void {
		revalidate.next({ key, trigger: 'group-remove' } as any);
	}

	intervalClicked(key: string): void {
		revalidate.next({ key, trigger: 'manual' } as any);
	}

	getState(entry: { status: string; staleAt: number }) {
		return entry.status === 'success'
			? (entry.staleAt || 0) > Date.now()
				? 'fresh'
				: 'stale'
			: entry.status;
	}

	logClicked(entry: unknown): void {
		console.log(entry);
	}
}

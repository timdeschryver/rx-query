import { Component } from '@angular/core';
import { map } from 'rxjs/operators';

import { cache } from '../../rx-query';

@Component({
	selector: 'rx-query-devtool',
	template: `
		<div id="rx-query-devtool">
			<ul>
				<li *ngFor="let entry of cache$ | async">
					<div>{{ entry.subscriptions }}</div>
					<div>{{ entry.key }}</div>
					<div>{{ entry.state }}</div>
					<div>Remove at: {{ entry.removeCacheAt }}</div>
				</li>
			</ul>
		</div>
	`,
	styles: [
		`
			:host {
				position: fixed;
				bottom: 0;
				left: 0;
				right: 0;
				background: rgba(0, 0, 0, 0.5);
				height: 300px;
			}

			:host li {
				display: flex;
			}
		`,
	],
})
export class RxQueryDevToolComponent {
	cache$ = cache.pipe(
		map((c) => {
			return Object.entries(c).map(([key, value]) => {
				return {
					key,
					subscriptions: value.state.subscriptions,
					state: value.state.result.state,
					removeCacheAt: value.state.subscriptions
						? '/'
						: new Intl.DateTimeFormat('default', {
								year: 'numeric',
								month: 'numeric',
								day: 'numeric',
								hour: 'numeric',
								minute: 'numeric',
								second: 'numeric',
						  }).format(value.state.removeCacheAt),
					staleAt: value.state.subscriptions
						? '/'
						: new Intl.DateTimeFormat('default', {
								year: 'numeric',
								month: 'numeric',
								day: 'numeric',
								hour: 'numeric',
								minute: 'numeric',
								second: 'numeric',
						  }).format(value.state.staleAt),
				};
			});
		}),
	);
}

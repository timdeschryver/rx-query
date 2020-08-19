import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { query } from '../../rx-query';

@Component({
	selector: 'example-error',
	template: `
		<div
			class="max-w-sm rounded overflow-hidden shadow-lg"
			*ngIf="repo$ | async as repo"
		>
			<ng-container [ngSwitch]="repo.state">
				<div *ngSwitchDefault class="bg-white rounded-lg p-6">
					<div class="text-center md:text-left">
						<a class="text-lg text-blue-500" [href]="repo.data.url">{{
							repo.data.name
						}}</a>
						<div class="text-gray-600">Stars: {{ repo.data.stars }}</div>
						<div class="text-gray-600">Owner: {{ repo.data.owner }}</div>
					</div>
				</div>
				<div
					*ngSwitchCase="'loading'"
					class=" items-center bg-blue-500 text-white text-sm font-bold px-4 py-3"
				>
					Loading ... {{ repo.retries ? '( ' + repo.retries + ' )' : '' }}
				</div>
				<div
					*ngSwitchCase="'error'"
					class=" items-center bg-red-500 text-white text-sm font-bold px-4 py-3"
				>
					<p>
						Something went wrong ...
					</p>
					<p>{{ repo.error.status }} {{ repo.error.statusText }}</p>
				</div>
			</ng-container>
		</div>
		<rx-query-devtool></rx-query-devtool>
	`,
})
export class ErrorComponent {
	repo$ = query('example-error', () => this.http.get('/error'));

	constructor(private http: HttpClient) {}
}

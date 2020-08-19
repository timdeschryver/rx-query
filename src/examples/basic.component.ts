import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

import { query } from '../../rx-query';

@Component({
	selector: 'example-basic',
	template: `
		<div
			class="max-w-sm rounded overflow-hidden shadow-lg"
			*ngIf="repo$ | async as repo"
		>
			<div [ngSwitch]="repo.state">
				<div *ngSwitchDefault class="md:flex bg-white rounded-lg p-6">
					<div class="text-center md:text-left">
						<a class="text-lg text-blue-500" [href]="repo.data.url"
							>🔗 {{ repo.data.name }}</a
						>
						<div class="text-gray-600">🌟 {{ repo.data.stars }}</div>
						<div class="text-gray-600">👨‍💻 {{ repo.data.owner }}</div>
					</div>
				</div>
				<div *ngSwitchCase="'loading'">
					Loading ... {{ repo.retries ? '( ' + repo.retries + ' )' : '' }}
				</div>
				<div *ngSwitchCase="'error'">
					Something went wrong ...
				</div>
			</div>
		</div>
		<rx-query-devtool></rx-query-devtool>
	`,
})
export class BasicComponent {
	repo$ = query('example-basic', () =>
		this.http.get('https://api.github.com/repos/timdeschryver/rx-query').pipe(
			map((repo: any) => {
				return {
					name: repo.name,
					url: repo.html_url,
					owner: repo.owner.login,
					stars: repo.stargazers_count,
				};
			}),
		),
	);

	constructor(private http: HttpClient) {}
}

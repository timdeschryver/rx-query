import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

import { query } from '../../rx-query';

@Component({
	selector: 'example-refresh-on-focus',
	template: `
		<h2 class="text-blue-700 " *ngIf="time$ | async as time">
			<ng-container [ngSwitch]="time.state">
				<ng-container *ngSwitchDefault>
					{{ time.data.time }}
				</ng-container>
				<ng-container *ngSwitchCase="'loading'">
					Loading ...
				</ng-container>
				<ng-container *ngSwitchCase="'error'">
					Something went wrong ...
				</ng-container>
			</ng-container>
		</h2>
		
	`,
})
export class RefreshOnFocusComponent {
	time$ = query(
		'example-refresh-on-focus',
		() =>
			this.http.get('/now').pipe(
				map((utc: any) => {
					return {
						time: new Intl.DateTimeFormat('default', {
							year: 'numeric',
							month: 'numeric',
							day: 'numeric',
							hour: 'numeric',
							minute: 'numeric',
							second: 'numeric',
							timeZoneName: 'short',
						}).format(utc.timestamp),
					};
				}),
			),
		{
			refetchOnWindowFocus: true,
		},
	);

	constructor(private http: HttpClient) {}
}

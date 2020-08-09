import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormControl } from '@angular/forms';

import { query } from '../../rx-query';

@Component({
	selector: 'example-typeahead',
	template: `
		<div class="w-full">
			<div class="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
				<div class="mb-4">
					<label class="block text-gray-700 text-sm font-bold mb-2" for="Name">
						Name
					</label>
					<input
						class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
						id="name"
						type="text"
						placeholder="Name"
						[formControl]="query"
						autocomplete="off"
					/>
				</div>

				<ng-container  *ngIf="results$ | async as result">
					<div [ngSwitch]="result.state">
						<ng-container *ngSwitchDefault>
							<div
								*ngFor="let person of result.data"
								class="bg-white rounded-lg p-6 cursor-pointer"
							>
								<div class="text-lg text-blue-500">
									{{ person.name }}
								</div>
								<div class="text-gray-600">🏡 {{ person.address }}</div>
								<div class="text-gray-500 text-sm">
									🔃 {{ person.timestamp | date: 'fullTime' }}
								</div>
							</div>
							<div
								*ngIf="result.data.length === 0"
								class="bg-white rounded-lg p-6"
							>
								No persons found matching that query
							</div>
						</ng-container>
						<div *ngSwitchCase="'loading'">
							Loading ...
							{{ result.retries ? '( ' + result.retries + ' )' : '' }}
						</div>
						<div *ngSwitchCase="'error'">
							Something went wrong ...
						</div>
					</div>
				</ng-container>
				
			</div>
		</div>
	`,
})
export class TypeAheadComponent {
	query = new FormControl('');
	results$ = query('example-typeahead', this.query.valueChanges, (name) =>
		this.http.get('/persons?name=' + name),
	);

	constructor(private http: HttpClient) {}
}

import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { query, QueryOutput } from '../../rx-query';
import { Subject, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Mutator } from '../../rx-query/types';

@Component({
	selector: 'example-mutate',
	template: `
		<div class="w-full">
			<div class="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
				<ng-container *ngIf="person$ | async as person">
					<div role="alert" *ngIf="person.status === 'mutate-error'">
						<div class="bg-red-500 text-white font-bold rounded-t px-4 py-2">
							Error
						</div>
						<div
							class="border border-t-0 border-red-400 rounded-b bg-red-100 px-4 py-3 text-red-700"
						>
							{{ person.error }}
						</div>
					</div>

					<div [ngSwitch]="person.status" class="p-4">
						<div *ngSwitchDefault class="text-lg">
							<div class="text-white-500">
								{{ person.data.name }} ({{ person.data.id }})
							</div>
							<div class="text-gray-600">🏡 {{ person.data.address }}</div>
							<div class="text-gray-500 text-sm mb-3">
								🔃 {{ person.data.timestamp | date: 'fullTime' }}
							</div>

							<button
								(click)="mutate(person.mutate)"
								class="-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded mr-2"
							>
								Mutate
							</button>

							<button
								(click)="mutateError(person.mutate)"
								class="-transparent hover:bg-red-500 text-red-700 font-semibold hover:text-white py-2 px-4 border border-red-500 hover:border-transparent rounded"
							>
								Mutate with error
							</button>
						</div>
						<div *ngSwitchCase="'loading'">
							Loading ...
							{{ person.retries ? '( ' + person.retries + ' )' : '' }}
						</div>
						<div *ngSwitchCase="'error'">
							Something went wrong ...
						</div>
					</div>
				</ng-container>
			</div>
		</div>
		<rx-query-devtool></rx-query-devtool>
	`,
})
export class MutateComponent {
	selectedPerson = new Subject<number>();
	person$ = query('mutate-person', 1, (id) => this.http.get(`/persons/${id}`), {
		mutator: (data, id) =>
			this.http
				.post(`/persons/${id}`, data)
				//    👇 important to rethrow 👇
				.pipe(catchError((err) => throwError(err.statusText))),
	});

	constructor(private http: HttpClient) {}

	mutate(mutate: Mutator): void {
		mutate({
			name: [
				'Sarah',
				'Bob',
				'Charlotte',
				'Tom',
				'Tony',
				'Andrea',
				'Jane',
				'Bonnie',
				'Abigail',
				'Chloe',
			][Math.max(0, Math.round(Math.random() * 10) - 1)],
			address: 'updated adress',
		});
	}

	mutateError(mutate: Mutator): void {
		mutate({
			name: '',
			address: 'updated adress',
		});
	}
}

import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormControl } from '@angular/forms';

import { query, prefetch } from '../../rx-query';
import { Subject } from 'rxjs';

@Component({
	selector: 'example-prefetch',
	template: `
		<div class="w-full">
			<div class="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
				<ng-container *ngIf="persons$ | async as persons">
					<div [ngSwitch]="persons.status" class="flex">
						<ng-container *ngSwitchDefault>
							<div
								*ngFor="let person of persons.data"
								class="flex-1 bg-white rounded-lg p-6 cursor-pointer"
								(mouseenter)="personHover(person.id)"
								(click)="personClick(person.id)"
							>
								<div class="text-lg text-blue-500">
									{{ person.name }} ({{ person.id }})
								</div>
							</div>
						</ng-container>
						<div *ngSwitchCase="'loading'">
							Loading ...
							{{ persons.retries ? '( ' + persons.retries + ' )' : '' }}
						</div>
						<div *ngSwitchCase="'error'">
							Something went wrong ...
						</div>
					</div>
				</ng-container>

				<ng-container *ngIf="selectedPerson$ | async as selected">
					<div [ngSwitch]="selected.status" class="bg-blue-200 p-4">
						<div *ngSwitchDefault class="text-lg">
							<div class="text-blue-500">
								{{ selected.data.name }} ({{ selected.data.id }})
							</div>
							<div class="text-gray-600">🏡 {{ selected.data.address }}</div>
							<div class="text-gray-500 text-sm">
								🔃 {{ selected.data.timestamp | date: 'fullTime' }}
							</div>
						</div>
						<div *ngSwitchCase="'loading'">
							Loading ...
							{{ selected.retries ? '( ' + selected.retries + ' )' : '' }}
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
export class PrefetchComponent {
	selectedPerson = new Subject<number>();
	persons$ = query('example-prefetch-persons', () => this.http.get('/persons'));
	selectedPerson$ = query(
		'example-prefetch-person',
		this.selectedPerson,
		(id) => this.http.get(`/persons/${id}`),
	);

	constructor(private http: HttpClient) {}

	personHover(id: number): void {
		prefetch(
			'example-prefetch-person',
			id,
			() => this.http.get(`/persons/${id}`),
			{
				staleTime: 60000,
			},
		);
	}

	personClick(id: number): void {
		this.selectedPerson.next(id);
	}
}

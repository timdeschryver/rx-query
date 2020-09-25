import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { prefetch, query } from 'rx-query';
import { debounceTime, startWith, tap } from 'rxjs/operators';
import { FormBuilder } from '@angular/forms';

@Component({
	selector: 'example-pagination',
	template: `
		<form [formGroup]="search" class="mb-4 w-full">
			<input
				formControlName="query"
				class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
				id="query"
				type="text"
				autocomplete="off"
				placeholder="Query"
			/>
			<select
				formControlName="status"
				class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
				id="status"
			>
				<option>all</option>
				<option value="processing">processing</option>
				<option value="ready">ready</option>
				<option value="shipped">shipped</option>
				<option value="delivered">delivered</option>
				<option value="returned">returned</option>
				<option value="cancelled">cancelled</option>
			</select>
		</form>

		<ng-container *ngIf="orders$ | async as orders" [ngSwitch]="orders.status">
			<button
				(click)="previous()"
				[disabled]="search.value.page === 0"
				class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
			>
				Previous
			</button>
			<button
				(click)="next()"
				[disabled]="orders.data?.hasMoreData !== true"
				class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
			>
				Next {{ orders.data?.hasMoreData }}
			</button>
			<div *ngIf="orders.status === 'refreshing'">{{ orders.status }}</div>
			<div>
				Refreshed at: {{ orders.data?.timestamp | date: 'yyyy-MM-dd hh:MM' }}
			</div>

			<table *ngSwitchDefault class="table-auto w-full">
				<thead>
					<tr>
						<th class="px-4 py-2">Id</th>
						<th class="px-4 py-2">Status</th>
						<th class="px-4 py-2">Customer</th>
						<th class="px-4 py-2">Date</th>
					</tr>
				</thead>
				<tbody>
					<tr
						*ngFor="let order of orders.data?.orders"
						class=" border md:hover:bg-gray-200"
					>
						<td class="px-4 py-2">{{ order.id }}</td>
						<td class="px-4 py-2">{{ order.status }}</td>
						<td class="px-4 py-2">{{ order.customer }}</td>
						<td class="px-4 py-2">
							{{ order.date | date: 'yyyy-MM-dd hh:MM' }}
						</td>
					</tr>
				</tbody>
			</table>

			<button
				(click)="previous()"
				[disabled]="search.value.page === 0"
				class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
			>
				Previous
			</button>
			<button
				(click)="next()"
				[disabled]="orders.data?.hasMoreData !== true"
				class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
			>
				Next
			</button>
		</ng-container>
	`,
})
export class PaginationComponent {
	search = this.fb.group({
		query: [''],
		status: ['all'],
		page: [0],
	});

	orders$ = query(
		'orders',
		this.search.valueChanges.pipe(
			debounceTime(100),
			startWith(this.search.value),
		),
		(params) =>
			this.http
				.get<OrdersSearchResponse>(`/api/orders`, {
					params,
				})
				.pipe(
					tap({
						next: (resp) => {
							// if (resp.hasMoreData) {
							// 	const nextPage = { ...params, page: params.page + 1 };
							// 	prefetch('orders', nextPage, () =>
							// 		this.http.get<OrdersSearchResponse>(`/api/orders`, {
							// 			params: nextPage,
							// 		}),
							// 	);
							// }
						},
					}),
				),
		{
			// staleTime: 60_000,
			keepPreviousData: true,
			refetchInterval: 10_000,
			refetchOnWindowFocus: true,
		},
	);

	constructor(private http: HttpClient, private fb: FormBuilder) {}

	previous(): void {
		this.search.patchValue({
			page: this.search.value.page - 1,
		});
	}
	next(): void {
		this.search.patchValue({
			page: this.search.value.page + 1,
		});
	}
}

export interface Order {
	id: string;
	date: Date;
	customer: string;
	status:
		| 'processing'
		| 'ready'
		| 'shipped'
		| 'delivered'
		| 'returned'
		| 'cancelled';
}

export interface OrdersSearchResponse {
	orders: Order[];
	hasMoreData: boolean;
	timestamp: number;
}

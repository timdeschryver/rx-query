import { Component } from '@angular/core';
import { tap } from 'rxjs/operators';

import {
	query,
	refreshQuery,
	Mutator,
	mapToNoopMutation,
} from '../../rx-query';
import { generateTodoId, Todo, TodoMutation } from './todo.utils';

import { TodoService } from './todos.service';

@Component({
	selector: 'example-list',
	template: `
		<ng-container *ngIf="todos$ | async as todos">
			<ng-container [ngSwitch]="todos.status">
				<div *ngSwitchCase="'loading'">Loading ... ({{ todos.retries }})</div>
				<div *ngSwitchCase="'error'">
					Something went wrong ... ({{ todos.retries }})
				</div>
				<div *ngSwitchDefault>
					<ul>
						<li *ngFor="let todo of todos.data">
							<label>
								<input
									type="checkbox"
									[checked]="todo.completed"
									(change)="updateTodo(todos.mutate, todo)"
								/>
								{{ todo.description }}
							</label>
						</li>
					</ul>
				</div>
			</ng-container>

			<input
				#todo
				class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
				placeholder="New todo"
			/>

			<div>{{ todos.status }}</div>

			<button
				(click)="addTodo(todos.mutate, todo)"
				class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
			>
				Add Todo
			</button>
			<button
				(click)="addTodoOptimistic(todos.mutate, todo)"
				class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
			>
				Add Todo Optimistic
			</button>
		</ng-container>
		<rx-query-devtool></rx-query-devtool>
	`,
})
export class TodosComponent {
	todos$ = query('todos', () => this.todosService.getTodos(), {
		refetchOnWindowFocus: true,
		mutator: (mutation: TodoMutation, options) => {
			if (mutation.type === 'create') {
				// optimistic update, without refresh
				if (mutation.todo.id) {
					return this.todosService
						.addTodo(mutation.todo)
						.pipe(mapToNoopMutation());
				}

				return this.todosService.addTodo(mutation.todo).pipe(
					tap({
						next: () => {
							refreshQuery(options.cacheKey);
						},
					}),
					mapToNoopMutation(),
				);
			}

			// no map because update returns the whole list
			return this.todosService.updateTodo(mutation.todo);
		},
	});

	constructor(private todosService: TodoService) {}

	addTodo(mutator: Mutator<Todo[]>, input: HTMLInputElement): void {
		if (!input.value) {
			return;
		}
		const mutation: TodoMutation = {
			todo: { completed: false, description: input.value, id: '' },
			type: 'create',
		};
		mutator(mutation, (currentState) => currentState);
		input.value = '';
	}

	addTodoOptimistic(mutator: Mutator<Todo[]>, input: HTMLInputElement): void {
		if (!input.value) {
			return;
		}
		const mutation: TodoMutation = {
			todo: {
				completed: false,
				description: input.value,
				id: generateTodoId(),
			},
			type: 'create',
		};
		mutator(mutation, (currentState) => {
			return [...currentState, mutation.todo];
		});
		input.value = '';
	}

	updateTodo(mutator: Mutator<Todo[]>, todo: Todo) {
		const mutation: TodoMutation = {
			todo: {
				...todo,
				completed: !todo.completed,
			},
			type: 'update',
		};
		mutator(mutation, (currentState) => currentState);
	}
}

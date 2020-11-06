import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Todo } from './todo.utils';

@Injectable({
	providedIn: 'root',
})
export class TodoService {
	constructor(private http: HttpClient) {}

	getTodos() {
		return this.http.get<Todo[]>('/api/todos');
	}

	addTodo(todo: Todo) {
		return this.http.post<Todo[]>('/api/todos', todo);
	}

	updateTodo(todo: Todo) {
		return this.http.put<Todo[]>(`/api/todos/${todo.id}`, todo);
	}
}

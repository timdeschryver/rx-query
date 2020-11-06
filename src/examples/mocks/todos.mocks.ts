import { rest } from 'msw';
import { Todo, generateTodoId } from '../todo.utils';

let todos: Todo[] = [
	{
		id: generateTodoId(),
		completed: false,
		description: 'First dodo',
	},
];

export const todosHandlers = [
	rest.get<unknown, Todo[]>('/api/todos', (req, res, ctx) => {
		return res(ctx.delay(), ctx.json(todos));
	}),
	rest.post<unknown, Todo[]>('/api/todos', (req, res, ctx) => {
		const newTodo = req.body as Todo;
		if (newTodo.description === 'error') {
			return res(ctx.delay(2000), ctx.status(500));
		}
		newTodo.id = newTodo.id || generateTodoId();
		todos.push(newTodo);
		return res(ctx.delay(2000), ctx.json(todos));
	}),

	rest.put<unknown, Todo[]>('/api/todos/:id', (req, res, ctx) => {
		todos = todos.map((t) => {
			return t.id === req.params.id ? (req.body as Todo) : t;
		});

		return res(ctx.delay(), ctx.json(todos));
	}),
];

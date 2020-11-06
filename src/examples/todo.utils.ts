export interface Todo {
	id: string;
	description: string;
	completed: boolean;
}

export interface TodoMutation {
	type: 'create' | 'update';
	todo: Todo;
}

export function generateTodoId(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		const r = (Math.random() * 16) | 0,
			v = c == 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

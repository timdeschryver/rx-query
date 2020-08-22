import { setupWorker, rest } from 'msw';

export const worker = setupWorker(
	rest.get('/now', (req, res, ctx) => {
		return res(
			ctx.delay(1000),
			ctx.json({
				timestamp: Date.now(),
			}),
		);
	}),
	rest.get('/error', (req, res, ctx) => {
		return res(ctx.status(418, 'Uh-oh try again later'));
	}),
	rest.get('/persons', (req, res, ctx) => {
		const name = req.url.searchParams.get('name') || '';
		const match = new RegExp(name, 'i');
		return res(
			ctx.delay(1000),
			ctx.json(
				persons
					.filter((p) => match.test(p.name))
					.map((p) => ({ ...p, timestamp: Date.now() })),
			),
		);
	}),
	rest.get('/persons/:id', (req, res, ctx) => {
		const { id } = req.params;
		const person = persons.find((p) => p.id == id);
		return res(ctx.delay(1000), ctx.json({ ...person, timestamp: Date.now() }));
	}),
	rest.post('/persons/:id', (req, res, ctx) => {
		const { id } = req.params;
		const person = persons.find((p) => p.id == id);
		const body = req.body as any;
		const result = body.name
			? ctx.json({
					...person,
					...body,
					timestamp: Date.now(),
			  })
			: ctx.status(500, 'Name is required');
		return res(ctx.delay(1000), result);
	}),
);

const persons = [
	{
		id: 1,
		name: 'Abbi Gardiner',
		address: 'Street 1',
	},
	{
		id: 2,
		name: 'Mya Gray',
		address: 'Street 2',
	},
	{
		id: 3,
		name: 'Adnan Samuels',
		address: 'Street 3',
	},
	{
		id: 4,
		name: 'Jimi Ross',
		address: 'Street 4',
	},
	{
		id: 5,
		name: 'Aqeel Childs',
		address: 'Street 5',
	},
	{
		id: 6,
		name: 'Samson Sullivan',
		address: 'Street 6',
	},
	{
		id: 7,
		name: 'Dennis Foley',
		address: 'Street 7',
	},
	{
		id: 8,
		name: 'Bethanie Bradford',
		address: 'Street 8',
	},
	{
		id: 9,
		name: 'Yazmin Mueller',
		address: 'Street 9',
	},
	{
		id: 10,
		name: 'Demi Mccormack',
		address: 'Street 10',
	},
];

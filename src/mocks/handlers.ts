import { rest } from 'msw';

const characters = [
	{
		id: 1,
		name: 'Rick Sanchez',
		status: 'Alive',
		species: 'Human',
		type: '',
		image: 'https://rickandmortyapi.com/api/character/avatar/1.jpeg',
	},
	{
		id: 2,
		name: 'Morty Smith',
		status: 'Alive',
		species: 'Human',
		type: '',
		image: 'https://rickandmortyapi.com/api/character/avatar/2.jpeg',
	},
	{
		id: 3,
		name: 'Summer Smith',
		status: 'Alive',
		species: 'Human',
		gender: 'Female',
		image: 'https://rickandmortyapi.com/api/character/avatar/3.jpeg',
	},
];

export const handlers = [
	rest.get('https://rickandmortyapi.com/api/character', (req, res, ctx) => {
		return res(
			ctx.json({
				results: characters,
			}),
		);
	}),
];

import { rest } from 'msw';
import { Order, OrdersSearchResponse } from '../pagination.component';

const STATUS = [
	'processing',
	'ready',
	'shipped',
	'delivered',
	'returned',
	'cancelled',
];
const NAMES = [
	'Safia Mcfarlane',
	'Irene Mueller',
	'Ellice Talley',
	'Zena Prince',
	'Fardeen Foley',
	'Dion Bray',
	'Tonya Storey',
	'Misha Todd',
	'Blanka Morley',
	'Forrest Shaw',
	'Christy Horne',
	'Sebastian Clarkson',
	'Aryaan Washington',
	'Louis Smyth',
	'Maliha Quinn',
	'Amritpal Pemberton',
	'Daniella Bernal',
	'Freya Abbott',
	'Kenzo Pacheco',
	'Rojin Steele',
	'Akbar Rigby',
	'Kareena Buxton',
	'Esa Dowling',
	'Fabien Krueger',
	'Olli Lester',
	'Ellisha Avalos',
	'Pola Torres',
	'Kacy Hodge',
	'Shae Rodriguez',
	'Amanah Handley',
	'Glyn Roche',
	'Alissia Carter',
	'Iylah Leonard',
	'Miller Haas',
	'Kyan Gaines',
	'Cloe Bloom',
	'Jamila Hatfield',
	'Pierce Herring',
	'Lilly-Ann Harrington',
	'Armaan Nairn',
	'Jamelia Bentley',
	'Radhika Morton',
	'Ayda Hardin',
	'Richard Holder',
	'Kye Hartley',
	'Rhiannon Beattie',
	'Nikkita Goodwin',
	'Ivy Mccullough',
	'Rick Smith',
	'Isla-Grace Reyes',
	'Siraj Dale',
	'Jada Lyon',
	'Farhaan Moore',
	'Annalise Hodges',
	'Gia Fernandez',
	'Tony Ballard',
	'Macauley Cunningham',
	'Hattie Coulson',
	'Isla-Rose Lindsay',
	'Gracie-Mae Bowes',
	'T-Jay Mair',
	'Meghan Neale',
	'Julius Knowles',
	'Rowena Lucero',
	'Nafisa Pham',
	'Shannan Novak',
	'Luis Parkes',
	'Isabel Malone',
	'Manal Drake',
	'Elena Sosa',
	'Nabilah Thompson',
	'Indi Orozco',
	'Eshaan Bailey',
	'Michalina Mcdougall',
	'Jaxson Gunn',
	'Sharna Mooney',
	'Aras Hebert',
	'Isabella-Rose Conway',
	'Jaheim Lees',
	'Elsie-Rose Driscoll',
	'Tamzin Sharp',
	'Uwais Black',
	'Saanvi Warren',
	'Emelia Wright',
	'Abi Hutchinson',
	'Adriana Mata',
	'Ameena Little',
	'Brody Baldwin',
	'Mica Richards',
	'Eshan Curtis',
	'Marnie Martinez',
	'Rivka Mcintyre',
	'Imaani Moses',
	'Abigale Obrien',
	'Ariella Love',
	'Sofie Goulding',
	'Amar Collier',
	'Sabina Eastwood',
	'Sion Wicks',
	'Shaunna Bryan',
];

const ORDERS = Array.from(
	{ length: 100 },
	(): Order => ({
		id: uuidv4(),
		date: new Date(+new Date() - Math.floor(Math.random() * 10000000000)),
		status: STATUS[
			Math.floor(Math.random() * STATUS.length)
		] as Order['status'],
		customer: NAMES[Math.floor(Math.random() * NAMES.length)],
	}),
);

export const orderHandlers = [
	rest.get<unknown, OrdersSearchResponse>('/api/orders', (req, res, ctx) => {
		const query = req.url.searchParams.get('query');
		const status = req.url.searchParams.get('status');
		const page = +(req.url.searchParams.get('page') || 0);
		const pageSize = +(req.url.searchParams.get('pageSize') || 10);

		let orders = ORDERS;
		if (query) {
			orders = orders.filter(
				(o) =>
					o.id.toLocaleLowerCase().includes(query.toLowerCase()) ||
					o.customer.toLocaleLowerCase().includes(query.toLowerCase()),
			);
		}
		if (status && status !== 'all') {
			orders = orders.filter((o) => o.status === status);
		}
		const startingIndex = page * pageSize;
		const endingIndex = (page + 1) * pageSize;
		const hasMoreData = orders.length > endingIndex;
		if (page >= 0) {
			orders = orders.filter((_, i) => startingIndex <= i && i < endingIndex);
		}

		return res(
			ctx.delay(),
			ctx.json({
				timestamp: +Date.now(),
				orders,
				hasMoreData,
			}),
		);
	}),
];

function uuidv4(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		const r = (Math.random() * 16) | 0,
			v = c == 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

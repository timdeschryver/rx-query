import { expectType } from 'tsd';
import { Observable, of } from 'rxjs';
import { query, QueryOutput } from '..';

/**
 * Default
 */
expectType<Observable<QueryOutput<Customer[]>>>(
	query('customers', () => of(customers)),
);

/**
 * With params (also verifies params type)
 */
expectType<Observable<QueryOutput<number>>>(
	query('customers', of(5), (id) => of(id)),
);

/**
 * With config
 */
expectType<Observable<QueryOutput<Customer[]>>>(
	query('customers', () => of(customers), {
		retries: 5,
	}),
);

/**
 * Setup
 */
interface Customer {
	id: string;
	name: string;
}
const customers: Customer[] = [];

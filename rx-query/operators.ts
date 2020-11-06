import { Observable } from 'rxjs';
import { mapTo } from 'rxjs/operators';
import { NOOP_MUTATE, NOOP_MUTATE_TYPE } from './types';

export const mapToNoopMutation = () => {
	return (source: Observable<unknown>): Observable<NOOP_MUTATE_TYPE> => {
		return source.pipe(mapTo(NOOP_MUTATE));
	};
};

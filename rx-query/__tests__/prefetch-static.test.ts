import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';

import { revalidate, prefetch } from '..';

it('sends a fetch event with static params', () => {
	const testScheduler = new TestScheduler((a, e) => expect(a).toStrictEqual(e));
	testScheduler.run(({ expectObservable }) => {
		expectObservable(
			revalidate.pipe(map((v) => ({ trigger: v.trigger, key: v.key }))),
		).toBe('(abc)d', {
			a: { trigger: 'query-subscribe', key: 'key-{"id":1}' },
			b: { trigger: 'query-unsubscribe', key: 'key-{"id":1}' },
			c: { trigger: 'group-unsubscribe', key: 'key-{"id":1}' },
			d: { trigger: 'group-remove', key: 'key-{"id":1}' },
		});
		prefetch('key', { id: 1 }, () => of('result'), { cacheTime: 5 });
	});
});
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';

import { revalidate, prefetch } from '..';

it('sends a fetch event', () => {
	const testScheduler = new TestScheduler((a, e) => expect(a).toStrictEqual(e));
	testScheduler.run(({ expectObservable }) => {
		expectObservable(
			revalidate.pipe(map((v) => ({ trigger: v.trigger, key: v.key }))),
		).toBe('(abc)d', {
			a: { trigger: 'query-subscribe', key: 'key' },
			b: { trigger: 'query-unsubscribe', key: 'key' },
			c: { trigger: 'group-unsubscribe', key: 'key' },
			d: { trigger: 'group-remove', key: 'key' },
		});
		prefetch('key', () => of('result'), { cacheTime: 5 });
	});
});

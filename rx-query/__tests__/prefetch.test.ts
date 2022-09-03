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
			b: { trigger: 'group-unsubscribe', key: 'key' },
			c: { trigger: 'query-unsubscribe', key: 'key' },
			d: { trigger: 'group-remove', key: 'key' },
		});
		prefetch('key', () => of('result'), { cacheTime: 5 });
	});
});


it('sends a fetch event with static params', () => {
	const testScheduler = new TestScheduler((a, e) => expect(a).toStrictEqual(e));
	testScheduler.run(({ expectObservable }) => {
		expectObservable(
			revalidate.pipe(map((v) => ({ trigger: v.trigger, key: v.key }))),
		).toBe('(abc)d', {
			a: { trigger: 'query-subscribe', key: 'key-{"id":1}' },
			b: { trigger: 'group-unsubscribe', key: 'key-{"id":1}' },
			c: { trigger: 'query-unsubscribe', key: 'key-{"id":1}' },
			d: { trigger: 'group-remove', key: 'key-{"id":1}' },
		});
		prefetch('key', { id: 1 }, () => of('result'), { cacheTime: 5 });
	});
});


it('sends a fetch event with Observable params', () => {
	const testScheduler = new TestScheduler((a, e) => expect(a).toStrictEqual(e));
	testScheduler.run(({ expectObservable }) => {
		expectObservable(
			revalidate.pipe(map((v) => ({ trigger: v.trigger, key: v.key }))),
		).toBe('(abc)d', {
			a: { trigger: 'query-subscribe', key: 'key-{"id":1}' },
			b: { trigger: 'group-unsubscribe', key: 'key-{"id":1}' },
			c: { trigger: 'query-unsubscribe', key: 'key-{"id":1}' },
			d: { trigger: 'group-remove', key: 'key-{"id":1}' },
		});
		prefetch('key', of({ id: 1 }), () => of('result'), { cacheTime: 5 });
	});
});

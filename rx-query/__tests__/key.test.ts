import { createQueryKey } from '..';

it('uses the key as key', () => {
	const key = createQueryKey('mykey', undefined);
	expect(key).toBe('mykey');
});

it('adds the string param to the key', () => {
	const key = createQueryKey('my', 'key');
	expect(key).toBe('my-key');
});

it('adds the number param to the key', () => {
	const key = createQueryKey('mykey', 7);
	expect(key).toBe('mykey-7');
});

it('adds a serialized object param to the key', () => {
	const key = createQueryKey('mykey', { id: 4 });
	expect(key).toBe('mykey-{"id":4}');
});

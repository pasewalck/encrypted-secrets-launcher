import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { encrypt, decrypt, generateKey, deriveKeyFromPassword } from '../src/util/crypt.js';

describe('encrypt / decrypt', () => {
	const message = 'hello-secret-world';

	it('round-trip with password', () => {
		const password = 'my-password';
		const payload = encrypt(message, { password });
		const decrypted = decrypt(payload, { password });
		expect(decrypted).toBe(message);
	});

	it('round-trip with key', () => {
		const key = generateKey();
		const payload = encrypt(message, { key });
		const decrypted = decrypt(payload, { key });
		expect(decrypted).toBe(message);
	});

	it('round-trip with empty string', () => {
		const key = generateKey();
		const payload = encrypt('', { key });
		const decrypted = decrypt(payload, { key });
		expect(decrypted).toBe('');
	});

	it('throws on wrong password', () => {
		const payload = encrypt(message, { password: 'correct' });
		expect(() => decrypt(payload, { password: 'wrong' })).toThrow();
	});

	it('throws on wrong key', () => {
		const payload = encrypt(message, { key: generateKey() });
		expect(() => decrypt(payload, { key: generateKey() })).toThrow();
	});

	it('produces different ciphertext each time (random iv/salt)', () => {
		const password = 'test';
		const a = encrypt(message, { password });
		const b = encrypt(message, { password });
		expect(a.data).not.toBe(b.data);
		expect(a.iv).not.toBe(b.iv);
	});
});

describe('generateKey', () => {
	it('produces unique keys on each call', () => {
		const keys = new Set(Array.from({ length: 10 }, () => generateKey()));
		expect(keys.size).toBe(10);
	});
});

describe('deriveKeyFromPassword', () => {
	it('produces different keys for different passwords', () => {
		const salt = crypto.randomBytes(16);
		const a = deriveKeyFromPassword('alpha', salt);
		const b = deriveKeyFromPassword('beta', salt);
		expect(a).not.toEqual(b);
	});
});

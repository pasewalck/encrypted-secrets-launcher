import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { Var, Secrets } from '../src/secrets.js';
import { decrypt } from '../src/util/crypt.js';

function createTempDir() {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'secrets-test-'));
}

function createLegacyHex(password, obj) {
	const iv = crypto.randomBytes(16);
	const salt = crypto.randomBytes(16);
	const key = crypto.scryptSync(password, salt, 32);
	const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
	const encrypted = cipher.update(JSON.stringify(obj), 'utf8', 'hex') + cipher.final('hex');
	return iv.toString('hex') + salt.toString('hex') + encrypted;
}

describe('Var', () => {
	it('stores key and generator', () => {
		const gen = () => 'default';
		const v = new Var('MY_SECRET', gen);
		expect(v.key).toBe('MY_SECRET');
		expect(v.generator).toBe(gen);
	});
});

describe('Secrets', () => {
	let tmpDir;
	let filepath;
	let vars;

	beforeEach(() => {
		tmpDir = createTempDir();
		filepath = path.join(tmpDir, 'secrets.json');
		vars = [new Var('DB_PASSWORD', () => 'default-db-pass'), new Var('API_KEY', () => 'default-api-key')];
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	describe('initialization', () => {
		it('isInit = true when no files exist', () => {
			const s = new Secrets(filepath, vars);
			expect(s.getIsInit()).toBe(true);
			expect(s.getIsOpen()).toBe(false);
		});

		it('isInit = false when file exists', () => {
			const s1 = new Secrets(filepath, vars);
			s1.open('password');
			s1.save();

			const s2 = new Secrets(filepath, vars);
			expect(s2.getIsInit()).toBe(false);
			expect(s2.getIsOpen()).toBe(false);
		});
	});

	describe('open with init (new secrets store)', () => {
		it('creates key slots and opens secrets', () => {
			const s = new Secrets(filepath, vars);
			s.open('test-password');

			expect(s.getIsOpen()).toBe(true);
			expect(s.obj.keySlots).toHaveLength(1);
		});

		it('populates secrets from generators', () => {
			const s = new Secrets(filepath, vars);
			s.open('test-password');

			const secrets = s.getSecrets();
			expect(secrets).toEqual({
				DB_PASSWORD: 'default-db-pass',
				API_KEY: 'default-api-key',
			});
		});

		it('writes the secrets file to disk', () => {
			const s = new Secrets(filepath, vars);
			s.open('test-password');

			expect(fs.existsSync(filepath)).toBe(true);
			const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
			expect(content).toHaveProperty('encryptedSecrets');
			expect(content).toHaveProperty('keySlots');
		});
	});

	describe('open with existing secrets store', () => {
		let password;

		beforeEach(() => {
			password = 'my-password';
			const s = new Secrets(filepath, vars);
			s.open(password);
			s.save();
		});

		it('can re-open with correct password', () => {
			const s = new Secrets(filepath, vars);
			s.open(password);

			expect(s.getIsOpen()).toBe(true);
			expect(s.getSecrets()).toEqual({
				DB_PASSWORD: 'default-db-pass',
				API_KEY: 'default-api-key',
			});
		});

		it('throws on wrong password', () => {
			const s = new Secrets(filepath, vars);
			expect(() => s.open('wrong-password')).toThrow();
			expect(s.getIsOpen()).toBe(false);
		});
	});

	describe('open with legacy file', () => {
		let legacyFilepath;

		beforeEach(() => {
			legacyFilepath = path.join(tmpDir, 'legacy-secrets.txt');
			const legacyHex = createLegacyHex('legacy-pass', { DB_PASSWORD: 'legacy-db-pass' });
			fs.writeFileSync(legacyFilepath, legacyHex);

			const s = new Secrets(filepath, vars, legacyFilepath);
			s.open('legacy-pass');
			s.save();
		});

		it('upgrades legacy to new format', () => {
			expect(fs.existsSync(filepath)).toBe(true);

			const s2 = new Secrets(filepath, vars, legacyFilepath);
			expect(s2.getIsInit()).toBe(false);
			expect(s2.needsUpgrade).toBe(false);
			s2.open('legacy-pass');
			expect(s2.getIsOpen()).toBe(true);
			expect(s2.getSecrets().DB_PASSWORD).toBe('legacy-db-pass');
		});
	});

	describe('getSecrets', () => {
		it('returns object by default', () => {
			const s = new Secrets(filepath, vars);
			s.open('test');
			const result = s.getSecrets();
			expect(Array.isArray(result)).toBe(false);
			expect(Object.keys(result)).toEqual(['DB_PASSWORD', 'API_KEY']);
		});

		it('returns Map when json=false', () => {
			const s = new Secrets(filepath, vars);
			s.open('test');
			const result = s.getSecrets(false);
			expect(result).toBeInstanceOf(Map);
		});
	});

	describe('save', () => {
		it('persists encrypted secrets to file', () => {
			const s = new Secrets(filepath, vars);
			s.open('test');

			const key = s.key;
			const savedContent = JSON.parse(fs.readFileSync(filepath, 'utf8'));

			const decryptedDbPass = JSON.parse(decrypt(savedContent.encryptedSecrets.DB_PASSWORD, { key }));
			expect(decryptedDbPass).toBe('default-db-pass');
		});
	});
});

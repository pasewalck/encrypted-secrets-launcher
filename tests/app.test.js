import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import request from 'supertest';
import { createLauncher, Var } from '../src/app.js';
import { Secrets } from '../src/secrets.js';

function createTempDir() {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'launcher-test-'));
}

describe('createLauncher', () => {
	let tmpDir;
	let filepath;
	let vars;

	beforeEach(() => {
		tmpDir = createTempDir();
		filepath = path.join(tmpDir, 'secrets.json');
		vars = [new Var('DB_PASSWORD', () => 'default-db-pass'), new Var('API_KEY', () => 'default-api-key')];
	});

	afterEach(() => {
		if (tmpDir) {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it('returns { app, server }', () => {
		const { app } = createLauncher(vars, {
			filepath,
			port: 0,
			generatePasswort: () => 'test-password',
			onMessage: () => {},
			onComplete: () => {},
			onUnlock: () => {},
		});
		expect(app).toBeDefined();
	});

	describe('routes (locked mode — pre-existing file)', () => {
		let app;

		beforeEach(() => {
			// Pre-create a secrets file so createLauncher starts in locked mode
			const s = new Secrets(filepath, vars);
			s.open('test-password');
			s.save();

			const result = createLauncher(vars, {
				filepath,
				port: 0,
				generatePasswort: () => 'test-password',
				onMessage: () => {},
				onComplete: () => {},
				onUnlock: () => {},
			});
			app = result.app;
		});

		it('GET / renders locked page', async () => {
			const res = await request(app).get('/');
			expect(res.status).toBe(200);
			expect(res.text).toContain('Service Locked');
		});

		it('GET /unlock renders unlock page with form', async () => {
			const res = await request(app).get('/unlock');
			expect(res.status).toBe(200);
			expect(res.text).toContain('Unlock Service');
			expect(res.text).toContain('input');
		});

		it('GET /public/styles.css serves static file', async () => {
			const res = await request(app).get('/public/styles.css');
			expect(res.status).toBe(200);
			expect(res.headers['content-type']).toMatch(/css/);
		});

		it('GET /unknown-path renders locked page (catch-all)', async () => {
			const res = await request(app).get('/some-random-path');
			expect(res.status).toBe(200);
			expect(res.text).toContain('Service Locked');
		});
	});
});

import fs from 'fs';
import { decrypt, encrypt, generateKey } from './util/crypt.js';
import { BadPasswordError } from './errors/bad-password.error.js';
import { UnlockError } from './errors/unlock.error.js';
import { indexToGreekLetterName } from './util/greek-letters.js';
import { KeySlotRemoveError } from './errors/keyslot-remove.error.js';

export class Var {
	/**
	 * @param {string} key - The secret variable name.
	 * @param {() => any} generator - Function that generates a default value if not found.
	 */
	constructor(key, generator) {
		this.key = key;
		this.generator = generator;
	}
}

export class KeySlot {
	constructor(name, idIndex, encryptedKey) {
		this.name = name;
		this.encryptedKey = encryptedKey;
		this.idIndex = idIndex;
	}
}

export class Secrets {
	constructor(filepath, vars, legacyFilepath = null, doBackups = true) {
		if (legacyFilepath) {
			throw new Error(
				'This version of the launcher does not support loading legacy files! Please use a launcher version below 1.2.0.'
			);
		}
		this.doBackups = doBackups;
		this.filepath = filepath;
		this.vars = vars;
		this.secretsMap = new Map();
		this.keySlots = [];
		this.encryptedSecrets = {};
		this.isOpen = false;
		this.key = null;
		this.isInit = !fs.existsSync(filepath);
		if (!this.isInit) {
			const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
			const v = data.v || 'legacy';
			switch (v) {
				case '1.2.0':
					this.encryptedSecrets = data.encryptedSecrets;
					this.keySlots = data.keySlots.map(
						(keySlot) => new KeySlot(keySlot.name, keySlot.idIndex, keySlot.encryptedKey)
					);
					break;
				case 'legacy':
					this.encryptedSecrets = data.encryptedSecrets;
					this.keySlots = data.keySlots.map(
						(keySlot, idIndex) => new KeySlot(indexToGreekLetterName(idIndex), idIndex, keySlot)
					);
					break;
				default:
					throw new Error('Datafile has invalid Version. Please make sure you are using a valid file.');
			}
		}
	}

	addKeySlot(password, name = undefined, currentPassword = undefined) {
		const key = this.key ? this.key : this.getKey(currentPassword);

		const idIndecies = this.keySlots.map((v) => v.idIndex);
		const lastIdIndex = Math.max(0, ...idIndecies);
		this.keySlots.push(
			new KeySlot(
				name ? name : indexToGreekLetterName(lastIdIndex + 1),
				lastIdIndex + 1,
				encrypt(key, { password })
			)
		);
		return true;
	}

	removeKeySlot(idIndex) {
		const idIndecies = this.keySlots.map((v) => v.idIndex);
		const realIndex = idIndecies.indexOf(idIndex);
		if (this.keySlots.length == 1) throw new KeySlotRemoveError();
		this.keySlots.splice(realIndex, 1);
	}

	getKey(password) {
		let key;
		if (password == undefined) throw new BadPasswordError();

		for (const keySlot of this.keySlots) {
			try {
				key = decrypt(keySlot.encryptedKey, { password });
				if (key) break;
			} catch (error) {
				if (
					!error.message.includes('bad decrypt') &&
					!error.message.includes('Unsupported state or unable to authenticate data')
				) {
					throw error;
				}
			}
		}

		if (key == null) {
			throw new BadPasswordError();
		}

		return key;
	}

	open(password) {
		if (this.isInit) {
			this.key = generateKey();
			this.addKeySlot(password);
		} else {
			this.key = this.getKey(password);
		}

		try {
			for (const v of this.vars) {
				const encrypted = this.encryptedSecrets?.[v.key];
				const value = encrypted ? JSON.parse(decrypt(encrypted, { key: this.key })) : v.generator();
				this.secretsMap.set(v.key, value);
			}
		} catch (error) {
			if (
				!error.message.includes('bad decrypt') &&
				!error.message.includes('Unsupported state or unable to authenticate data')
			) {
				throw new UnlockError();
			} else throw error;
		}

		this.isOpen = true;

		this.save();

		this.isInit = false;
	}

	getIsInit() {
		return this.isInit;
	}

	close() {
		this.isOpen = false;
		this.secretsMap.clear();
	}

	getIsOpen() {
		return this.isOpen;
	}

	getSecrets(json = true) {
		return json ? Object.fromEntries(this.secretsMap) : this.secretsMap;
	}

	save() {
		for (const v of this.vars) {
			if (this.secretsMap.has(v.key))
				this.encryptedSecrets[v.key] = encrypt(JSON.stringify(this.secretsMap.get(v.key)), {
					key: this.key,
				});
		}
		if (this.doBackups && fs.existsSync(this.filepath)) fs.copyFileSync(this.filepath, this.filepath + '.bkp');
		fs.writeFileSync(
			this.filepath,
			JSON.stringify({
				v: '1.2.0',
				encryptedSecrets: this.encryptedSecrets,
				keySlots: this.keySlots,
			})
		);
	}
}

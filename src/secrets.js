import fs from 'fs';
import { decrypt, encrypt, generateKey, legacyDecrypt } from './util/crypt.js';
import { BadPasswordError } from './errors/bad-password.error.js';
import { UnlockError } from './errors/unlock.error.js';

/**
 * @template T
 * A secret variable definition.
 */
export class Var {
	/**
	 * @param {string} key - The secret variable name.
	 * @param {() => T} generator - Function that generates a default value if not found.
	 */
	constructor(key, generator) {
		/** @type {string} */
		this.key = key;
		/** @type {() => T} */
		this.generator = generator;
	}
}

export class Secrets {
	/**
	 * @param {string} filepath - Path to the encrypted secrets file.
	 * @param {Array<Var<any>>} vars - The secret variable definitions.
	 * @param {?string} [legacyFilepath=null] - Path to a legacy secrets file, if any.
	 */
	constructor(filepath, vars, legacyFilepath = null) {
		/** @type {string} */
		this.filepath = filepath;
		/** @type {?string} */
		this.legacyFilepath = legacyFilepath;
		/** @type {Array<Var<any>>} */
		this.vars = vars;
		/** @type {Map<string, any>} */
		this.secretsMap = new Map();
		/** @type {?object} */
		this.obj = null;
		/** @type {boolean} */
		this.isOpen = false;
		/** @type {?string} */
		this.key = null;
		/** @type {boolean} */
		this.isInit = !fs.existsSync(filepath) && !(legacyFilepath && fs.existsSync(legacyFilepath));
		/** @type {boolean} */
		this.needsUpgrade = legacyFilepath && fs.existsSync(legacyFilepath) && !fs.existsSync(filepath);
		this.obj =
			this.isInit || this.needsUpgrade
				? { encryptedSecrets: {}, keySlots: [] }
				: JSON.parse(fs.readFileSync(filepath, 'utf8'));
	}

	/**
	 * Adds a new key slot encrypted with the given password.
	 * @param {string} password - The password to encrypt the key with.
	 */
	addKeySlot(password) {
		this.obj.keySlots.push(encrypt(this.key, { password }));
	}

	/**
	 * Recovers the storage key from the password.
	 * @param {string} password - The password to decrypt the key with.
	 * @returns {string}
	 */
	getKey(password) {
		let key;

		for (const keySlot of this.obj.keySlots) {
			try {
				key = decrypt(keySlot, { password });
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

	/**
	 * Unlocks the secrets with the provided password.
	 * @param {string} password - The password.
	 */
	open(password) {
		if (this.needsUpgrade) {
			if (this.legacyFilepath && fs.existsSync(this.legacyFilepath)) {
				const legacySecretsObj = JSON.parse(
					legacyDecrypt(fs.readFileSync(this.legacyFilepath, 'utf8'), password)
				);
				for (const v of this.vars) {
					const value = legacySecretsObj?.[v.key];
					if (value) this.secretsMap.set(v.key, value);
					else this.secretsMap.set(v.key, v.generator());
				}
			}
		}

		if (this.isInit || this.needsUpgrade) {
			this.key = generateKey();
			this.addKeySlot(password);
		} else {
			this.key = this.getKey(password);
		}

		try {
			if (!this.needsUpgrade) {
				for (const v of this.vars) {
					const encrypted = this.obj.encryptedSecrets?.[v.key];
					const value = encrypted ? JSON.parse(decrypt(encrypted, { key: this.key })) : v.generator();
					this.secretsMap.set(v.key, value);
				}
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
		this.needsUpgrade = false;
	}

	/**
	 * Whether the secrets file has not been initialized yet.
	 * @returns {boolean}
	 */
	getIsInit() {
		return this.isInit;
	}

	/**
	 * Closes the secrets store.
	 */
	close() {
		this.isOpen = false;
		this.secretsMap.clear();
	}

	/**
	 * Whether the secrets are currently unlocked.
	 * @returns {boolean}
	 */
	getIsOpen() {
		return this.isOpen;
	}

	/**
	 * Returns the unlocked secrets.
	 * @param {boolean} [json=true] - Return a plain object instead of the Map.
	 * @returns {Record<string, any>|Map<string, any>}
	 */
	getSecrets(json = true) {
		return json ? Object.fromEntries(this.secretsMap) : this.secretsMap;
	}

	/**
	 * Persists the encrypted secrets to disk.
	 */
	save() {
		for (const v of this.vars) {
			if (this.secretsMap.has(v.key))
				this.obj.encryptedSecrets[v.key] = encrypt(JSON.stringify(this.secretsMap.get(v.key)), {
					key: this.key,
				});
		}
		fs.writeFileSync(this.filepath, JSON.stringify(this.obj));
	}
}

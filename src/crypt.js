import crypto from 'crypto';

/**
 * @typedef {Object} EncryptedPayload
 * @property {number} v - Payload format version
 * @property {string} alg - Algorithm used (e.g. "aes-256-gcm")
 * @property {string} iv - Initialization vector (base64url encoded)
 * @property {string} tag - Authentication tag (base64url encoded)
 * @property {string|null} passwordSalt - Password salt (base64url encoded), null when using raw key
 * @property {string} data - Encrypted ciphertext (base64url encoded)
 */

/**
 * Legacy decryption using AES-256-CBC decryption and fixed lengths.
 * @param {string} encrypted - The encrypted message in hexadecimal format.
 * @param {string} password - The password used for decryption.
 * @returns {string} The decrypted message.
 */
export function legacyDecrypt(encrypted, password) {
	const buffer = Buffer.from(encrypted, 'hex');
	const iv = buffer.subarray(0, 16);
	const salt = buffer.subarray(16, 32);
	const encryptedData = buffer.subarray(32).toString('hex');

	const key = crypto.scryptSync(password, salt, 32);
	const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
	let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
	decrypted += decipher.final('utf8');
	return decrypted;
}

/**
 * @param {string} message
 * @param {{
 *   password?: string
 *   key?: string|Buffer
 * }} options
 * @returns {EncryptedPayload}
 */
export function encrypt(message, options) {
	let key;
	let passwordSalt = undefined;

	if (options.password) {
		passwordSalt = crypto.randomBytes(16);
		key = deriveKeyFromPassword(options.password, passwordSalt);
	} else {
		key = typeof options.key === 'string' ? Buffer.from(options.key, 'base64url') : options.key;
	}

	const alg = 'aes-256-gcm';
	const iv = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv(alg, key, iv);

	const encrypted = Buffer.concat([cipher.update(message, 'utf8'), cipher.final()]);

	const tag = cipher.getAuthTag();

	return {
		v: 1,
		alg: alg,
		iv: iv.toString('base64url'),
		tag: tag.toString('base64url'),
		passwordSalt: passwordSalt ? passwordSalt.toString('base64url') : null,
		data: encrypted.toString('base64url'),
	};
}

/**
 * @param {EncryptedPayload} payload
 * @param {{
 *   password?: string
 *   key?: string|Buffer
 * }} options
 * @returns {string}
 */
export function decrypt(payload, options) {
	const key = options.key
		? typeof options.key === 'string'
			? Buffer.from(options.key, 'base64url')
			: options.key
		: deriveKeyFromPassword(options.password, Buffer.from(payload.passwordSalt, 'base64url'));

	const decipher = crypto.createDecipheriv(payload.alg, key, Buffer.from(payload.iv, 'base64url'));

	decipher.setAuthTag(Buffer.from(payload.tag, 'base64url'));

	const decrypted = Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64url')), decipher.final()]);

	return decrypted.toString('utf8');
}

/**
 * Generates a random key
 * @returns {string} A random key as a hexadecimal string.
 */
export function generateKey() {
	return crypto.randomBytes(32).toString('base64url');
}

/**
 * Derives a key from a password and salt using scryptSync.
 * @param {string} password - The password.
 * @param {Buffer} salt - The salt.
 * @returns {Buffer} The derived key.
 */
export function deriveKeyFromPassword(password, salt) {
	return crypto.scryptSync(password, salt, 32);
}

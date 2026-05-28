import crypto from "crypto";

/**
 * Encrypts a message using AES-256-CBC encryption.
 * @param {string} message - The message to encrypt.
 * @param {string|Buffer} key - The key used for encryption.
 * @param {Buffer} [salt] - The salt to embed in the blob.
 * @returns {string} The encrypted message in hexadecimal format.
 */
export function encrypt(message, key, salt = crypto.randomBytes(16)) {
    const keyBuffer = typeof key === "string" ? Buffer.from(key, "hex") : key;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return Buffer.concat([iv, salt, Buffer.from(encrypted, 'hex')]).toString('hex');
}

/**
 * Decrypts an encrypted message using AES-256-CBC decryption.
 * @param {string} encryptedBlob - The encrypted message in hexadecimal format.
 * @param {string|Buffer} key - The key used for decryption.
 * @returns {string} The decrypted message.
 */
export function decrypt(encryptedBlob, key) {
    const keyBuffer = typeof key === "string" ? Buffer.from(key, "hex") : key;
    const buffer = Buffer.from(encryptedBlob, 'hex');
    const iv = buffer.subarray(0, 16);
    const salt = buffer.subarray(16, 32);
    const encryptedData = buffer.subarray(32).toString('hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

/**
 * Generates a random key
 * @returns {string} A random key as a hexadecimal string.
 */
export function generateKey() {
    const key = crypto.generateKeySync('aes', { length: 256 });
    return key.export().toString('hex');
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

/**
 * Encrypts a message with a key derived from a password.
 * @param {string} message - The message to encrypt.
 * @param {string} password - The password used for encryption.
 * @returns {string} The encrypted message in hexadecimal format.
 */
export function encrypt_with_password(message, password) {
    const salt = crypto.randomBytes(16);
    const derivedKey = deriveKeyFromPassword(password, salt);
    return encrypt(message, derivedKey, salt);
}

/**
 * Decrypts an encrypted message using a key derived from a password.
 * @param {string} encryptedBlob - The encrypted message in hexadecimal format.
 * @param {string} password - The password used for decryption.
 * @returns {string} The decrypted message.
 */
export function decrypt_with_password(encryptedBlob, password) {
    const buffer = Buffer.from(encryptedBlob, 'hex');
    const salt = buffer.subarray(16, 32);
    const derivedKey = deriveKeyFromPassword(password, salt);
    return decrypt(encryptedBlob, derivedKey);
}
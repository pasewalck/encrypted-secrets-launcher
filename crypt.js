import crypto from "crypto";

/**
 * Encrypts a message using AES-256-CBC encryption.
 * @param {string} message - The message to encrypt.
 * @param {string} password - The password used for encryption.
 * @returns {string} The encrypted message in hexadecimal format.
 */
export function encrypt(message, password) {
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, salt, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return Buffer.concat([iv, salt, Buffer.from(encrypted, 'hex')]).toString('hex');
}

/**
 * Decrypts an encrypted message using AES-256-CBC decryption.
 * @param {string} encryptedBlob - The encrypted message in hexadecimal format.
 * @param {string} password - The password used for decryption.
 * @returns {string} The decrypted message.
 */
export function decrypt(encryptedBlob, password) {
    const buffer = Buffer.from(encryptedBlob, 'hex');
    const iv = buffer.subarray(0, 16);
    const salt = buffer.subarray(16, 32);
    const encryptedData = buffer.subarray(32).toString('hex');

    const key = crypto.scryptSync(password, salt, 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

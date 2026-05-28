import fs from "fs";
import { encrypt, decrypt, generateKey, encrypt_with_password, decrypt_with_password } from "./crypt.js";

/**
 * Represents a secret with a key and a generator function.
 */
export class Secret {
    /**
     * Creates an instance of Secret.
     * @param {string} key - The key of the secret.
     * @param {Function} generator - A function that generates the value for the secret.
     */
    constructor(key, generator) {
        this.key = key;
        this.generator = generator;
    }
}

/**
 * Loads and decrypts secrets from a specified file.
 * @param {string} secretsFilename - The path to the secrets file.
 * @param {string} password - The password used for decryption.
 * @returns {Object} - The decrypted secrets as a JavaScript object.
 */
export function loadSecrets(secretsFilename, password) {
    const lines = fs.readFileSync(secretsFilename, 'utf8').split("\n");
    if (lines.length == 1) {
        const decryptedSecrets = decrypt_with_password(lines[0], password);
        return JSON.parse(decryptedSecrets);
    } else {
        for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i];
            try {
                const decryptedKey = decrypt_with_password(line, password);
                const decryptedSecrets = decrypt(lines[lines.length - 1], decryptedKey);
                return JSON.parse(decryptedSecrets);
            } catch (error) {
                if (error.message.includes("bad decrypt")) {
                } else {
                    throw error;
                }
            }
        }
        throw new Error("bad decrypt");
    }
}

/**
 * Creates (or updates) and encrypts a secrets file with the provided secrets.
 * @param {string} secretsFilename - The path to save the secrets file.
 * @param {string} password - The password used for encryption.
 * @param {Object} secrets - The secrets to be saved.
 * @param {boolean} legacy - Flag to use legacy saving.
 */
export function createOrUpdateSecretsFile(secretsFilename, password, secrets, legacy = false) {
    const secretsAsString = JSON.stringify(secrets)

    if (legacy) {
        fs.writeFileSync(secretsFilename, encrypt_with_password(key, password));
        return
    }

    const key = generateKey();
    var lines;
    if (!fs.existsSync(secretsFilename)) {
        lines = [encrypt_with_password(key, password), ""];
    } else {
        lines = fs.readFileSync(secretsFilename, 'utf8').split("\n");
        if (lines.length == 1) {
            lines = [encrypt_with_password(key, password), ""];
        }
    }

    lines[lines.length - 1] = encrypt(secretsAsString, key);
    fs.writeFileSync(secretsFilename, lines.join("\n"));
}

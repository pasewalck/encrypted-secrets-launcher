import express from "express";
import fs from "fs";
import { encrypt, decrypt } from "./crypt.js";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @callback onMessage
 * @param {boolean} isError
 * @param {...string} text
 */

/**
 * @callback onReturnSecrets
 * @param {JSON} secrets
 */

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
function loadSecrets(secretsFilename, password) {
    const encryptedBlob = fs.readFileSync(secretsFilename, 'utf8');
    const decryptedSecrets = decrypt(encryptedBlob, password);
    return JSON.parse(decryptedSecrets);
}

/**
 * Creates (or updates) and encrypts a secrets file with the provided secrets.
 * @param {string} secretsFilename - The path to save the secrets file.
 * @param {string} password - The password used for encryption.
 * @param {Object} secrets - The secrets to be saved.
 */
function createOrUpdateSecretsFile(secretsFilename, password, secrets) {
    const encryptedSecrets = encrypt(JSON.stringify(secrets), password);
    fs.writeFileSync(secretsFilename, encryptedSecrets);
}

/**
 * Closes a http Server (closes all connections to make sure close is quick).
 * @param {import("http").Server} server - The server to close.
 * @param {Function} callback - The callback for closing server.
 * @param {onMessage} onMessage - The callback for messages.
 * @param {number} waitSeconds - The time inseconds to wait before closing connection.
 */
function closeServer(server, onComplete, onMessage, waitSeconds = 0) {
    if (waitSeconds <= 0) {
        onMessage(false, "Stopping Webserver")
        server.close(() => {
            onMessage(false, "Stopped Webserver")
            onComplete()
        }, (error) => {
            if (error) {
                onMessage(true, "Error stopping Webserver: ", error)
            }
            closeServer(server, onComplete, onMessage, 5)
        });
        server.closeAllConnections()
    } else {
        onMessage(false, "Stopping Webserver in", waitSeconds, "seconds")
        setTimeout(() => {
            closeServer(server, onComplete, onMessage)
        }, 1000 * waitSeconds);
    }

}

/**
 * Creates an Express server that handles password input and manages secrets.
 * @param {Array<Secret>} vars - An array of environment variable definitions.
 * @param {string} secretsFilename - The path to the secrets file.
 * @param {number} port - The port on which the server will listen.
 * @param {Function} generatePasswort - The function to generate a primary password of non is setup
 * @param {onReturnSecrets} onComplete - The function to run on complete.
 * @param {onReturnSecrets} onUnlock - The function to run on unlock (webserver will still be running).
 * @param {onMessage} onMessage - The function to use for messages.
 * @param {string} healthCheckUrl - The health check url for launcher application to check against.
 */
export function createLauncher(vars, secretsFilename, port, generatePasswort, onComplete, onUnlock, onMessage, healthCheckUrl) {
    if (!fs.existsSync(secretsFilename)) {
        createOrUpdateSecretsFile(secretsFilename, generatePasswort(), {});
    }

    var isLocked = true;

    const app = express();

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    app.use(express.urlencoded({ extended: true }));
    app.use("/public", express.static(path.join(__dirname, 'public')));

    app.get(/^(?!\/unlock|\/public).+/, (req, res) => {
        if (isLocked) {
            res.render('index');
        } else {
            res.render('starting', { healthCheckUrl });
        }
    });

    app.get('/unlock', (req, res) => {
        res.render('unlock');
    });

    app.post('/unlock', (req, res) => {
        if (!isLocked) {
            res.render('starting', { healthCheckUrl });
        } else {
            const password = req.body.password;
            onMessage(false, "Password received from Frontend")

            try {
                const secrets = loadSecrets(secretsFilename, password);
                var shouldSave = false;

                vars.forEach(element => {
                    if (!secrets[element.key]) {
                        shouldSave = true;
                        secrets[element.key] = element.generator();
                    }
                });

                createOrUpdateSecretsFile(secretsFilename, password, secrets);

                onMessage(false, "Unlock successful")
                onUnlock(secrets)

                closeServer(server, () => {
                    onMessage(false, "Successfully completed")
                    onComplete(secrets);
                }, onMessage, 3)

                isLocked = false;

                res.render('starting', { healthCheckUrl });

            } catch (error) {
                if (error.message.includes("bad decrypt")) {
                    onMessage(false, "Unlock failed. Bad Password.")
                    res.status(500).render('error');
                } else {
                    onMessage(true, "An unexpected Error occurred:", error);
                    res.status(500).send('An unexpected Error occurred.');
                }
            }
        }
    });

    const server = app.listen(port, () => {
        onMessage(false, "Started Webserver")
    });
}
import { createLauncher, Secret } from "../index.js";
import { randomBytes } from "node:crypto";
import express from "express";

/**
 * Generates a random token of specified length.
 * @param {number} [length=56] - The length of the token to be generated.
 * @returns {string} A random token as a hexadecimal string.
 */
function generateToken(length = 30) {
    return Buffer.from(randomBytes(length)).toString('hex');
}

/**
 * Starts an Express server and defines two routes: /health and /unlock.
 * @param {object} secrets - An object containing secret values.
 */
function runServer(secrets) {
    const app = express();
    app.get('/health', (req, res) => {
        res.json({
            "status": "OK"
        })
    });
    app.get('/unlock', (req, res) => {
        res.send(`This is an example application!<br>It started recieving followng secrets: ${JSON.stringify(secrets)}`)
    });
    const server = app.listen(3000, () => {
    });
}

createLauncher(
    [
        new Secret("DATABASE_KEY", () => generateToken())
    ], "database-secrets.txt", 3000, () => {
        const password = generateToken(10)
        console.log(`Launcher initiated with new password: ${password}`)
        return password;
    }, (secrets) => {
        console.log("Starting main service ...")
        runServer(secrets)
    }, (secrets) => {

    }, (isError, ...message) => {
        if (isError)
            console.error(message.join(" "))
        else
            console.log(message.join(" "))
    }, new URL("http://localhost:3000/health")
)

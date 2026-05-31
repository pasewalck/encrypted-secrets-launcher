import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Var, Secrets } from './secrets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export { Var };

/**
 * @callback onMessage
 * @param {boolean} isError
 * @param {...string} text
 */

/**
 * @callback onReturnSecrets
 * @param {map} secrets
 */

/**
 * Closes a http Server (closes all connections to make sure close is quick).
 * @param {import("http").Server} server - The server to close.
 * @param {Function} callback - The callback for closing server.
 * @param {onMessage} onMessage - The callback for messages.
 * @param {number} waitSeconds - The time inseconds to wait before closing connection.
 */
function closeServer(server, onComplete, onMessage, waitSeconds = 0) {
	if (waitSeconds <= 0) {
		onMessage(false, 'Stopping Webserver');
		server.close(
			() => {
				onMessage(false, 'Stopped Webserver');
				onComplete();
			},
			(error) => {
				if (error) {
					onMessage(true, 'Error stopping Webserver: ', error);
				}
				closeServer(server, onComplete, onMessage, 5);
			}
		);
		server.closeAllConnections();
	} else {
		onMessage(false, 'Stopping Webserver in', waitSeconds, 'seconds');
		setTimeout(() => {
			closeServer(server, onComplete, onMessage);
		}, 1000 * waitSeconds);
	}
}

/**
 * Creates an Express server that handles password input and manages secrets.
 * @param {Array<Var>} vars - An array of environment variable definitions.
 * @param {Object} options - Options object.
 * @param {string} options.filepath - The path to the secrets file.
 * @param {string} options.legacyFilepath - The path to the legacy secrets file.
 * @param {number} options.port - The port on which the server will listen.
 * @param {Function} options.generatePasswort - The function to generate a primary password if none is setup.
 * @param {onReturnSecrets} options.onComplete - The function to run on complete.
 * @param {onReturnSecrets} options.onUnlock - The function to run on unlock (webserver will still be running).
 * @param {onMessage} options.onMessage - The function to use for messages.
 * @param {string} options.healthCheckUrl - The health check url for launcher application to check against.
 */
export function createLauncher(vars, options) {
	const { filepath, legacyFilepath, port, generatePasswort, onComplete, onUnlock, onMessage, healthCheckUrl } =
		options;
	const secrets = new Secrets(filepath, vars, legacyFilepath);

	if (secrets.getIsInit()) {
		const psw = generatePasswort();
		secrets.open(psw);
		secrets.close();
	}

	const app = express();
	let isRunning = false;
	let server = null;

	app.set('view engine', 'ejs');
	app.set('views', path.join(__dirname, '..', 'views'));

	app.use(express.urlencoded({ extended: true }));
	app.use('/public', express.static(path.join(__dirname, '..', 'public')));

	app.get(/^(?!\/unlock|\/public).+/, (req, res) => {
		if (!secrets.getIsOpen()) {
			res.render('index');
		} else {
			res.render('starting', { healthCheckUrl });
		}
	});

	app.get('/unlock', (req, res) => {
		res.render('unlock');
	});

	app.post('/unlock', (req, res) => {
		if (secrets.getIsOpen()) {
			res.render('starting', { healthCheckUrl });
		} else {
			const password = req.body.password;
			onMessage(false, 'Password received from Frontend');

			try {
				secrets.open(password);

				onMessage(false, 'Unlock successful');
				if (onUnlock) onUnlock(secrets.getSecrets());

				if (isRunning)
					closeServer(
						server,
						() => {
							onMessage(false, 'Successfully completed');
							if (onComplete) onComplete(secrets.getSecrets());
						},
						onMessage,
						3
					);
				else {
					onMessage(false, 'Successfully completed');
					if (onComplete) onComplete(secrets.getSecrets());
				}

				res.render('starting', { healthCheckUrl });
			} catch (error) {
				if (
					error.message.includes('bad decrypt') ||
					error.message.includes('Unsupported state or unable to authenticate data')
				) {
					onMessage(false, 'Unlock failed. Bad Password.');
					res.status(500).render('error');
				} else {
					onMessage(true, 'An unexpected Error occurred:', error);
					res.status(500).send('An unexpected Error occurred.');
				}
			}
		}
	});

	const runLauncherServer = () => {
		server = app.listen(port, () => {
			onMessage(false, 'Started Webserver');
			isRunning = true;
		});
	};

	return { app, runLauncherServer };
}

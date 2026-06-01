import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Var, Secrets } from './secrets.js';
import { createController } from './controller.js';
import { createRouter } from './router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export { Var };

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
	if (!options) {
		throw new Error('options object is required');
	}

	const { filepath, legacyFilepath, port, generatePasswort, onComplete, onUnlock, onMessage, healthCheckUrl } =
		options;

	if (!filepath) {
		throw new Error('options.filepath is required');
	}
	if (port == null) {
		throw new Error('options.port is required');
	}
	if (!generatePasswort) {
		throw new Error('options.generatePasswort is required');
	}
	if (!onMessage) {
		throw new Error('options.onMessage is required');
	}

	const secrets = new Secrets(filepath, vars, legacyFilepath);

	if (secrets.getIsInit()) {
		const psw = generatePasswort();
		secrets.open(psw);
		secrets.close();
	}

	const app = express();
	const serverRef = { current: null };
	const isRunningRef = { current: false };

	app.set('view engine', 'ejs');
	app.set('views', path.join(__dirname, '..', 'views'));

	app.use(express.urlencoded({ extended: true }));
	app.use('/public', express.static(path.join(__dirname, '..', 'public')));

	const controller = createController(secrets, {
		onMessage,
		onUnlock,
		onComplete,
		isRunningRef,
		serverRef,
		healthCheckUrl,
	});

	const router = createRouter(controller);
	app.use(router);

	const runLauncherServer = () => {
		serverRef.current = app.listen(port, () => {
			onMessage(false, 'Started Webserver');
			isRunningRef.current = true;
		});
	};

	return { app, runLauncherServer };
}

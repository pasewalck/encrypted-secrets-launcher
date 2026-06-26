import { BadPasswordError } from './errors/bad-password.error.js';
import { closeServer } from './util/close-server.js';

class SecretService {
	constructor(secrets, options) {
		this.secrets = secrets;
		this.onMessage = options.onMessage;
		this.onUnlock = options.onUnlock;
		this.onComplete = options.onComplete;
		this.isRunningRef = options.isRunningRef;
		this.serverRef = options.serverRef;
	}

	getIsOpen() {
		return this.secrets.getIsOpen();
	}

	getSecrets() {
		return this.secrets.getSecrets();
	}

	unlock(password) {
		this.onMessage(false, 'Password received from Frontend');

		this.secrets.open(password);

		this.onMessage(false, 'Unlock successful');
		if (this.onUnlock) this.onUnlock(this.secrets.getSecrets());

		if (this.isRunningRef.current)
			closeServer(
				this.serverRef.current,
				() => {
					this.onMessage(false, 'Successfully completed');
					if (this.onComplete) this.onComplete(this.secrets.getSecrets());
				},
				this.onMessage,
				3
			);
		else {
			this.onMessage(false, 'Successfully completed');
			if (this.onComplete) this.onComplete(this.secrets.getSecrets());
		}
	}
}

export function createController(secrets, options) {
	const { onMessage, healthCheckUrl } = options;

	const service = new SecretService(secrets, options);

	function handleCatchAll(req, res) {
		if (!service.getIsOpen()) {
			res.render('index');
		} else {
			res.render('starting', { healthCheckUrl });
		}
	}

	function handleUnlockGet(req, res) {
		res.render('unlock');
	}

	function handleUnlockPost(req, res) {
		if (service.getIsOpen()) {
			res.render('starting', { healthCheckUrl });
			return;
		}

		try {
			service.unlock(req.body.password);
			res.render('starting', { healthCheckUrl });
		} catch (error) {
			if (error instanceof BadPasswordError) {
				onMessage(false, 'Unlock failed. Bad Password.');
				res.status(500).render('error');
			} else {
				onMessage(true, 'An unexpected Error occurred:', error);
				res.status(500).send('An unexpected Error occurred.');
			}
		}
	}

	function handleApiStatus(req, res) {
		res.json({ status: service.getIsOpen() ? 'unlocked' : 'locked' });
	}

	function handleApiUnlock(req, res) {
		if (service.getIsOpen()) {
			res.json({ status: 'unlocked' });
			return;
		}

		try {
			service.unlock(req.body.password);
			res.json({ status: 'unlocked' });
		} catch (error) {
			if (error instanceof BadPasswordError || error.message === 'Bad password') {
				onMessage(false, 'Unlock failed. Bad Password.');
				res.status(401).json({ error: 'Bad password' });
			} else {
				onMessage(true, 'An unexpected Error occurred:', error);
				res.status(500).json({ error: 'An unexpected error occurred' });
			}
		}
	}

	return { handleCatchAll, handleUnlockGet, handleUnlockPost, handleApiStatus, handleApiUnlock };
}

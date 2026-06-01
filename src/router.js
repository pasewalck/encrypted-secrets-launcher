import { Router } from 'express';

/**
 * Creates an Express Router with the launcher routes.
 * @param {object} controller - Controller object with handler functions.
 * @param {Function} controller.handleCatchAll
 * @param {Function} controller.handleUnlockGet
 * @param {Function} controller.handleUnlockPost
 * @param {Function} controller.handleApiStatus
 * @param {Function} controller.handleApiUnlock
 * @returns {import('express').Router}
 */
export function createRouter(controller) {
	const router = Router();

	router.get(/^(?!\/unlock|\/public|\/api).+/, controller.handleCatchAll);
	router.get('/unlock', controller.handleUnlockGet);
	router.post('/unlock', controller.handleUnlockPost);
	router.get('/api/status', controller.handleApiStatus);
	router.post('/api/unlock', controller.handleApiUnlock);

	return router;
}

import { Router } from 'express';

/**
 * Creates an Express Router with the launcher routes.
 * @param {object} controller - Controller object with handler functions.
 * @param {Function} controller.handleCatchAll
 * @param {Function} controller.handleUnlockGet
 * @param {Function} controller.handleUnlockPost
 * @returns {import('express').Router}
 */
export function createRouter(controller) {
	const router = Router();

	router.get(/^(?!\/unlock|\/public).+/, controller.handleCatchAll);
	router.get('/unlock', controller.handleUnlockGet);
	router.post('/unlock', controller.handleUnlockPost);

	return router;
}

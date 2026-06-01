export class BadPasswordError extends Error {
	constructor() {
		super('Bad password');
	}
}

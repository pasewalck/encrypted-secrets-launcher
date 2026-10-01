export class DataTamperError extends Error {
	constructor() {
		super('Datafile is corrupted or has been tampered with.');
	}
}

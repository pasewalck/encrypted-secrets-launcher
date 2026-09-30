export class KeySlotRemoveError extends Error {
	constructor() {
		super('A minimum of one keyslot is required!');
	}
}

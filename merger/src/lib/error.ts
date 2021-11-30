// https://stackoverflow.com/a/60250733
export class BaseError extends Error {
    constructor(message?: string) {
        const trueProto = new.target.prototype;
        super(message);
        Object.setPrototypeOf(this, trueProto);
    }
}

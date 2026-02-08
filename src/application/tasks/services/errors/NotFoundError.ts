export class NotFoundError extends Error {
    constructor(message: string, public readonly resource: string) {
        super(message);
        this.name = "NotFoundError";
    }
}

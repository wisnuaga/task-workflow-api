export class ConflictError extends Error {
    constructor(message: string, public readonly expectedVersion?: number, public readonly actualVersion?: number) {
        super(message);
        this.name = "ConflictError";
    }
}

import Fastify, { FastifyInstance } from "fastify";

export function buildApp(): FastifyInstance {
    const app: FastifyInstance = Fastify({
        logger: true,
    });

    app.get("/health", async () => {
        return { ok: true };
    });

    return app;
}
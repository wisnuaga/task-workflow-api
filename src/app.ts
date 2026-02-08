import Fastify, { FastifyInstance } from "fastify";
import { PostgresDBClient } from "./infrastructure/db/PostgresDBClient";
import { TaskRepository } from "./infrastructure/db/repositories/TaskRepository";
import { TaskEventRepository } from "./infrastructure/db/repositories/TaskEventRepository";
import { IdempotencyRepository } from "./infrastructure/db/repositories/IdempotencyRepository";
import { TaskUseCase } from "./application/tasks/usecases/TaskUseCase";
import { TaskService } from "./application/tasks/services/TaskService";
import { TaskHandler } from "./interfaces/http/handlers/TaskHandler";
import { taskRoutes } from "./interfaces/http/routes/taskRoutes";

export function buildApp(): FastifyInstance {
    const app: FastifyInstance = Fastify({
        logger: true,
    });

    // Determine database configuration based on environment
    // For now, using defaults or env vars would be ideal. 
    // Assuming DB_URL or similar is set, or defaulting to localhost for dev.
    // In a real app, this config should come from a config module.
    const dbClient = new PostgresDBClient({
        user: process.env.DB_USER || "postgres",
        host: process.env.DB_HOST || "localhost",
        database: process.env.DB_NAME || "task_workflow",
        password: process.env.DB_PASSWORD || "postgres",
        port: parseInt(process.env.DB_PORT || "5432"),
    });

    // Dependency Injection
    const taskRepository = new TaskRepository(dbClient);
    const taskEventRepository = new TaskEventRepository(dbClient);
    const idempotencyRepository = new IdempotencyRepository(dbClient);
    const taskUseCase = new TaskUseCase(taskRepository, taskEventRepository, idempotencyRepository, dbClient);
    const taskService = new TaskService(taskUseCase);
    const taskHandler = new TaskHandler(taskService);

    // Register Routes
    app.register(taskRoutes, { taskHandler });

    app.get("/health", async () => {
        return { status: "ok" };
    });

    return app;
}
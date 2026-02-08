import { FastifyInstance } from "fastify";
import { TaskHandler } from "../handlers/TaskHandler";

export async function taskRoutes(fastify: FastifyInstance, options: { taskHandler: TaskHandler }) {
    const { taskHandler } = options;

    fastify.post("/v1/workspaces/:workspaceId/tasks", async (request, reply) => {
        return taskHandler.createTask(request, reply);
    });
}

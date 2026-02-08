import { FastifyRequest, FastifyReply } from "fastify";
import { ITaskService } from "../../../application/tasks/services/ITaskService";
import { CreateTaskInput } from "../../../application/tasks/dto/CreateTaskInput";
import { ValidationError } from "../../../application/tasks/services/errors/ValidationError";
import { TaskPriority } from "../../../domain/tasks/entities/TaskPriority";
import { UserRole } from "../../../domain/users/entities/UserRole";

export class TaskHandler {
    constructor(private readonly taskService: ITaskService) { }

    async createTask(request: FastifyRequest, reply: FastifyReply) {
        try {
            const body = request.body as any;
            const headers = request.headers;
            const params = request.params as any;
            const roleHeader = headers["x-role"] as string;
            let role: UserRole = UserRole.UNSPECIFIED;

            if (roleHeader) {
                // Simple mapping, assuming header sends "Agent" or "Manager" (case-insensitive)
                const normalizedRole = roleHeader.toUpperCase();
                if (normalizedRole === "AGENT") {
                    role = UserRole.AGENT;
                } else if (normalizedRole === "MANAGER") {
                    role = UserRole.MANAGER;
                }
            }

            const input: CreateTaskInput = {
                tenantId: headers["x-tenant-id"] as string,
                workspaceId: params.workspaceId,
                title: body?.title,
                priority: body?.priority as TaskPriority,
                idempotencyKey: headers["idempotency-key"] as string,
                role,
            };

            const result = await this.taskService.createTask(input);

            return reply.code(201).send(result);
        } catch (error) {
            if (error instanceof ValidationError) {
                return reply.code(400).send({
                    error: "Bad Request",
                    message: error.message,
                    field: error.field,
                });
            }

            // Log unexpected errors
            request.log.error(error);
            return reply.code(500).send({
                error: "Internal Server Error",
                message: "An unexpected error occurred",
            });
        }
    }
}

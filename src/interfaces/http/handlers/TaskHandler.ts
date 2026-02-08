import { FastifyRequest, FastifyReply } from "fastify";
import { ITaskService } from "../../../application/tasks/services/ITaskService";
import { CreateTaskInput } from "../../../application/tasks/dto/CreateTaskInput";
import { AssignTaskInput } from "../../../application/tasks/dto/AssignTaskInput";
import { ValidationError } from "../../../application/tasks/services/errors/ValidationError";
import { AuthorizationError } from "../../../application/tasks/services/errors/AuthorizationError";
import { NotFoundError } from "../../../application/tasks/services/errors/NotFoundError";
import { ConflictError } from "../../../application/tasks/services/errors/ConflictError";
import { TaskPriority } from "../../../domain/tasks/entities/TaskPriority";
import { UserRole } from "../../../domain/users/entities/UserRole";
import { serializeTask } from "../utils/responseSerializer";

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

            return reply.code(201).send({ task: serializeTask(result.task) });
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

    async assignTask(request: FastifyRequest, reply: FastifyReply) {
        try {
            const body = request.body as any;
            const headers = request.headers;
            const params = request.params as any;

            // Extract and validate role
            const roleHeader = headers["x-role"] as string;
            let role: UserRole = UserRole.UNSPECIFIED;

            if (roleHeader) {
                const normalizedRole = roleHeader.toUpperCase();
                if (normalizedRole === "AGENT") {
                    role = UserRole.AGENT;
                } else if (normalizedRole === "MANAGER") {
                    role = UserRole.MANAGER;
                }
            }

            // Extract and validate version
            const versionHeader = headers["if-match-version"] as string;
            if (!versionHeader) {
                return reply.code(400).send({
                    error: "Bad Request",
                    message: "If-Match-Version header is required",
                    field: "if-match-version",
                });
            }

            const expectedVersion = parseInt(versionHeader, 10);
            if (isNaN(expectedVersion)) {
                return reply.code(400).send({
                    error: "Bad Request",
                    message: "If-Match-Version must be a valid number",
                    field: "if-match-version",
                });
            }

            const input: AssignTaskInput = {
                taskId: params.taskId,
                tenantId: headers["x-tenant-id"] as string,
                workspaceId: params.workspaceId,
                assigneeId: body?.assignee_id,
                expectedVersion,
                role,
                idempotencyKey: headers["idempotency-key"] as string,
            };

            const result = await this.taskService.assignTask(input);

            return reply.code(200).send({ task: serializeTask(result.task) });
        } catch (error) {
            if (error instanceof AuthorizationError) {
                return reply.code(403).send({
                    error: "Forbidden",
                    message: error.message,
                });
            }

            if (error instanceof NotFoundError) {
                return reply.code(404).send({
                    error: "Not Found",
                    message: error.message,
                    resource: error.resource,
                });
            }

            if (error instanceof ConflictError) {
                return reply.code(409).send({
                    error: "Conflict",
                    message: error.message,
                    expectedVersion: error.expectedVersion,
                    actualVersion: error.actualVersion,
                });
            }

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

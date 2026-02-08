import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskHandler } from "../../../../src/interfaces/http/handlers/TaskHandler";
import { ITaskService } from "../../../../src/application/tasks/services/ITaskService";
import { ValidationError } from "../../../../src/application/tasks/services/errors/ValidationError";
import { TaskPriority } from "../../../../src/domain/tasks/entities/TaskPriority";
import { TaskState } from "../../../../src/domain/tasks/entities/TaskState";
import { UserRole } from "../../../../src/domain/users/entities/UserRole";

describe("TaskHandler", () => {
    let handler: TaskHandler;
    let mockService: ITaskService;
    let mockRequest: any;
    let mockReply: any;

    beforeEach(() => {
        mockService = {
            createTask: vi.fn(),
            assignTask: vi.fn(),
        };
        handler = new TaskHandler(mockService);

        mockRequest = {
            headers: {},
            params: {},
            body: {},
            log: {
                error: vi.fn(),
            },
        };

        mockReply = {
            code: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis(),
        };
    });

    describe("createTask", () => {
        it("should create task and return 201", async () => {
            // Arrange
            mockRequest.headers["x-tenant-id"] = "tenant-1";
            mockRequest.params.workspaceId = "workspace-1";
            mockRequest.body = {
                title: "Test Task",
                priority: "HIGH",
            };

            const createdTaskOutput = {
                task: {
                    id: "1",
                    tenantId: "tenant-1",
                    workspaceId: "workspace-1",
                    title: "Test Task",
                    priority: TaskPriority.HIGH,
                    state: TaskState.NEW,
                    assigneeId: null,
                    version: 1,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            };

            vi.mocked(mockService.createTask).mockResolvedValue(createdTaskOutput);

            // Act
            await handler.createTask(mockRequest, mockReply);

            // Assert
            expect(mockService.createTask).toHaveBeenCalledWith({
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                title: "Test Task",
                priority: "HIGH",
                idempotencyKey: undefined,
                role: UserRole.UNSPECIFIED,
            });
            expect(mockReply.code).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith({
                task: {
                    id: "1",
                    tenant_id: "tenant-1",
                    workspace_id: "workspace-1",
                    title: "Test Task",
                    priority: "HIGH",
                    state: "NEW",
                    assignee_id: null,
                    version: 1,
                    created_at: createdTaskOutput.task.createdAt.toISOString(),
                    updated_at: createdTaskOutput.task.updatedAt.toISOString(),
                },
            });
        });

        it("should return 400 on ValidationError", async () => {
            // Arrange
            const error = new ValidationError("Invalid input", "title");
            vi.mocked(mockService.createTask).mockRejectedValue(error);

            // Act
            await handler.createTask(mockRequest, mockReply);

            // Assert
            expect(mockReply.code).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: "Bad Request",
                message: "Invalid input",
                field: "title",
            });
        });

        it("should return 500 on unexpected error", async () => {
            // Arrange
            const error = new Error("Unexpected database error");
            vi.mocked(mockService.createTask).mockRejectedValue(error);

            // Act
            await handler.createTask(mockRequest, mockReply);

            // Assert
            expect(mockRequest.log.error).toHaveBeenCalledWith(error);
            expect(mockReply.code).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: "Internal Server Error",
                message: "An unexpected error occurred",
            });
        });

        it("should pass idempotency key header", async () => {
            // Arrange
            mockRequest.headers["x-tenant-id"] = "tenant-1";
            mockRequest.params.workspaceId = "workspace-1";
            mockRequest.body = { title: "Test Task" };
            mockRequest.headers["idempotency-key"] = "key-123";

            vi.mocked(mockService.createTask).mockResolvedValue({ task: {} as any });

            // Act
            await handler.createTask(mockRequest, mockReply);

            // Assert
            expect(mockService.createTask).toHaveBeenCalledWith(
                expect.objectContaining({
                    idempotencyKey: "key-123",
                })
            );
        });

        it("should parse x-role header and pass to service", async () => {
            // Arrange
            mockRequest.headers["x-tenant-id"] = "tenant-1";
            mockRequest.params.workspaceId = "workspace-1";
            mockRequest.body = { title: "Test Task" };
            mockRequest.headers["x-role"] = "Agent";

            vi.mocked(mockService.createTask).mockResolvedValue({ task: {} as any });

            // Act
            await handler.createTask(mockRequest, mockReply);

            // Assert
            expect(mockService.createTask).toHaveBeenCalledWith(
                expect.objectContaining({
                    role: UserRole.AGENT,
                })
            );
        });
    });

    describe("assignTask", () => {
        beforeEach(() => {
            mockService.assignTask = vi.fn();
        });

        it("should assign task and return 200 with snake_case response", async () => {
            // Arrange
            mockRequest.headers["x-tenant-id"] = "tenant-1";
            mockRequest.headers["x-role"] = "MANAGER";
            mockRequest.params.workspaceId = "workspace-1";
            mockRequest.params.taskId = "task-1";
            mockRequest.headers["if-match-version"] = "1";
            mockRequest.body = {
                assignee_id: "user-1",
            };

            const assignedTaskOutput = {
                task: {
                    id: "task-1",
                    tenantId: "tenant-1",
                    workspaceId: "workspace-1",
                    title: "Test Task",
                    priority: TaskPriority.HIGH,
                    state: TaskState.NEW,
                    assigneeId: "user-1",
                    version: 2,
                    createdAt: new Date("2024-01-01T00:00:00Z"),
                    updatedAt: new Date("2024-01-01T00:00:00Z"),
                },
            };

            vi.mocked(mockService.assignTask).mockResolvedValue(assignedTaskOutput);

            // Act
            await handler.assignTask(mockRequest, mockReply);

            // Assert
            expect(mockService.assignTask).toHaveBeenCalledWith({
                taskId: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                assigneeId: "user-1",
                expectedVersion: 1,
                idempotencyKey: undefined,
                role: UserRole.MANAGER,
            });
            expect(mockReply.code).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({
                task: {
                    id: "task-1",
                    tenant_id: "tenant-1",
                    workspace_id: "workspace-1",
                    title: "Test Task",
                    priority: "HIGH",
                    state: "NEW",
                    assignee_id: "user-1",
                    version: 2,
                    created_at: "2024-01-01T00:00:00.000Z",
                    updated_at: "2024-01-01T00:00:00.000Z",
                },
            });
        });

        it("should return 403 on AuthorizationError", async () => {
            // Arrange
            const { AuthorizationError } = await import("../../../../src/application/tasks/services/errors/AuthorizationError");
            const error = new AuthorizationError("Only managers can assign tasks");
            vi.mocked(mockService.assignTask).mockRejectedValue(error);

            mockRequest.headers["x-tenant-id"] = "tenant-1";
            mockRequest.params.workspaceId = "workspace-1";
            mockRequest.params.taskId = "task-1";
            mockRequest.headers["if-match-version"] = "1";
            mockRequest.body = { assigneeId: "user-1" };

            // Act
            await handler.assignTask(mockRequest, mockReply);

            // Assert
            expect(mockReply.code).toHaveBeenCalledWith(403);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: "Forbidden",
                message: "Only managers can assign tasks",
            });
        });

        it("should return 404 on NotFoundError", async () => {
            // Arrange
            const { NotFoundError } = await import("../../../../src/application/tasks/services/errors/NotFoundError");
            const error = new NotFoundError("Task not found", "task");
            vi.mocked(mockService.assignTask).mockRejectedValue(error);

            mockRequest.headers["x-tenant-id"] = "tenant-1";
            mockRequest.params.workspaceId = "workspace-1";
            mockRequest.params.taskId = "non-existent";
            mockRequest.headers["if-match-version"] = "1";
            mockRequest.body = { assigneeId: "user-1" };

            // Act
            await handler.assignTask(mockRequest, mockReply);

            // Assert
            expect(mockReply.code).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: "Not Found",
                message: "Task not found",
                resource: "task",
            });
        });

        it("should return 409 on ConflictError", async () => {
            // Arrange
            const { ConflictError } = await import("../../../../src/application/tasks/services/errors/ConflictError");
            const error = new ConflictError("Version mismatch", 1, 2);
            vi.mocked(mockService.assignTask).mockRejectedValue(error);

            mockRequest.headers["x-tenant-id"] = "tenant-1";
            mockRequest.params.workspaceId = "workspace-1";
            mockRequest.params.taskId = "task-1";
            mockRequest.headers["if-match-version"] = "1";
            mockRequest.body = { assigneeId: "user-1" };

            // Act
            await handler.assignTask(mockRequest, mockReply);

            // Assert
            expect(mockReply.code).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: "Conflict",
                message: "Version mismatch",
                expectedVersion: 1,
                actualVersion: 2,
            });
        });

        it("should return 400 on ValidationError", async () => {
            // Arrange
            const error = new ValidationError("assigneeId is required", "assigneeId");
            vi.mocked(mockService.assignTask).mockRejectedValue(error);

            mockRequest.headers["x-tenant-id"] = "tenant-1";
            mockRequest.params.workspaceId = "workspace-1";
            mockRequest.params.taskId = "task-1";
            mockRequest.headers["if-match-version"] = "1";
            mockRequest.body = {};

            // Act
            await handler.assignTask(mockRequest, mockReply);

            // Assert
            expect(mockReply.code).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: "Bad Request",
                message: "assigneeId is required",
                field: "assigneeId",
            });
        });

        it("should return 500 on unexpected error", async () => {
            // Arrange
            const error = new Error("Unexpected database error");
            vi.mocked(mockService.assignTask).mockRejectedValue(error);

            mockRequest.headers["x-tenant-id"] = "tenant-1";
            mockRequest.params.workspaceId = "workspace-1";
            mockRequest.params.taskId = "task-1";
            mockRequest.headers["if-match-version"] = "1";
            mockRequest.body = { assigneeId: "user-1" };

            // Act
            await handler.assignTask(mockRequest, mockReply);

            // Assert
            expect(mockReply.code).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: "Internal Server Error",
                message: "An unexpected error occurred",
            });
            expect(mockRequest.log.error).toHaveBeenCalledWith(error);
        });
    });
});

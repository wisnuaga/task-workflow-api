import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskHandler } from "../../../../src/interfaces/http/handlers/TaskHandler";
import { ITaskService } from "../../../../src/application/tasks/services/ITaskService";
import { ValidationError } from "../../../../src/application/tasks/services/errors/ValidationError";
import { TaskPriority } from "../../../../src/domain/tasks/entities/TaskPriority";
import { TaskState } from "../../../../src/domain/tasks/entities/TaskState";

describe("TaskHandler", () => {
    let handler: TaskHandler;
    let mockService: ITaskService;
    let mockRequest: any;
    let mockReply: any;

    beforeEach(() => {
        mockService = {
            createTask: vi.fn(),
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
            });
            expect(mockReply.code).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith(createdTaskOutput);
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
    });
});

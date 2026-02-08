import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskUseCase } from "../../../src/application/tasks/usecases/TaskUseCase";
import { ITaskRepository } from "../../../src/domain/tasks/repositories/ITaskRepository";
import { TaskState } from "../../../src/domain/tasks/entities/TaskState";
import { TaskPriority } from "../../../src/domain/tasks/entities/TaskPriority";
import { Task } from "../../../src/domain/tasks/entities/Task";
import { ITaskEventRepository } from "../../../src/domain/tasks/repositories/ITaskEventRepository";
import { IIdempotencyRepository } from "../../../src/domain/idempotency/repositories/IIdempotencyRepository";
import { IDBClient } from "../../../src/application/interfaces/db/IDBClient";

describe("TaskUseCase", () => {
    let useCase: TaskUseCase;
    let mockRepository: ITaskRepository;
    let mockTaskEventRepository: ITaskEventRepository;
    let mockDb: IDBClient;

    let mockIdempotencyRepository: IIdempotencyRepository;

    beforeEach(() => {
        mockRepository = {
            create: vi.fn(),
            findById: vi.fn(),
            assignTask: vi.fn(),
        };
        mockTaskEventRepository = {
            create: vi.fn(),
        };
        mockIdempotencyRepository = {
            findByKey: vi.fn(),
            create: vi.fn(),
        };
        mockDb = {
            query: vi.fn(),
            transaction: vi.fn().mockImplementation(async (cb) => cb(mockDb)),
        } as unknown as IDBClient;

        useCase = new TaskUseCase(mockRepository, mockTaskEventRepository, mockIdempotencyRepository, mockDb);
    });

    describe("create", () => {
        it("should delegate to repository and return created task", async () => {
            // Arrange
            const taskInput = {
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                title: "Test Task",
                priority: TaskPriority.HIGH,
                state: TaskState.NEW,
            };

            const createdTask: Task = {
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
            };

            vi.mocked(mockRepository.create).mockResolvedValue(createdTask);

            // Act
            const result = await useCase.create(taskInput);

            // Assert
            expect(mockRepository.create).toHaveBeenCalledTimes(1);
            expect(mockRepository.create).toHaveBeenCalledWith(taskInput, mockDb);
            // Verify event creation
            expect(mockTaskEventRepository.create).toHaveBeenCalledWith({
                tenantId: createdTask.tenantId,
                workspaceId: createdTask.workspaceId,
                taskId: createdTask.id,
                snapshot: createdTask
            }, mockDb);
            expect(result).toEqual(createdTask);
        });

        it("should propagate repository errors", async () => {
            // Arrange
            const taskInput = {
                tenantId: "tenant-2",
                workspaceId: "workspace-2",
                title: "Error Task",
                priority: TaskPriority.MEDIUM,
                state: TaskState.NEW,
            };

            const error = new Error("Database error");
            vi.mocked(mockRepository.create).mockRejectedValue(error);

            // Act & Assert
            await expect(useCase.create(taskInput)).rejects.toThrow("Database error");
        });

        it("should return cached task when idempotency key exists", async () => {
            // Arrange
            const taskInput = {
                tenantId: "tenant-3",
                workspaceId: "workspace-3",
                title: "Idempotency Task",
                priority: TaskPriority.LOW,
                state: TaskState.NEW,
            };
            const idempotencyKey = "key-123";

            const cachedTask: Task = {
                id: "2",
                tenantId: "tenant-3",
                workspaceId: "workspace-3",
                title: "Idempotency Task",
                priority: TaskPriority.LOW,
                state: TaskState.NEW,
                assigneeId: null,
                version: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            vi.mocked(mockIdempotencyRepository.findByKey).mockResolvedValue({
                id: "idempotency-1",
                tenantId: "tenant-3",
                workspaceId: "workspace-3",
                action: 1,
                key: idempotencyKey,
                referenceId: "2",
                referenceType: 1,
                requestFingerprint: "fingerprint",
                responseSnapshot: cachedTask,
                createdAt: new Date(),
                expiredAt: new Date(),
            });

            // Act
            const result = await useCase.create(taskInput, idempotencyKey);

            // Assert
            expect(mockIdempotencyRepository.findByKey).toHaveBeenCalledWith(
                taskInput.tenantId,
                taskInput.workspaceId,
                expect.anything(), // Action
                idempotencyKey,
                mockDb
            );
            expect(mockRepository.create).not.toHaveBeenCalled();
            expect(result).toEqual(cachedTask);
        });

        it("should create new task and save idempotency key when key is new", async () => {
            // Arrange
            const taskInput = {
                tenantId: "tenant-4",
                workspaceId: "workspace-4",
                title: "New Idempotency Task",
                priority: TaskPriority.HIGH,
                state: TaskState.NEW,
            };
            const idempotencyKey = "key-456";

            const createdTask: Task = {
                id: "3",
                tenantId: "tenant-4",
                workspaceId: "workspace-4",
                title: "New Idempotency Task",
                priority: TaskPriority.HIGH,
                state: TaskState.NEW,
                assigneeId: null,
                version: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            vi.mocked(mockIdempotencyRepository.findByKey).mockResolvedValue(null);
            vi.mocked(mockRepository.create).mockResolvedValue(createdTask);

            // Act
            const result = await useCase.create(taskInput, idempotencyKey);

            // Assert
            expect(mockIdempotencyRepository.findByKey).toHaveBeenCalled();
            expect(mockRepository.create).toHaveBeenCalled();
            expect(mockIdempotencyRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    key: idempotencyKey,
                    responseSnapshot: createdTask
                }),
                mockDb
            );
            expect(result).toEqual(createdTask);
        });
    });

    describe("assign", () => {
        beforeEach(() => {
            mockRepository.findById = vi.fn();
            mockRepository.assignTask = vi.fn();
        });

        it("should assign task successfully", async () => {
            // Arrange
            const input = {
                taskId: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                assigneeId: "user-1",
                expectedVersion: 1,
            };

            const existingTask: Task = {
                id: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                title: "Test Task",
                priority: TaskPriority.HIGH,
                state: TaskState.NEW,
                assigneeId: null,
                version: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const assignedTask: Task = {
                ...existingTask,
                assigneeId: "user-1",
                version: 2,
            };

            vi.mocked(mockIdempotencyRepository.findByKey).mockResolvedValue(null);
            vi.mocked(mockRepository.findById).mockResolvedValue(existingTask);
            vi.mocked(mockRepository.assignTask).mockResolvedValue(assignedTask);

            // Act
            const result = await useCase.assign(input);

            // Assert
            expect(mockRepository.findById).toHaveBeenCalledWith(input.taskId, input.tenantId, input.workspaceId, mockDb);
            expect(mockRepository.assignTask).toHaveBeenCalledWith(
                input.taskId,
                input.assigneeId,
                input.expectedVersion,
                input.tenantId,
                input.workspaceId,
                mockDb
            );
            expect(mockTaskEventRepository.create).toHaveBeenCalledWith({
                tenantId: assignedTask.tenantId,
                workspaceId: assignedTask.workspaceId,
                taskId: assignedTask.id,
                snapshot: assignedTask,
            }, mockDb);
            expect(result).toEqual(assignedTask);
        });

        it("should throw error when task not found", async () => {
            // Arrange
            const input = {
                taskId: "non-existent",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                assigneeId: "user-1",
                expectedVersion: 1,
            };

            vi.mocked(mockIdempotencyRepository.findByKey).mockResolvedValue(null);
            vi.mocked(mockRepository.findById).mockResolvedValue(null);

            // Act & Assert
            await expect(useCase.assign(input)).rejects.toThrow("Task with id non-existent not found");
        });

        it("should throw error when task state is COMPLETED", async () => {
            // Arrange
            const input = {
                taskId: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                assigneeId: "user-1",
                expectedVersion: 1,
            };

            const completedTask: Task = {
                id: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                title: "Completed Task",
                priority: TaskPriority.HIGH,
                state: 3, // DONE
                assigneeId: "old-user",
                version: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            vi.mocked(mockIdempotencyRepository.findByKey).mockResolvedValue(null);
            vi.mocked(mockRepository.findById).mockResolvedValue(completedTask);

            // Act & Assert
            await expect(useCase.assign(input)).rejects.toThrow("Cannot assign task in state");
        });

        it("should handle version conflict error", async () => {
            // Arrange
            const input = {
                taskId: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                assigneeId: "user-1",
                expectedVersion: 1,
            };

            const existingTask: Task = {
                id: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                title: "Test Task",
                priority: TaskPriority.HIGH,
                state: TaskState.NEW,
                assigneeId: null,
                version: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            vi.mocked(mockIdempotencyRepository.findByKey).mockResolvedValue(null);
            vi.mocked(mockRepository.findById).mockResolvedValue(existingTask);
            vi.mocked(mockRepository.assignTask).mockRejectedValue(new Error("version mismatch or task not found"));

            // Act & Assert
            await expect(useCase.assign(input)).rejects.toThrow("Version mismatch");
        });

        it("should return cached result when idempotency key exists", async () => {
            // Arrange
            const idempotencyKey = "idempotency-key-123";
            const input = {
                taskId: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                assigneeId: "user-1",
                expectedVersion: 1,
            };

            const cachedTask: Task = {
                id: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                title: "Cached Task",
                priority: TaskPriority.HIGH,
                state: TaskState.NEW,
                assigneeId: "user-1",
                version: 2,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            vi.mocked(mockIdempotencyRepository.findByKey).mockResolvedValue({
                id: "idempotency-1",
                key: idempotencyKey,
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                referenceId: "task-1",
                referenceType: 1, // TASK
                action: 2,
                responseSnapshot: cachedTask,
                requestFingerprint: "fingerprint-123",
                createdAt: new Date(),
                expiredAt: new Date(),
            });

            // Act
            const result = await useCase.assign(input, idempotencyKey);

            // Assert
            expect(mockRepository.findById).not.toHaveBeenCalled();
            expect(mockRepository.assignTask).not.toHaveBeenCalled();
            expect(result).toEqual(cachedTask);
        });

        it("should save idempotency record when key provided", async () => {
            // Arrange
            const idempotencyKey = "idempotency-key-456";
            const input = {
                taskId: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                assigneeId: "user-1",
                expectedVersion: 1,
            };

            const existingTask: Task = {
                id: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                title: "Test Task",
                priority: TaskPriority.HIGH,
                state: TaskState.NEW,
                assigneeId: null,
                version: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const assignedTask: Task = {
                ...existingTask,
                assigneeId: "user-1",
                version: 2,
            };

            vi.mocked(mockIdempotencyRepository.findByKey).mockResolvedValue(null);
            vi.mocked(mockRepository.findById).mockResolvedValue(existingTask);
            vi.mocked(mockRepository.assignTask).mockResolvedValue(assignedTask);

            // Act
            await useCase.assign(input, idempotencyKey);

            // Assert
            expect(mockIdempotencyRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    key: idempotencyKey,
                    tenantId: input.tenantId,
                    action: 2, // TASK_ASSIGN
                    responseSnapshot: assignedTask,
                }),
                mockDb
            );
        });
    });
});

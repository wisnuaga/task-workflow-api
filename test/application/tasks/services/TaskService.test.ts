import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskService } from "../../../../src/application/tasks/services/TaskService";
import { ITaskUseCase } from "../../../../src/domain/tasks/usecases/ITaskUseCase";
import { TaskPriority } from "../../../../src/domain/tasks/entities/TaskPriority";
import { TaskState } from "../../../../src/domain/tasks/entities/TaskState";
import { UserRole } from "../../../../src/domain/users/entities/UserRole";
import { Task } from "../../../../src/domain/tasks/entities/Task";
import { ValidationError } from "../../../../src/application/tasks/services/errors/ValidationError";

describe("TaskService", () => {
    let service: TaskService;
    let mockUseCase: ITaskUseCase;

    beforeEach(() => {
        mockUseCase = {
            create: vi.fn(),
            assign: vi.fn(),
        };
        service = new TaskService(mockUseCase);
    });

    describe("createTask", () => {
        it("should create task with provided priority", async () => {
            // Arrange
            const input = {
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                title: "Test Task",
                priority: TaskPriority.HIGH,
                role: UserRole.AGENT,
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

            vi.mocked(mockUseCase.create).mockResolvedValue(createdTask);

            // Act
            const result = await service.createTask(input);

            // Assert
            expect(mockUseCase.create).toHaveBeenCalledWith({
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                title: "Test Task",
                priority: TaskPriority.HIGH,
                state: TaskState.NEW,
            }, undefined);
            expect(result.task).toEqual(createdTask);
        });

        it("should default to MEDIUM priority when not provided", async () => {
            // Arrange
            const input = {
                tenantId: "tenant-2",
                workspaceId: "workspace-2",
                title: "Task without priority",
                role: UserRole.MANAGER,
            };

            const createdTask: Task = {
                id: "2",
                tenantId: "tenant-2",
                workspaceId: "workspace-2",
                title: "Task without priority",
                priority: TaskPriority.MEDIUM,
                state: TaskState.NEW,
                assigneeId: null,
                version: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            vi.mocked(mockUseCase.create).mockResolvedValue(createdTask);

            // Act
            const result = await service.createTask(input);

            // Assert
            expect(mockUseCase.create).toHaveBeenCalledWith({
                tenantId: "tenant-2",
                workspaceId: "workspace-2",
                title: "Task without priority",
                priority: TaskPriority.MEDIUM,
                state: TaskState.NEW,
            }, undefined);
            expect(result.task.priority).toBe(TaskPriority.MEDIUM);
        });

        it("should throw ValidationError when title is missing", async () => {
            // Arrange
            const input = {
                tenantId: "tenant-3",
                workspaceId: "workspace-3",
                title: "",
                role: UserRole.AGENT,
            };

            // Act & Assert
            await expect(service.createTask(input)).rejects.toThrow(
                ValidationError
            );
            await expect(service.createTask(input)).rejects.toThrow(
                "title is required"
            );
        });

        it("should throw ValidationError when title exceeds 120 characters", async () => {
            // Arrange
            const longTitle = "a".repeat(121);
            const input = {
                tenantId: "tenant-4",
                workspaceId: "workspace-4",
                title: longTitle,
                role: UserRole.AGENT,
            };

            // Act & Assert
            await expect(service.createTask(input)).rejects.toThrow(
                ValidationError
            );
            await expect(service.createTask(input)).rejects.toThrow(
                "title must be 120 characters or less"
            );
        });

        it("should accept title with exactly 120 characters", async () => {
            // Arrange
            const maxTitle = "a".repeat(120);
            const input = {
                tenantId: "tenant-5",
                workspaceId: "workspace-5",
                title: maxTitle,
                role: UserRole.AGENT,
            };

            const createdTask: Task = {
                id: "5",
                tenantId: "tenant-5",
                workspaceId: "workspace-5",
                title: maxTitle,
                priority: TaskPriority.MEDIUM,
                state: TaskState.NEW,
                assigneeId: null,
                version: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            vi.mocked(mockUseCase.create).mockResolvedValue(createdTask);

            // Act
            const result = await service.createTask(input);

            // Assert
            expect(result.task.title).toBe(maxTitle);
        });

        it("should throw ValidationError when tenantId is missing", async () => {
            // Arrange
            const input = {
                tenantId: "",
                workspaceId: "workspace-6",
                title: "Test",
                role: UserRole.AGENT,
            };

            // Act & Assert
            await expect(service.createTask(input)).rejects.toThrow(
                "tenantId is required"
            );
        });

        it("should throw ValidationError when workspaceId is missing", async () => {
            // Arrange
            const input = {
                tenantId: "tenant-7",
                workspaceId: "",
                title: "Test",
                role: UserRole.AGENT,
            };

            // Act & Assert
            await expect(service.createTask(input)).rejects.toThrow(
                "workspaceId is required"
            );
        });

        it("should create task with all priority levels", async () => {
            const priorities = [
                TaskPriority.LOW,
                TaskPriority.MEDIUM,
                TaskPriority.HIGH,
            ];

            for (const priority of priorities) {
                const input = {
                    tenantId: "tenant-8",
                    workspaceId: "workspace-8",
                    title: `${priority} priority task`,
                    priority: priority,
                    role: UserRole.AGENT,
                };

                const createdTask: Task = {
                    id: "8",
                    tenantId: "tenant-8",
                    workspaceId: "workspace-8",
                    title: `${priority} priority task`,
                    priority: priority,
                    state: TaskState.NEW,
                    assigneeId: null,
                    version: 1,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                vi.mocked(mockUseCase.create).mockResolvedValue(createdTask);

                const result = await service.createTask(input);

                expect(result.task.priority).toBe(priority);
            }
        });

        it("should throw ValidationError when role is missing", async () => {
            // Arrange
            const input = {
                tenantId: "tenant-4",
                workspaceId: "workspace-4",
                title: "No Role Task",
                role: UserRole.UNSPECIFIED,
            };

            // Act & Assert
            await expect(service.createTask(input)).rejects.toThrow(
                ValidationError
            );
            await expect(service.createTask(input)).rejects.toThrow(
                "role is required"
            );
        });
    });

    describe("assignTask", () => {
        beforeEach(() => {
            mockUseCase.assign = vi.fn();
        });

        it("should assign task successfully with MANAGER role", async () => {
            // Arrange
            const input = {
                taskId: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                assigneeId: "user-1",
                expectedVersion: 1,
                role: UserRole.MANAGER,
            };

            const assignedTask: Task = {
                id: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                title: "Test Task",
                priority: TaskPriority.HIGH,
                state: TaskState.NEW,
                assigneeId: "user-1",
                version: 2,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            vi.mocked(mockUseCase.assign).mockResolvedValue(assignedTask);

            // Act
            const result = await service.assignTask(input);

            // Assert
            expect(mockUseCase.assign).toHaveBeenCalledWith({
                taskId: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                assigneeId: "user-1",
                expectedVersion: 1,
            }, undefined);
            expect(result.task).toEqual(assignedTask);
        });

        it("should throw AuthorizationError when role is not MANAGER", async () => {
            // Arrange
            const input = {
                taskId: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                assigneeId: "user-1",
                expectedVersion: 1,
                role: UserRole.AGENT,
            };

            // Act & Assert
            await expect(service.assignTask(input)).rejects.toThrow("Only managers can assign tasks");
        });

        it("should throw ValidationError when taskId is missing", async () => {
            // Arrange
            const input = {
                taskId: "",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                assigneeId: "user-1",
                expectedVersion: 1,
                role: UserRole.MANAGER,
            };

            // Act & Assert
            await expect(service.assignTask(input)).rejects.toThrow(ValidationError);
            await expect(service.assignTask(input)).rejects.toThrow("taskId is required");
        });

        it("should throw ValidationError when assigneeId is missing", async () => {
            // Arrange
            const input = {
                taskId: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                assigneeId: "",
                expectedVersion: 1,
                role: UserRole.MANAGER,
            };

            // Act & Assert
            await expect(service.assignTask(input)).rejects.toThrow(ValidationError);
            await expect(service.assignTask(input)).rejects.toThrow("assignee_id is required");
        });

        it("should pass idempotency key to use case", async () => {
            // Arrange
            const idempotencyKey = "idempotency-key-123";
            const input = {
                taskId: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                assigneeId: "user-1",
                expectedVersion: 1,
                role: UserRole.MANAGER,
                idempotencyKey,
            };

            const assignedTask: Task = {
                id: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                title: "Test Task",
                priority: TaskPriority.HIGH,
                state: TaskState.NEW,
                assigneeId: "user-1",
                version: 2,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            vi.mocked(mockUseCase.assign).mockResolvedValue(assignedTask);

            // Act
            await service.assignTask(input);

            // Assert
            expect(mockUseCase.assign).toHaveBeenCalledWith(
                expect.objectContaining({
                    taskId: "task-1",
                    assigneeId: "user-1",
                }),
                idempotencyKey
            );
        });
    });
});

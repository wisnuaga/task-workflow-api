import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskUseCase } from "../../../src/application/tasks/usecases/TaskUseCase";
import { ITaskRepository } from "../../../src/domain/tasks/repositories/ITaskRepository";
import { TaskState } from "../../../src/domain/tasks/entities/TaskState";
import { TaskPriority } from "../../../src/domain/tasks/entities/TaskPriority";
import { Task } from "../../../src/domain/tasks/entities/Task";

describe("TaskUseCase", () => {
    let useCase: TaskUseCase;
    let mockRepository: ITaskRepository;

    beforeEach(() => {
        mockRepository = {
            create: vi.fn(),
        };
        useCase = new TaskUseCase(mockRepository);
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
            expect(mockRepository.create).toHaveBeenCalledWith(taskInput);
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
    });
});

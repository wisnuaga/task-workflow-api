import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskRepository } from "../../../../src/infrastructure/db/repositories/TaskRepository";
import { IDBClient, QueryResult } from "../../../../src/application/interfaces/db/IDBClient";
import { TaskState } from "../../../../src/domain/tasks/entities/TaskState";
import { TaskPriority } from "../../../../src/domain/tasks/entities/TaskPriority";
import {
    buildTaskInput,
    buildTaskDbRow,
    buildExpectedTask,
    resetTaskIdCounter,
} from "./factories/taskFactory";

describe("TaskRepository", () => {
    let mockDb: IDBClient;
    let repository: TaskRepository;

    beforeEach(() => {
        resetTaskIdCounter();
        mockDb = {
            query: vi.fn(),
            transaction: vi.fn(),
        };
        repository = new TaskRepository(mockDb);
    });

    describe("create", () => {
        it("should insert task with correct SQL and parameters", async () => {
            // Arrange
            const taskInput = buildTaskInput({
                priority: TaskPriority.HIGH,
            });

            const dbRow = buildTaskDbRow({ id: "123" });
            const expectedTask = buildExpectedTask(taskInput, dbRow);

            const mockResult: QueryResult = {
                rows: [dbRow],
                rowCount: 1,
            };

            vi.mocked(mockDb.query).mockResolvedValue(mockResult);

            // Act
            const result = await repository.create(taskInput);

            // Assert
            expect(mockDb.query).toHaveBeenCalledTimes(1);

            const [sql, params] = vi.mocked(mockDb.query).mock.calls[0];

            // Verify SQL contains INSERT statement
            expect(sql).toContain("INSERT INTO tasks");
            expect(sql).toContain("RETURNING");

            // Verify several columns are present
            expect(sql).toContain("id");
            expect(sql).toContain("version");
            expect(sql).toContain("created_at");
            expect(sql).toContain("updated_at");

            // Verify parameters
            expect(params).toEqual([
                taskInput.tenantId,
                taskInput.workspaceId,
                taskInput.title,
                taskInput.priority,
                taskInput.state,
            ]);

            // Verify returned task
            expect(result).toEqual(expectedTask);
        });

        it("should create task with different priorities", async () => {
            // Arrange
            const taskInput = buildTaskInput({
                priority: TaskPriority.LOW,
                title: "Low Priority Task",
            });

            const dbRow = buildTaskDbRow();
            const expectedTask = buildExpectedTask(taskInput, dbRow);

            const mockResult: QueryResult = {
                rows: [dbRow],
                rowCount: 1,
            };

            vi.mocked(mockDb.query).mockResolvedValue(mockResult);

            // Act
            const result = await repository.create(taskInput);

            // Assert
            expect(result.priority).toBe(TaskPriority.LOW);
            expect(result.title).toBe("Low Priority Task");
            expect(result.assigneeId).toBeNull();
        });

        it("should create task with different states", async () => {
            // Arrange
            const taskInput = buildTaskInput({
                state: TaskState.IN_PROGRESS,
                title: "In Progress Task",
            });

            const dbRow = buildTaskDbRow();
            const expectedTask = buildExpectedTask(taskInput, dbRow);

            const mockResult: QueryResult = {
                rows: [dbRow],
                rowCount: 1,
            };

            vi.mocked(mockDb.query).mockResolvedValue(mockResult);

            // Act
            const result = await repository.create(taskInput);

            // Assert
            expect(result.state).toBe(TaskState.IN_PROGRESS);
            expect(result.assigneeId).toBeNull();
        });

        it("should always set assigneeId to null on creation", async () => {
            // Arrange
            const taskInput = buildTaskInput({
                tenantId: "tenant-3",
                workspaceId: "workspace-3",
            });

            const dbRow = buildTaskDbRow();
            const expectedTask = buildExpectedTask(taskInput, dbRow);

            const mockResult: QueryResult = {
                rows: [dbRow],
                rowCount: 1,
            };

            vi.mocked(mockDb.query).mockResolvedValue(mockResult);

            // Act
            const result = await repository.create(taskInput);

            // Assert
            expect(result.tenantId).toBe("tenant-3");
            expect(result.workspaceId).toBe("workspace-3");
            expect(result.assigneeId).toBeNull();
        });

        it("should throw error when no rows returned", async () => {
            // Arrange
            const taskInput = buildTaskInput();

            const mockResult: QueryResult = {
                rows: [],
                rowCount: 0,
            };

            vi.mocked(mockDb.query).mockResolvedValue(mockResult);

            // Act & Assert
            await expect(repository.create(taskInput)).rejects.toThrow(
                "Failed to create task"
            );
        });

        it("should handle database errors", async () => {
            // Arrange
            const taskInput = buildTaskInput();

            const dbError = new Error("Database connection failed");
            vi.mocked(mockDb.query).mockRejectedValue(dbError);

            // Act & Assert
            await expect(repository.create(taskInput)).rejects.toThrow(
                "Database connection failed"
            );
        });

        it("should use parameterized query to prevent SQL injection", async () => {
            // Arrange
            const taskInput = buildTaskInput({
                tenantId: "tenant'; DROP TABLE tasks; --",
                workspaceId: "workspace-6",
                title: "'; DELETE FROM tasks WHERE '1'='1",
            });

            const dbRow = buildTaskDbRow();

            const mockResult: QueryResult = {
                rows: [dbRow],
                rowCount: 1,
            };

            vi.mocked(mockDb.query).mockResolvedValue(mockResult);

            // Act
            await repository.create(taskInput);

            // Assert - Parameters should be passed separately, not concatenated
            const [sql, params] = vi.mocked(mockDb.query).mock.calls[0];
            expect(params).toContain("tenant'; DROP TABLE tasks; --");
            expect(sql).not.toContain("tenant'; DROP TABLE tasks; --");
        });
        it("should use provided transaction client if passed", async () => {
            // Arrange
            const taskInput = buildTaskInput();
            const dbRow = buildTaskDbRow();
            const mockResult: QueryResult = {
                rows: [dbRow],
                rowCount: 1,
            };

            const mockTxClient = {
                query: vi.fn().mockResolvedValue(mockResult),
                transaction: vi.fn(),
            };

            // Act
            await repository.create(taskInput, mockTxClient);

            // Assert
            expect(mockTxClient.query).toHaveBeenCalledTimes(1);
            expect(mockDb.query).not.toHaveBeenCalled();
        });
    });
});

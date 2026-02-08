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

    describe("findById", () => {
        it("should return task when found", async () => {
            // Arrange
            const taskId = "e955091b-e322-48c6-8452-a8fdc913f69e";
            const tenantId = "tenant-1";
            const workspaceId = "workspace-1";

            const dbRow = {
                id: taskId,
                tenant_id: tenantId,
                workspace_id: workspaceId,
                title: "Test Task",
                priority: TaskPriority.HIGH,
                state: TaskState.NEW,
                assignee_id: null,
                version: 1,
                created_at: new Date(),
                updated_at: new Date(),
            };

            const mockResult: QueryResult = {
                rows: [dbRow],
                rowCount: 1,
            };

            vi.mocked(mockDb.query).mockResolvedValue(mockResult);

            // Act
            const result = await repository.findById(taskId, tenantId, workspaceId);

            // Assert
            expect(result).not.toBeNull();
            expect(result?.id).toBe(taskId);
            expect(result?.tenantId).toBe(tenantId);
            expect(result?.workspaceId).toBe(workspaceId);
            expect(result?.assigneeId).toBeNull();
        });

        it("should return null when task not found", async () => {
            // Arrange
            const mockResult: QueryResult = {
                rows: [],
                rowCount: 0,
            };

            vi.mocked(mockDb.query).mockResolvedValue(mockResult);

            // Act
            const result = await repository.findById("non-existent", "tenant-1", "workspace-1");

            // Assert
            expect(result).toBeNull();
        });

        it("should return null for invalid UUID format", async () => {
            // Arrange
            const invalidUuid = "invalid-uuid";
            const error: any = new Error("invalid input syntax for type uuid");
            error.code = "22P02";

            vi.mocked(mockDb.query).mockRejectedValue(error);

            // Act
            const result = await repository.findById(invalidUuid, "tenant-1", "workspace-1");

            // Assert
            expect(result).toBeNull();
        });

        it("should use transaction client when provided", async () => {
            // Arrange
            const mockTxClient = {
                query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
                transaction: vi.fn(),
            };

            // Act
            await repository.findById("task-1", "tenant-1", "workspace-1", mockTxClient);

            // Assert
            expect(mockTxClient.query).toHaveBeenCalledTimes(1);
            expect(mockDb.query).not.toHaveBeenCalled();
        });
    });

    describe("assignTask", () => {
        it("should assign task successfully", async () => {
            // Arrange
            const taskId = "e955091b-e322-48c6-8452-a8fdc913f69e";
            const assigneeId = "user-123";
            const expectedVersion = 1;
            const tenantId = "tenant-1";
            const workspaceId = "workspace-1";

            const dbRow = {
                id: taskId,
                tenant_id: tenantId,
                workspace_id: workspaceId,
                title: "Test Task",
                priority: TaskPriority.HIGH,
                state: TaskState.NEW,
                assignee_id: assigneeId,
                version: 2,
                created_at: new Date(),
                updated_at: new Date(),
            };

            const mockResult: QueryResult = {
                rows: [dbRow],
                rowCount: 1,
            };

            vi.mocked(mockDb.query).mockResolvedValue(mockResult);

            // Act
            const result = await repository.assignTask(taskId, assigneeId, expectedVersion, tenantId, workspaceId);

            // Assert
            expect(result.assigneeId).toBe(assigneeId);
            expect(result.version).toBe(2);

            const [sql, params] = vi.mocked(mockDb.query).mock.calls[0];
            expect(sql).toContain("UPDATE tasks");
            expect(sql).toContain("SET assignee_id = $1");
            expect(sql).toContain("WHERE tenant_id = $2");
            expect(sql).toContain("AND workspace_id = $3");
            expect(sql).toContain("AND id = $4::uuid");
            expect(sql).toContain("AND version = $5");
            expect(params).toEqual([assigneeId, tenantId, workspaceId, taskId, expectedVersion]);
        });

        it("should throw error when version mismatch", async () => {
            // Arrange
            const mockResult: QueryResult = {
                rows: [],
                rowCount: 0,
            };

            vi.mocked(mockDb.query).mockResolvedValue(mockResult);

            // Act & Assert
            await expect(
                repository.assignTask("task-1", "user-1", 1, "tenant-1", "workspace-1")
            ).rejects.toThrow("version mismatch or task not found");
        });

        it("should throw error for invalid UUID format", async () => {
            // Arrange
            const invalidUuid = "invalid-uuid";
            const error: any = new Error("invalid input syntax for type uuid");
            error.code = "22P02";

            vi.mocked(mockDb.query).mockRejectedValue(error);

            // Act & Assert
            await expect(
                repository.assignTask(invalidUuid, "user-1", 1, "tenant-1", "workspace-1")
            ).rejects.toThrow("version mismatch or task not found");
        });

        it("should use transaction client when provided", async () => {
            // Arrange
            const dbRow = {
                id: "task-1",
                tenant_id: "tenant-1",
                workspace_id: "workspace-1",
                title: "Test Task",
                priority: TaskPriority.HIGH,
                state: TaskState.NEW,
                assignee_id: "user-1",
                version: 2,
                created_at: new Date(),
                updated_at: new Date(),
            };

            const mockTxClient = {
                query: vi.fn().mockResolvedValue({ rows: [dbRow], rowCount: 1 }),
                transaction: vi.fn(),
            };

            // Act
            await repository.assignTask("task-1", "user-1", 1, "tenant-1", "workspace-1", mockTxClient);

            // Assert
            expect(mockTxClient.query).toHaveBeenCalledTimes(1);
            expect(mockDb.query).not.toHaveBeenCalled();
        });
    });
});

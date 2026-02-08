import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskEventRepository } from "../../../../src/infrastructure/db/repositories/TaskEventRepository";
import { IDBClient, QueryResult } from "../../../../src/application/interfaces/db/IDBClient";
import { TaskEventType } from "../../../../src/domain/tasks/entities/TaskEventType";
import { buildTaskEventInput, buildTaskEventDbRow } from "./factories/taskEventFactory";

describe("TaskEventRepository", () => {
    let mockDb: IDBClient;
    let repository: TaskEventRepository;

    beforeEach(() => {
        mockDb = {
            query: vi.fn(),
            transaction: vi.fn(),
        };
        repository = new TaskEventRepository(mockDb);
    });

    describe("create", () => {
        it("should insert event with correct SQL and parameters", async () => {
            // Arrange
            const eventInput = buildTaskEventInput();
            const dbRow = buildTaskEventDbRow();

            const mockResult: QueryResult = {
                rows: [dbRow],
                rowCount: 1,
            };

            vi.mocked(mockDb.query).mockResolvedValue(mockResult);

            // Act
            const result = await repository.create(eventInput);

            // Assert
            expect(mockDb.query).toHaveBeenCalledTimes(1);

            const [sql, params] = vi.mocked(mockDb.query).mock.calls[0];

            expect(sql).toContain("INSERT INTO task_events");
            expect(sql).toContain("VALUES");
            expect(sql).toContain("RETURNING id, created_at");

            expect(params).toEqual([
                eventInput.tenantId,
                eventInput.workspaceId,
                TaskEventType.TASK_CREATED,
                eventInput.taskId,
                eventInput.snapshot
            ]);

            expect(result).toEqual({
                ...eventInput,
                id: dbRow.id,
                eventType: TaskEventType.TASK_CREATED,
                createdAt: dbRow.created_at
            });
        });

        it("should use provided transaction client if passed", async () => {
            // Arrange
            const eventInput = buildTaskEventInput();
            const dbRow = buildTaskEventDbRow();

            const mockTxClient = {
                query: vi.fn().mockResolvedValue({
                    rows: [dbRow],
                    rowCount: 1
                }),
                transaction: vi.fn(),
            };

            // Act
            await repository.create(eventInput, mockTxClient);

            // Assert
            expect(mockTxClient.query).toHaveBeenCalledTimes(1);
            expect(mockDb.query).not.toHaveBeenCalled();
        });
    });
});

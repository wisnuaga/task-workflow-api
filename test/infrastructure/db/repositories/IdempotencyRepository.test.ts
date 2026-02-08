import { describe, it, expect, beforeEach, vi } from "vitest";
import { IdempotencyRepository } from "../../../../src/infrastructure/db/repositories/IdempotencyRepository";
import { IDBClient, QueryResult } from "../../../../src/application/interfaces/db/IDBClient";
import { buildIdempotencyInput, buildIdempotencyDbRow } from "./factories/idempotencyFactory";
import { IdempotencyAction } from "../../../../src/domain/idempotency/entities/IdempotencyAction";

describe("IdempotencyRepository", () => {
    let mockDb: IDBClient;
    let repository: IdempotencyRepository;

    beforeEach(() => {
        mockDb = {
            query: vi.fn(),
            transaction: vi.fn(),
        };
        repository = new IdempotencyRepository(mockDb);
    });

    describe("findByKey", () => {
        it("should return null if key not found", async () => {
            // Arrange
            const mockResult: QueryResult = {
                rows: [],
                rowCount: 0,
            };
            vi.mocked(mockDb.query).mockResolvedValue(mockResult);

            // Act
            const result = await repository.findByKey("t-1", "w-1", IdempotencyAction.CREATE_TASK, "key-1");

            // Assert
            expect(result).toBeNull();
            expect(mockDb.query).toHaveBeenCalledTimes(1);
        });

        it("should return idempotency key if found", async () => {
            // Arrange
            const dbRow = {
                id: "uuid-1",
                tenant_id: "t-1",
                workspace_id: "w-1",
                action: IdempotencyAction.CREATE_TASK,
                key: "key-1",
                reference_id: "ref-1",
                reference_type: 1,
                request_fingerprint: "fp-1",
                response_snapshot: {},
                created_at: new Date(),
                expired_at: new Date(),
            };
            const mockResult: QueryResult = {
                rows: [dbRow],
                rowCount: 1,
            };
            vi.mocked(mockDb.query).mockResolvedValue(mockResult);

            // Act
            const result = await repository.findByKey("t-1", "w-1", IdempotencyAction.CREATE_TASK, "key-1");

            // Assert
            expect(result).not.toBeNull();
            expect(result?.id).toBe("uuid-1");
            expect(result?.key).toBe("key-1");
        });
    });

    describe("create", () => {
        it("should insert key with correct SQL and parameters", async () => {
            // Arrange
            const input = buildIdempotencyInput();
            const dbRow = buildIdempotencyDbRow();

            const mockResult: QueryResult = {
                rows: [dbRow],
                rowCount: 1,
            };
            vi.mocked(mockDb.query).mockResolvedValue(mockResult);

            // Act
            const result = await repository.create(input);

            // Assert
            expect(mockDb.query).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                ...input,
                id: dbRow.id,
                createdAt: dbRow.created_at
            });

            const [sql, params] = vi.mocked(mockDb.query).mock.calls[0];
            expect(sql).toContain("INSERT INTO idempotency_keys");
            expect(params).toHaveLength(9);
        });
    });
});

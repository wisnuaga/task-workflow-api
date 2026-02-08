import { Idempotency } from "../../../../../src/domain/idempotency/entities/Idempotency";
import { IdempotencyAction } from "../../../../../src/domain/idempotency/entities/IdempotencyAction";
import { IdempotencyReferenceType } from "../../../../../src/domain/idempotency/entities/IdempotencyReferenceType";
import { randomUUID } from "node:crypto";

export const buildIdempotencyInput = (overrides?: Partial<Omit<Idempotency, "id" | "createdAt">>): Omit<Idempotency, "id" | "createdAt"> => {
    return {
        tenantId: "default-tenant-id",
        workspaceId: "default-workspace-id",
        action: IdempotencyAction.CREATE_TASK,
        key: "default-key",
        referenceId: "default-reference-id",
        referenceType: IdempotencyReferenceType.TASK,
        requestFingerprint: "default-fingerprint",
        responseSnapshot: { id: "default-task-id" },
        expiredAt: new Date(Date.now() + 3600000), // 1 hour later
        ...overrides,
    };
};

export const buildIdempotencyDbRow = (overrides?: Partial<any>) => {
    return {
        id: randomUUID(),
        created_at: new Date(),
        ...overrides,
    };
};

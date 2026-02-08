import { IdempotencyAction } from "./IdempotencyAction";
import { IdempotencyReferenceType } from "./IdempotencyReferenceType";

export interface Idempotency {
    id: string; // UUID
    tenantId: string;
    workspaceId: string;
    action: IdempotencyAction;
    key: string;
    referenceId: string;
    referenceType: IdempotencyReferenceType;
    requestFingerprint: string;
    responseSnapshot: any; // JSONB
    createdAt: Date;
    expiredAt: Date;
}

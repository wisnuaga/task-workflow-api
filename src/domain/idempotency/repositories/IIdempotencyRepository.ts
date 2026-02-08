import { Idempotency } from "../entities/Idempotency";
import { IdempotencyAction } from "../entities/IdempotencyAction";

export interface IIdempotencyRepository {
    findByKey(tenantId: string, workspaceId: string, action: IdempotencyAction, key: string, tx?: any): Promise<Idempotency | null>;
    create(data: Omit<Idempotency, "id" | "createdAt">, tx?: any): Promise<Idempotency>;
}

import { IDBClient } from "../../../application/interfaces/db/IDBClient";
import { IIdempotencyRepository } from "../../../domain/idempotency/repositories/IIdempotencyRepository";
import { Idempotency } from "../../../domain/idempotency/entities/Idempotency";
import { IdempotencyAction } from "../../../domain/idempotency/entities/IdempotencyAction";

export class IdempotencyRepository implements IIdempotencyRepository {
    constructor(private readonly db: IDBClient) { }

    async findByKey(tenantId: string, workspaceId: string, action: IdempotencyAction, key: string, tx?: IDBClient): Promise<Idempotency | null> {
        const client = tx || this.db;
        const sql = `
            SELECT 
                id,
                tenant_id,
                workspace_id,
                action,
                key,
                reference_id,
                reference_type,
                request_fingerprint,
                response_snapshot,
                created_at,
                expired_at
            FROM idempotency_keys
            WHERE tenant_id = $1 AND workspace_id = $2 AND action = $3 AND key = $4
            LIMIT 1
        `;

        const result = await client.query<any>(sql, [tenantId, workspaceId, action, key]);
        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return {
            id: row.id,
            tenantId: row.tenant_id,
            workspaceId: row.workspace_id,
            action: row.action,
            key: row.key,
            referenceId: row.reference_id,
            referenceType: row.reference_type,
            requestFingerprint: row.request_fingerprint,
            responseSnapshot: row.response_snapshot,
            createdAt: row.created_at,
            expiredAt: row.expired_at,
        };
    }

    async create(data: Omit<Idempotency, "id" | "createdAt">, tx?: IDBClient): Promise<Idempotency> {
        const client = tx || this.db;
        const sql = `
            INSERT INTO idempotency_keys (
                tenant_id,
                workspace_id,
                action,
                key,
                reference_id,
                reference_type,
                request_fingerprint,
                response_snapshot,
                expired_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, created_at
        `;

        const params = [
            data.tenantId,
            data.workspaceId,
            data.action,
            data.key,
            data.referenceId,
            data.referenceType,
            data.requestFingerprint,
            data.responseSnapshot,
            data.expiredAt
        ];

        const result = await client.query<{ id: string; created_at: Date }>(sql, params);

        const row = result.rows[0];
        if (!row) {
            throw new Error("Failed to create idempotency key");
        }

        return {
            ...data,
            id: row.id,
            createdAt: row.created_at
        };
    }
}

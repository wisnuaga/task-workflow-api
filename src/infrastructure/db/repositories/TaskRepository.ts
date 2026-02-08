import { IDBClient } from "../../../application/interfaces/db/IDBClient";
import { ITaskRepository } from "../../../domain/tasks/repositories/ITaskRepository";
import { Task } from "../../../domain/tasks/entities/Task";

export class TaskRepository implements ITaskRepository {
    constructor(private readonly db: IDBClient) { }

    async create(task: Omit<Task, "id" | "assigneeId" | "version" | "createdAt" | "updatedAt">, tx?: IDBClient): Promise<Task> {
        const client = tx || this.db;

        const sql = `
            INSERT INTO tasks (
            tenant_id,
            workspace_id,
            title,
            priority,
            state
        )
        VALUES($1, $2, $3, $4, $5)
        RETURNING
        id,
            version,
            created_at,
            updated_at
                `;

        const params = [
            task.tenantId,
            task.workspaceId,
            task.title,
            task.priority,
            task.state
        ];

        const result = await client.query<{
            id: string;
            version: number;
            created_at: Date;
            updated_at: Date;
        }>(sql, params);

        if (result.rows.length === 0 || !result.rows[0]) {
            throw new Error("Failed to create task");
        }

        const row = result.rows[0];

        return {
            id: row.id,
            tenantId: task.tenantId,
            workspaceId: task.workspaceId,
            title: task.title,
            priority: task.priority,
            state: task.state,
            assigneeId: null,
            version: row.version,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    async findById(taskId: string, tenantId: string, workspaceId: string, tx?: IDBClient): Promise<Task | null> {
        const client = tx || this.db;

        const sql = `
            SELECT 
                id,
                tenant_id,
                workspace_id,
                title,
                priority,
                state,
                assignee_id,
                version,
                created_at,
                updated_at
            FROM tasks
            WHERE tenant_id = $1 AND workspace_id = $2 AND id = $3
        `;

        const result = await client.query<{
            id: string;
            tenant_id: string;
            workspace_id: string;
            title: string;
            priority: number;
            state: number;
            assignee_id: string | null;
            version: number;
            created_at: Date;
            updated_at: Date;
        }>(sql, [tenantId, workspaceId, taskId]);

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        if (!row) {
            return null;
        }

        return {
            id: row.id,
            tenantId: row.tenant_id,
            workspaceId: row.workspace_id,
            title: row.title,
            priority: row.priority,
            state: row.state,
            assigneeId: row.assignee_id,
            version: row.version,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    async assignTask(
        taskId: string,
        assigneeId: string,
        expectedVersion: number,
        tenantId: string,
        workspaceId: string,
        tx?: IDBClient
    ): Promise<Task> {
        const client = tx || this.db;

        const sql = `
            UPDATE tasks
            SET assignee_id = $1
            WHERE tenant_id = $2 
                AND workspace_id = $3 
                AND id = $4 
                AND version = $5
            RETURNING
                id,
                tenant_id,
                workspace_id,
                title,
                priority,
                state,
                assignee_id,
                version,
                created_at,
                updated_at
        `;

        const result = await client.query<{
            id: string;
            tenant_id: string;
            workspace_id: string;
            title: string;
            priority: number;
            state: number;
            assignee_id: string | null;
            version: number;
            created_at: Date;
            updated_at: Date;
        }>(sql, [assigneeId, tenantId, workspaceId, taskId, expectedVersion]);

        if (result.rowCount === 0) {
            throw new Error("version mismatch or task not found");
        }

        const row = result.rows[0];
        if (!row) {
            throw new Error("version mismatch or task not found");
        }

        return {
            id: row.id,
            tenantId: row.tenant_id,
            workspaceId: row.workspace_id,
            title: row.title,
            priority: row.priority,
            state: row.state,
            assigneeId: row.assignee_id,
            version: row.version,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}

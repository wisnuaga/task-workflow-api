import { DBClient } from "../DBClient";
import { ITaskRepository } from "../../../domain/tasks/repositories/ITaskRepository";
import { Task } from "../../../domain/tasks/entities/Task";

export class TaskRepository implements ITaskRepository {
    constructor(private readonly db: DBClient) { }

    async create(task: Omit<Task, "id" | "assigneeId" | "version" | "createdAt" | "updatedAt">): Promise<Task> {
        const sql = `
            INSERT INTO tasks (
                id,
                tenant_id,
                workspace_id,
                title,
                priority,
                state
            )
            VALUES ($1, $2, $3, $4, $5, $6)
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

        const result = await this.db.query<{
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
}

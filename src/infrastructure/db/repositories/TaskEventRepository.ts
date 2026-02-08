import { IDBClient } from "../../../application/interfaces/db/IDBClient";
import { ITaskEventRepository } from "../../../domain/tasks/repositories/ITaskEventRepository";
import { TaskEvent } from "../../../domain/tasks/entities/TaskEvent";
import { TaskEventType } from "../../../domain/tasks/entities/TaskEventType";

export class TaskEventRepository implements ITaskEventRepository {
    constructor(private readonly db: IDBClient) { }

    async create(event: Omit<TaskEvent, "id" | "eventType" | "createdAt">, tx?: IDBClient): Promise<TaskEvent> {
        const client = tx || this.db;

        const sql = `
            INSERT INTO task_events (
                tenant_id,
                workspace_id,
                event_type,
                task_id,
                snapshot
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, created_at
        `;

        const params = [
            event.tenantId,
            event.workspaceId,
            TaskEventType.TASK_CREATED,
            event.taskId,
            event.snapshot
        ];

        const result = await client.query<{ id: string, created_at: Date }>(sql, params);

        if (result.rows.length === 0 || !result.rows[0]) {
            throw new Error("Failed to create task event");
        }

        return {
            ...event,
            id: result.rows[0].id,
            eventType: TaskEventType.TASK_CREATED,
            createdAt: result.rows[0].created_at
        };
    }
}

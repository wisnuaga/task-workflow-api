import { TaskPriority } from "../../../domain/tasks/entities/TaskPriority";

export interface CreateTaskInput {
    tenantId: string;
    workspaceId: string;
    title: string;
    priority?: TaskPriority;
    idempotencyKey?: string;
}

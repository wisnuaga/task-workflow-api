import { TaskPriority } from "../../../domain/tasks/entities/TaskPriority";

import { UserRole } from "../../../domain/users/entities/UserRole";

export interface CreateTaskInput {
    tenantId: string;
    workspaceId: string;
    title: string;
    priority?: TaskPriority;
    idempotencyKey?: string;
    role: UserRole;
}

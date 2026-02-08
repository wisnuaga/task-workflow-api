import { UserRole } from "../../../domain/users/entities/UserRole";

export interface AssignTaskInput {
    taskId: string;
    tenantId: string;
    workspaceId: string;
    assigneeId: string;
    expectedVersion: number;
    role: UserRole;
    idempotencyKey?: string;
}

export interface AssignTaskInput {
    taskId: string;
    tenantId: string;
    workspaceId: string;
    assigneeId: string;
    expectedVersion: number;
}

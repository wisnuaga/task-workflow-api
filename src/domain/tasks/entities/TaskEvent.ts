import { TaskEventType } from "./TaskEventType";

export interface TaskEvent {
    id: string;
    tenantId: string;
    workspaceId: string;
    taskId: string;
    eventType: TaskEventType;
    snapshot: any; // JSONB
    createdAt: Date;
}

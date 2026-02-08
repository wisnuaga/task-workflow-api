import { TaskState } from "./TaskState";
import { TaskPriority } from "./TaskPriority";

export interface Task {
    id: string;
    tenantId: string;
    workspaceId: string;
    title: string;
    priority: TaskPriority;
    state: TaskState;
    assigneeId: string | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}

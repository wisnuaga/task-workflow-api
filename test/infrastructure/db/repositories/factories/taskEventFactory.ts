import { TaskEventType } from "../../../../../src/domain/tasks/entities/TaskEventType";
import { TaskEvent } from "../../../../../src/domain/tasks/entities/TaskEvent";
import { randomUUID } from "node:crypto";

export const buildTaskEventInput = (overrides?: Partial<Omit<TaskEvent, "id" | "eventType" | "createdAt">>): Omit<TaskEvent, "id" | "eventType" | "createdAt"> => {
    return {
        tenantId: "default-tenant-id",
        workspaceId: "default-workspace-id",
        taskId: "default-task-id",
        snapshot: { id: "default-task-id", title: "Snapshot Task" },
        ...overrides,
    };
};

export const buildTaskEvent = (overrides?: Partial<TaskEvent>): TaskEvent => {
    return {
        id: randomUUID(),
        tenantId: "default-tenant-id",
        workspaceId: "default-workspace-id",
        taskId: "default-task-id",
        eventType: TaskEventType.TASK_CREATED,
        snapshot: { id: "default-task-id", title: "Snapshot Task" },
        createdAt: new Date(),
        ...overrides,
    };
};

export const buildTaskEventDbRow = (overrides?: Partial<any>) => {
    return {
        id: randomUUID(),
        created_at: new Date(),
        ...overrides,
    };
};

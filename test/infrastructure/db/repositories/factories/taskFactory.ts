import { Task } from "../../../../../src/domain/tasks/entities/Task";
import { TaskPriority } from "../../../../../src/domain/tasks/entities/TaskPriority";
import { TaskState } from "../../../../../src/domain/tasks/entities/TaskState";

export type TaskInput = Omit<Task, "id" | "assigneeId" | "version" | "createdAt" | "updatedAt">;

export type TaskDbRow = {
    id: string;
    version: number;
    created_at: Date;
    updated_at: Date;
};

let taskIdCounter = 1;

export function buildTaskInput(overrides: Partial<TaskInput> = {}): TaskInput {
    return {
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        title: "Test Task",
        priority: TaskPriority.MEDIUM,
        state: TaskState.NEW,
        ...overrides,
    };
}

export function buildTaskDbRow(overrides: Partial<TaskDbRow> = {}): TaskDbRow {
    const now = new Date("2026-02-08T10:00:00Z");
    return {
        id: (taskIdCounter++).toString(),
        version: 1,
        created_at: now,
        updated_at: now,
        ...overrides,
    };
}

export function buildExpectedTask(input: TaskInput, dbRow: TaskDbRow): Task {
    return {
        id: dbRow.id,
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        title: input.title,
        priority: input.priority,
        state: input.state,
        assigneeId: null,
        version: dbRow.version,
        createdAt: dbRow.created_at,
        updatedAt: dbRow.updated_at,
    };
}

export function resetTaskIdCounter(): void {
    taskIdCounter = 1;
}

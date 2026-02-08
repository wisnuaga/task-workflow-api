import { describe, it, expect } from "vitest";
import { serializeTask } from "../../../../src/interfaces/http/utils/responseSerializer";
import { Task } from "../../../../src/domain/tasks/entities/Task";
import { TaskPriority } from "../../../../src/domain/tasks/entities/TaskPriority";
import { TaskState } from "../../../../src/domain/tasks/entities/TaskState";

describe("responseSerializer", () => {
    describe("serializeTask", () => {
        it("should serialize task with Date objects correctly", () => {
            const now = new Date();
            const task: Task = {
                id: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                title: "Test Task",
                priority: TaskPriority.HIGH,
                state: TaskState.NEW,
                assigneeId: "user-1",
                version: 1,
                createdAt: now,
                updatedAt: now,
            };

            const result = serializeTask(task);

            expect(result).toEqual({
                id: "task-1",
                tenant_id: "tenant-1",
                workspace_id: "workspace-1",
                title: "Test Task",
                priority: "HIGH",
                state: "NEW",
                assignee_id: "user-1",
                version: 1,
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
            });
        });

        it("should serialize task with ISO strings (from idempotency cache) correctly", () => {
            const nowStr = "2024-01-01T00:00:00.000Z";
            const task: any = {
                id: "task-1",
                tenantId: "tenant-1",
                workspaceId: "workspace-1",
                title: "Test Task",
                priority: TaskPriority.HIGH,
                state: TaskState.NEW,
                assigneeId: "user-1",
                version: 1,
                createdAt: nowStr,
                updatedAt: nowStr,
            };

            const result = serializeTask(task);

            expect(result).toEqual({
                id: "task-1",
                tenant_id: "tenant-1",
                workspace_id: "workspace-1",
                title: "Test Task",
                priority: "HIGH",
                state: "NEW",
                assignee_id: "user-1",
                version: 1,
                created_at: nowStr,
                updated_at: nowStr,
            });
        });
    });
});

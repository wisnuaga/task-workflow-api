import { Task } from "../../../domain/tasks/entities/Task";
import { TaskState } from "../../../domain/tasks/entities/TaskState";
import { TaskPriority } from "../../../domain/tasks/entities/TaskPriority";

/**
 * Convert TaskState enum to UPPER_SNAKE_CASE string
 */
function serializeTaskState(state: TaskState): string {
    switch (state) {
        case TaskState.UNSPECIFIED:
            return "UNSPECIFIED";
        case TaskState.NEW:
            return "NEW";
        case TaskState.IN_PROGRESS:
            return "IN_PROGRESS";
        case TaskState.DONE:
            return "DONE";
        case TaskState.CANCELLED:
            return "CANCELLED";
        default:
            return "UNSPECIFIED";
    }
}

/**
 * Convert TaskPriority enum to UPPER_SNAKE_CASE string
 */
function serializeTaskPriority(priority: TaskPriority): string {
    switch (priority) {
        case TaskPriority.UNSPECIFIED:
            return "UNSPECIFIED";
        case TaskPriority.LOW:
            return "LOW";
        case TaskPriority.MEDIUM:
            return "MEDIUM";
        case TaskPriority.HIGH:
            return "HIGH";
        default:
            return "UNSPECIFIED";
    }
}

/**
 * Formats a Date object or ISO string to ISO string
 */
function formatTimestamp(timestamp: any): string {
    if (timestamp instanceof Date) {
        return timestamp.toISOString();
    }
    if (typeof timestamp === "string") {
        return timestamp;
    }
    return new Date(timestamp).toISOString();
}

/**
 * Serialize Task entity to snake_case API response format
 */
export function serializeTask(task: Task) {
    return {
        id: task.id,
        tenant_id: task.tenantId,
        workspace_id: task.workspaceId,
        title: task.title,
        priority: serializeTaskPriority(task.priority),
        state: serializeTaskState(task.state),
        assignee_id: task.assigneeId,
        version: task.version,
        created_at: formatTimestamp(task.createdAt),
        updated_at: formatTimestamp(task.updatedAt),
    };
}

import { ITaskService } from "./ITaskService";
import { ITaskUseCase } from "../../../domain/tasks/usecases/ITaskUseCase";
import { CreateTaskInput } from "../dto/CreateTaskInput";
import { CreateTaskOutput } from "../dto/CreateTaskOutput";
import { ValidationError } from "./errors/ValidationError";
import { TaskPriority } from "../../../domain/tasks/entities/TaskPriority";
import { TaskState } from "../../../domain/tasks/entities/TaskState";

export class TaskService implements ITaskService {
    constructor(private readonly taskUseCase: ITaskUseCase) { }

    async createTask(input: CreateTaskInput): Promise<CreateTaskOutput> {
        // Validation
        this.validateCreateTaskInput(input);

        // Apply business rules and convert DTO to domain input
        const taskInput = {
            tenantId: input.tenantId,
            workspaceId: input.workspaceId,
            title: input.title,
            priority: input.priority ?? TaskPriority.MEDIUM,
            state: TaskState.NEW,
        };

        // Call use case
        const createdTask = await this.taskUseCase.create(taskInput, input.idempotencyKey);

        // Convert to output DTO
        return {
            task: createdTask,
        };
    }

    private validateCreateTaskInput(input: CreateTaskInput): void {
        // Required fields
        if (!input.tenantId || input.tenantId.trim() === "") {
            throw new ValidationError("tenantId is required", "tenantId");
        }

        if (!input.workspaceId || input.workspaceId.trim() === "") {
            throw new ValidationError("workspaceId is required", "workspaceId");
        }

        if (!input.title || input.title.trim() === "") {
            throw new ValidationError("title is required", "title");
        }

        // Title length validation (max 120 chars per requirements)
        if (input.title.length > 120) {
            throw new ValidationError(
                "title must be 120 characters or less",
                "title"
            );
        }

        // Priority validation if provided
        if (
            input.priority !== undefined &&
            !Object.values(TaskPriority).includes(input.priority)
        ) {
            throw new ValidationError("invalid priority value", "priority");
        }
        if (!input.role) {
            throw new ValidationError("role is required (Agent or Manager)", "role");
        }
    }
}

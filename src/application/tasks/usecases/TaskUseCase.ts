import { ITaskUseCase } from "../../../domain/tasks/usecases/ITaskUseCase";
import { ITaskRepository } from "../../../domain/tasks/repositories/ITaskRepository";
import { Task } from "../../../domain/tasks/entities/Task";
import { AssignTaskInput } from "../../../domain/tasks/entities/AssignTaskInput";
import { IDBClient } from "../../interfaces/db/IDBClient";
import { IIdempotencyRepository } from "../../../domain/idempotency/repositories/IIdempotencyRepository";
import { IdempotencyAction } from "../../../domain/idempotency/entities/IdempotencyAction";
import { IdempotencyReferenceType } from "../../../domain/idempotency/entities/IdempotencyReferenceType";
import { ITaskEventRepository } from "../../../domain/tasks/repositories/ITaskEventRepository";
import { TaskEventType } from "../../../domain/tasks/entities/TaskEventType";
import { TaskState } from "../../../domain/tasks/entities/TaskState";
import { NotFoundError } from "../services/errors/NotFoundError";
import { ValidationError } from "../services/errors/ValidationError";
import { ConflictError } from "../services/errors/ConflictError";

export class TaskUseCase implements ITaskUseCase {
    constructor(
        private readonly taskRepository: ITaskRepository,
        private readonly taskEventRepository: ITaskEventRepository,
        private readonly idempotencyRepository: IIdempotencyRepository,
        private readonly db: IDBClient
    ) { }

    async create(task: Omit<Task, "id" | "assigneeId" | "version" | "createdAt" | "updatedAt">, idempotencyKey?: string): Promise<Task> {
        return this.db.transaction(async (tx) => {
            // 1. Check idempotency key if provided
            if (idempotencyKey) {
                const existing = await this.idempotencyRepository.findByKey(
                    task.tenantId,
                    task.workspaceId,
                    IdempotencyAction.TASK_CREATE,
                    idempotencyKey,
                    tx
                );

                if (existing) {
                    // TODO: Validate request fingerprint to ensure it matches
                    return existing.responseSnapshot as Task;
                }
            }

            // 2. Create the task within the transaction
            const createdTask = await this.taskRepository.create(task, tx);

            // 3. Create TaskCreated event (Outbox pattern)
            await this.taskEventRepository.create({
                tenantId: createdTask.tenantId,
                workspaceId: createdTask.workspaceId,
                taskId: createdTask.id,
                snapshot: createdTask
            }, tx);

            // 4. Save idempotency record if key provided
            if (idempotencyKey) {
                await this.idempotencyRepository.create({
                    tenantId: createdTask.tenantId,
                    workspaceId: createdTask.workspaceId,
                    action: IdempotencyAction.TASK_CREATE,
                    key: idempotencyKey,
                    referenceId: createdTask.id,
                    referenceType: IdempotencyReferenceType.TASK,
                    requestFingerprint: "TODO", // We can implement proper fingerprinting later
                    responseSnapshot: createdTask,
                    expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours retention
                }, tx);
            }

            return createdTask;
        });
    }

    async assign(input: AssignTaskInput, idempotencyKey?: string): Promise<Task> {
        return this.db.transaction(async (tx) => {
            // 1. Check idempotency key if provided
            if (idempotencyKey) {
                const existing = await this.idempotencyRepository.findByKey(
                    input.tenantId,
                    input.workspaceId,
                    IdempotencyAction.TASK_ASSIGN,
                    idempotencyKey,
                    tx
                );

                if (existing) {
                    return existing.responseSnapshot as Task;
                }
            }

            // 2. Fetch existing task
            const existingTask = await this.taskRepository.findById(
                input.taskId,
                input.tenantId,
                input.workspaceId,
                tx
            );

            if (!existingTask) {
                throw new NotFoundError(
                    `Task with id ${input.taskId} not found`,
                    "task"
                );
            }

            // 3. Validate state - can only assign if NEW or IN_PROGRESS
            if (existingTask.state !== TaskState.NEW && existingTask.state !== TaskState.IN_PROGRESS) {
                throw new ValidationError(
                    `Cannot assign task in state ${TaskState[existingTask.state]}. Task must be in NEW or IN_PROGRESS state`,
                    "state"
                );
            }

            // 4. Assign task with optimistic locking
            let updatedTask: Task;
            try {
                updatedTask = await this.taskRepository.assignTask(
                    input.taskId,
                    input.assigneeId,
                    input.expectedVersion,
                    input.tenantId,
                    input.workspaceId,
                    tx
                );
            } catch (error: any) {
                // Check if it's a version mismatch (no rows updated)
                if (error.message && error.message.includes("version mismatch")) {
                    throw new ConflictError(
                        "Version mismatch - task has been modified by another request",
                        input.expectedVersion,
                        existingTask.version
                    );
                }
                throw error;
            }

            // 5. Create TASK_ASSIGNED event
            await this.taskEventRepository.create({
                tenantId: updatedTask.tenantId,
                workspaceId: updatedTask.workspaceId,
                taskId: updatedTask.id,
                snapshot: updatedTask
            }, tx);

            // 6. Save idempotency record if key provided
            if (idempotencyKey) {
                await this.idempotencyRepository.create({
                    tenantId: updatedTask.tenantId,
                    workspaceId: updatedTask.workspaceId,
                    action: IdempotencyAction.TASK_ASSIGN,
                    key: idempotencyKey,
                    referenceId: updatedTask.id,
                    referenceType: IdempotencyReferenceType.TASK,
                    requestFingerprint: "TODO",
                    responseSnapshot: updatedTask,
                    expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
                }, tx);
            }

            return updatedTask;
        });
    }
}

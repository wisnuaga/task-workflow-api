import { ITaskUseCase } from "../../../domain/tasks/usecases/ITaskUseCase";
import { ITaskRepository } from "../../../domain/tasks/repositories/ITaskRepository";
import { Task } from "../../../domain/tasks/entities/Task";
import { IDBClient } from "../../interfaces/db/IDBClient";
import { IIdempotencyRepository } from "../../../domain/idempotency/repositories/IIdempotencyRepository";
import { IdempotencyAction } from "../../../domain/idempotency/entities/IdempotencyAction";
import { IdempotencyReferenceType } from "../../../domain/idempotency/entities/IdempotencyReferenceType";

import { ITaskEventRepository } from "../../../domain/tasks/repositories/ITaskEventRepository";

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
}

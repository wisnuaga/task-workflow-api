import { ITaskUseCase } from "../../../domain/tasks/usecases/ITaskUseCase";
import { ITaskRepository } from "../../../domain/tasks/repositories/ITaskRepository";
import { Task } from "../../../domain/tasks/entities/Task";
import { IDBClient } from "../../interfaces/db/IDBClient";

import { ITaskEventRepository } from "../../../domain/tasks/repositories/ITaskEventRepository";

export class TaskUseCase implements ITaskUseCase {
    constructor(
        private readonly taskRepository: ITaskRepository,
        private readonly taskEventRepository: ITaskEventRepository,
        private readonly db: IDBClient
    ) { }

    async create(task: Omit<Task, "id" | "assigneeId" | "version" | "createdAt" | "updatedAt">): Promise<Task> {
        return this.db.transaction(async (tx) => {
            // Create the task within the transaction
            const createdTask = await this.taskRepository.create(task, tx);

            // Create TaskCreated event (Outbox pattern)
            await this.taskEventRepository.create({
                tenantId: createdTask.tenantId,
                workspaceId: createdTask.workspaceId,
                taskId: createdTask.id,
                snapshot: createdTask
            }, tx);

            return createdTask;
        });
    }
}

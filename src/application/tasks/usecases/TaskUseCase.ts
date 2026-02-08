import { ITaskUseCase } from "../../../domain/tasks/usecases/ITaskUseCase";
import { ITaskRepository } from "../../../domain/tasks/repositories/ITaskRepository";
import { Task } from "../../../domain/tasks/entities/Task";
import { IDBClient } from "../../interfaces/db/IDBClient";

export class TaskUseCase implements ITaskUseCase {
    constructor(
        private readonly taskRepository: ITaskRepository,
        private readonly db: IDBClient
    ) { }

    async create(task: Omit<Task, "id" | "assigneeId" | "version" | "createdAt" | "updatedAt">): Promise<Task> {
        return this.db.transaction(async (tx) => {
            // Create the task within the transaction
            const createdTask = await this.taskRepository.create(task, tx);

            // TODO: Create TaskCreated event in task_events table (outbox pattern)
            // await this.eventRepository.save(event, tx);

            return createdTask;
        });
    }
}

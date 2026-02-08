import { ITaskUseCase } from "../../../domain/tasks/usecases/ITaskUseCase";
import { ITaskRepository } from "../../../domain/tasks/repositories/ITaskRepository";
import { Task } from "../../../domain/tasks/entities/Task";

export class TaskUseCase implements ITaskUseCase {
    constructor(private readonly taskRepository: ITaskRepository) { }

    async create(task: Omit<Task, "id" | "assigneeId" | "version" | "createdAt" | "updatedAt">): Promise<Task> {
        // TODO: Start database transaction

        // Create the task
        const createdTask = await this.taskRepository.create(task);

        // TODO: Create TaskCreated event in task_events table (outbox pattern)
        // TODO: Event should include: task_id, event_type=TASK_CREATED, snapshot=createdTask

        // TODO: Commit transaction

        return createdTask;
    }
}

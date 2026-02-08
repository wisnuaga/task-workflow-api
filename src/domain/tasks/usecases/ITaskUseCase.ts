import { Task } from "../entities/Task";

export interface ITaskUseCase {
    create(task: Omit<Task, "id" | "assigneeId" | "version" | "createdAt" | "updatedAt">): Promise<Task>;
}

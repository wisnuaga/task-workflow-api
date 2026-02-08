import { Task } from "../entities/Task";

export interface ITaskRepository {
    create(task: Omit<Task, "id" | "version" | "createdAt" | "updatedAt">): Promise<Task>;
}
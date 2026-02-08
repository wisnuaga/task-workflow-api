import { Task } from "../entities/Task";

export interface ITaskRepository {
    create(task: Omit<Task, "id" | "assigneeId" | "version" | "createdAt" | "updatedAt">, tx?: any): Promise<Task>;
}
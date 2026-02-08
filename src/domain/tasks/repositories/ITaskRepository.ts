import { Task } from "../entities/Task";

export interface ITaskRepository {
    create(task: Omit<Task, "id" | "assigneeId" | "version" | "createdAt" | "updatedAt">, tx?: any): Promise<Task>;
    findById(taskId: string, tenantId: string, workspaceId: string, tx?: any): Promise<Task | null>;
    assignTask(taskId: string, assigneeId: string, expectedVersion: number, tenantId: string, workspaceId: string, tx?: any): Promise<Task>;
}
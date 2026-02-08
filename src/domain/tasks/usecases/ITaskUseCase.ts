import { Task } from "../entities/Task";
import { AssignTaskInput } from "../entities/AssignTaskInput";

export interface ITaskUseCase {
    create(task: Omit<Task, "id" | "assigneeId" | "version" | "createdAt" | "updatedAt">, idempotencyKey?: string): Promise<Task>;
    assign(input: AssignTaskInput, idempotencyKey?: string): Promise<Task>;
}

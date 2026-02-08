import { TaskEvent } from "../entities/TaskEvent";

export interface ITaskEventRepository {
    create(event: Omit<TaskEvent, "id" | "eventType" | "createdAt">, tx?: any): Promise<TaskEvent>;
}

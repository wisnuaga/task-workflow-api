import { CreateTaskInput } from "../dto/CreateTaskInput";
import { CreateTaskOutput } from "../dto/CreateTaskOutput";

export interface ITaskService {
    createTask(input: CreateTaskInput): Promise<CreateTaskOutput>;
}

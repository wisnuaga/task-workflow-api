import { CreateTaskInput } from "../dto/CreateTaskInput";
import { CreateTaskOutput } from "../dto/CreateTaskOutput";
import { AssignTaskInput } from "../dto/AssignTaskInput";
import { AssignTaskOutput } from "../dto/AssignTaskOutput";

export interface ITaskService {
    createTask(input: CreateTaskInput): Promise<CreateTaskOutput>;
    assignTask(input: AssignTaskInput): Promise<AssignTaskOutput>;
}

import type { DataSource, Repository } from "typeorm";

import { TaskInput } from "../models/TaskInput";

export class TaskInputRepository {
    private readonly repository: Repository<TaskInput>;

    constructor(dataSource: DataSource) {
        this.repository = dataSource.getRepository(TaskInput);
    }

    async saveIfNew(input: TaskInput): Promise<boolean> {
        const { taskId, eventId } = input;
        if (await this.repository.existsBy({ taskId, eventId })) return false;

        await this.repository.save(input);
        return true;
    }
}

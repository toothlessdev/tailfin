import {
    In,
    IsNull,
    LessThan,
    Not,
    type DataSource,
    type Repository,
} from "typeorm";

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

    /**
     * Oldest first: the prompt tells the model its inputs are in the order they arrived.
     * An input that failed `maxAttempts` times is given up on, so a broken one cannot repeat forever.
     */
    findUndelivered(taskId: number, maxAttempts: number): Promise<TaskInput[]> {
        return this.repository.find({
            where: {
                taskId,
                deliveredAt: IsNull(),
                attempts: LessThan(maxAttempts),
            },
            order: { createdAt: "ASC", id: "ASC" },
        });
    }

    /** The task with the oldest waiting input comes first, so a busy task cannot starve the others. */
    async findTaskIdsWithUndelivered(maxAttempts: number): Promise<number[]> {
        const rows = await this.repository
            .createQueryBuilder("input")
            .select("input.taskId", "taskId")
            .where("input.deliveredAt IS NULL")
            .andWhere("input.attempts < :maxAttempts", { maxAttempts })
            .groupBy("input.taskId")
            .orderBy("MIN(input.createdAt)", "ASC")
            .addOrderBy("MIN(input.id)", "ASC")
            .getRawMany<{ taskId: number }>();

        return rows.map((row) => row.taskId);
    }

    /** A delivered input means the task's session exists, which decides between start and resume. */
    hasDelivered(taskId: number): Promise<boolean> {
        return this.repository.existsBy({
            taskId,
            deliveredAt: Not(IsNull()),
        });
    }

    async markDelivered(ids: readonly number[]): Promise<void> {
        if (ids.length === 0) return;

        await this.repository.update(
            { id: In([...ids]) },
            { deliveredAt: new Date(), lastError: null },
        );
    }

    async recordFailure(
        ids: readonly number[],
        message: string,
    ): Promise<void> {
        if (ids.length === 0) return;

        await this.repository.increment({ id: In([...ids]) }, "attempts", 1);
        await this.repository.update(
            { id: In([...ids]) },
            { lastError: message },
        );
    }
}

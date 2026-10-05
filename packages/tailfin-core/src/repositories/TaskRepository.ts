import { Brackets, type DataSource, type Repository } from "typeorm";

import type { ExternalReference } from "../models/ExternalReference";
import { Task, type TaskStatus } from "../models/Task";

const CLOSED_STATUSES: TaskStatus[] = ["done", "dismissed"];

export class TaskRepository {
    private readonly repository: Repository<Task>;

    constructor(dataSource: DataSource) {
        this.repository = dataSource.getRepository(Task);
    }

    async findOpenTaskByReferences(
        references: readonly ExternalReference[],
    ): Promise<Task | null> {
        if (references.length === 0) return null;

        // `match` only filters.
        // `relatedReferences` is joined again to load every reference of the task, not just the matching ones.
        return this.repository
            .createQueryBuilder("task")
            .innerJoin("task.relatedReferences", "match")
            .leftJoinAndSelect("task.relatedReferences", "relatedReference")
            .where("task.status NOT IN (:...closedStatuses)", {
                closedStatuses: CLOSED_STATUSES,
            })
            .andWhere(
                new Brackets((matches) => {
                    references.forEach((reference, index) => {
                        matches.orWhere(
                            `(match.kind = :kind${index} AND match.key = :key${index})`,
                            {
                                [`kind${index}`]: reference.kind,
                                [`key${index}`]: reference.key,
                            },
                        );
                    });
                }),
            )
            .orderBy("task.createdAt", "DESC")
            .addOrderBy("task.id", "DESC")
            .getOne();
    }

    findById(id: number): Promise<Task | null> {
        return this.repository.findOneBy({ id });
    }

    findOpen(): Promise<Task[]> {
        return this.repository.find({
            where: { status: "open" },
            order: { createdAt: "DESC", id: "DESC" },
        });
    }

    findRecentlyDone(limit: number): Promise<Task[]> {
        return this.repository.find({
            where: { status: "done" },
            order: { updatedAt: "DESC", id: "DESC" },
            take: limit,
        });
    }

    findByOriginEventId(originEventId: string): Promise<Task | null> {
        return this.repository.findOneBy({ originEventId });
    }

    async recordBriefing(taskId: number, briefing: string): Promise<void> {
        await this.repository.update(
            { id: taskId },
            { briefing, briefedAt: new Date() },
        );
    }

    save(task: Task): Promise<Task> {
        return this.repository.save(task);
    }
}

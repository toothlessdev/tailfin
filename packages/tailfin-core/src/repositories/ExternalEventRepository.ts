import { IsNull, type DataSource, type Repository } from "typeorm";

import { ExternalEvent } from "../models/ExternalEvent";

export class ExternalEventRepository {
    private readonly repository: Repository<ExternalEvent>;

    constructor(dataSource: DataSource) {
        this.repository = dataSource.getRepository(ExternalEvent);
    }

    async saveIfNew(event: ExternalEvent): Promise<boolean> {
        if (await this.repository.existsBy({ id: event.id })) return false;

        await this.repository.save(event);
        return true;
    }

    findOldestUnrouted(): Promise<ExternalEvent | null> {
        return this.repository.findOne({
            where: { routedAt: IsNull() },
            order: { receivedAt: "ASC", occurredAt: "ASC", id: "ASC" },
        });
    }

    async markRouted(id: string): Promise<void> {
        await this.repository.update({ id }, { routedAt: new Date() });
    }
}

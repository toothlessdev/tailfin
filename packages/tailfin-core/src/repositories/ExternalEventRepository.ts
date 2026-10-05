import type { DataSource, Repository } from "typeorm";

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
}

import type { DataSource, Repository } from "typeorm";

import { ExternalReference } from "../models/ExternalReference";

export class ExternalReferenceRepository {
    private readonly repository: Repository<ExternalReference>;

    constructor(dataSource: DataSource) {
        this.repository = dataSource.getRepository(ExternalReference);
    }

    async findOrCreate(kind: string, key: string): Promise<ExternalReference> {
        await this.repository
            .createQueryBuilder()
            .insert()
            .values({ kind, key })
            .orIgnore()
            .execute();

        return this.repository.findOneByOrFail({ kind, key });
    }
}

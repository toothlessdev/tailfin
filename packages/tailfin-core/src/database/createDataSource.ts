import { DataSource } from "typeorm";

import { ExternalEvent } from "../models/ExternalEvent";
import { ExternalReference } from "../models/ExternalReference";
import { Task } from "../models/Task";

/**
 * `synchronize` reshapes the tables to match the entities on every start. That
 * is fine while the schema keeps changing, but it needs migrations before the
 * stored data matters.
 */
export function createDataSource(databasePath: string): DataSource {
    return new DataSource({
        type: "better-sqlite3",
        database: databasePath,
        entities: [ExternalEvent, ExternalReference, Task],
        synchronize: true,
    });
}

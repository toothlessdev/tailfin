import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import {
    ExternalEventBroker,
    ExternalEventRepository,
    ExternalReferenceRepository,
    ReferenceScanner,
    TaskPipeline,
    TaskRepository,
    TaskRouter,
    createDataSource,
    type StopWatching,
} from "tailfin-core";

import type { DaemonConfig } from "./config";

export interface RunningDaemon {
    readonly database: ReturnType<typeof createDataSource>;
    close(): Promise<void>;
}

export async function startDaemon(
    config: DaemonConfig,
): Promise<RunningDaemon> {
    mkdirSync(dirname(config.database), { recursive: true });
    const database = createDataSource(config.database);
    await database.initialize();

    const references = new ExternalReferenceRepository(database);
    const tasks = new TaskRepository(database);
    const router = new TaskRouter(
        [
            ...config.rules,
            ...config.plugins.flatMap((plugin) => plugin.rules()),
        ],
        references,
        tasks,
    );
    const pipeline = new TaskPipeline(tasks);
    const broker = new ExternalEventBroker(
        new ExternalEventRepository(database),
        references,
    );

    broker.consume(async (event) => {
        const routed = await router.route(event);
        if (!routed) {
            console.log(`[router] ${event.id} -> no rule wanted it`);
            return;
        }

        console.log(
            `[router] ${event.id} -> ${routed.rule.name}: ${routed.derivation.kind}`,
        );
        await pipeline.run(routed);
    });

    // Every scanner is collected first, so each source gets all of them combined.
    const referenceScanner = ReferenceScanner.compose([
        ...config.plugins.flatMap((plugin) => plugin.scanners()),
        ...config.scanners,
    ]);
    const sources = config.plugins.flatMap((plugin) =>
        plugin.createSources({ referenceScanner }),
    );

    const stopWatching: StopWatching[] = [];
    for (const source of sources) {
        if (source.push) {
            stopWatching.push(
                await source.push((event) => broker.publish(event)),
            );
        } else {
            console.warn(
                `[daemon] ${source.sourceName} has no push, and pull is not polled yet`,
            );
        }
    }

    return {
        database,
        async close() {
            for (const stop of stopWatching) await stop();
            await broker.idle();
            await database.destroy();
        },
    };
}

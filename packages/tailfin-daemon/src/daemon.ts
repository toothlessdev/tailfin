import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import {
    ClaudeCli,
    ExternalEventBroker,
    ExternalEventRepository,
    ExternalReferenceRepository,
    ReferenceScanner,
    Runner,
    SerialQueue,
    TaskInputRepository,
    TaskActionExecutor,
    TaskRepository,
    TaskRouter,
    createDataSource,
    type StopWatching,
} from "tailfin-core";

import type { DaemonConfig } from "./config/schema";

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
    const inputs = new TaskInputRepository(database);
    const executor = new TaskActionExecutor(tasks, inputs);
    const databaseQueue = new SerialQueue();
    const broker = new ExternalEventBroker(
        new ExternalEventRepository(database),
        references,
        databaseQueue,
    );

    const { sessions } = config;
    mkdirSync(sessions.workingDirectory, { recursive: true });
    const runner = new Runner(
        {
            tasks,
            inputs,
            cli: new ClaudeCli(sessions.timeoutSeconds * 1000),
            databaseQueue,
        },
        {
            permissions: {
                allowedTools: sessions.allowedTools,
                deniedReadPaths: sessions.deniedReadPaths,
            },
            prompt: sessions.prompt,
            workingDirectory: sessions.workingDirectory,
            maxAttempts: sessions.maxAttempts,
            model: sessions.model,
            onBriefing: async (task, briefing) => {
                console.log(`[briefing] task #${task.id}\n${briefing.result}`);
            },
        },
    );

    broker.consume(async (event) => {
        const routed = await router.route(event);
        if (!routed) {
            console.log(`[router] ${event.id} -> no rule wanted it`);
            return;
        }

        console.log(
            `[router] ${event.id} -> ${routed.rule.name}: ${routed.action.kind}`,
        );
        await executor.execute(routed);
        runner.wake();
    });
    runner.wake();

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
            await runner.idle();
            await database.destroy();
        },
    };
}

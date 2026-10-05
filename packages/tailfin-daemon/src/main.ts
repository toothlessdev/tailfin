import { existsSync } from "node:fs";

import { Task } from "tailfin-core";

import { startDaemon, type RunningDaemon } from "./daemon";
import { loadConfig } from "./config/load";

async function main(): Promise<void> {
    if (existsSync(".env")) process.loadEnvFile(".env");
    const config = await loadConfig();

    const daemon = await startDaemon(config);
    console.log(
        `[daemon] running ${config.plugins.map((plugin) => plugin.name).join(", ")}, database ${config.database}. Ctrl+C to stop.`,
    );

    for (const signal of ["SIGINT", "SIGTERM"] as const) {
        process.once(signal, () => void shutDown(daemon));
    }
}

async function shutDown(daemon: RunningDaemon): Promise<void> {
    await printTasks(daemon);
    await daemon.close();
    process.exit(0);
}

async function printTasks({ database }: RunningDaemon): Promise<void> {
    const tasks = await database
        .getRepository(Task)
        .find({ order: { id: "ASC" } });

    console.log(`\ntasks (${tasks.length}):`);
    for (const task of tasks) {
        const watching = task.relatedReferences
            .map((reference) => `${reference.kind}=${reference.key}`)
            .join(", ");

        console.log(
            `  #${task.id} ${task.status} "${task.title}"  watching: ${watching}`,
        );
    }
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});

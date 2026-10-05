import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { z } from "zod";
import { type DaemonConfig, TailfinConfigSchema } from "./schema";

const CONFIG_FILE_NAME = "tailfin.config.ts";

export async function loadConfig(
    configPath = CONFIG_FILE_NAME,
): Promise<DaemonConfig> {
    const absolutePath = resolve(configPath);
    if (!existsSync(absolutePath)) {
        throw new Error(
            `${configPath} not found. Copy tailfin.config.example.ts to ${configPath} and fill it in`,
        );
    }

    const loaded = (await import(pathToFileURL(absolutePath).href)) as {
        default?: unknown;
    };

    const result = TailfinConfigSchema.safeParse(loaded.default);

    if (!result.success) {
        throw new Error(
            `Invalid ${configPath}\n${z.prettifyError(result.error)}`,
        );
    }
    return result.data;
}

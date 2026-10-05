import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { z } from "zod";

import { tailfinConfigSchema, type DaemonConfig } from "./config";

const CONFIG_FILE_NAME = "tailfin.config.ts";

/**
 * Plugins read their own settings, including secrets from the environment, when
 * the config file builds them. Load `.env` before calling this.
 */
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
    const result = tailfinConfigSchema.safeParse(loaded.default);
    if (!result.success) {
        throw new Error(
            `Invalid ${configPath}\n${z.prettifyError(result.error)}`,
        );
    }
    return result.data;
}

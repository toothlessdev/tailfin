import {
    TailfinPlugin,
    type ReferenceScanner,
    type TaskRouterRule,
} from "tailfin-core";

import { z } from "zod";

export const TailfinConfigSchema = z.strictObject({
    database: z.string().default(".local/tailfin.sqlite"),

    plugins: z
        .array(
            z.custom<TailfinPlugin>(
                (value) => value instanceof TailfinPlugin,
                "must be a plugin, like new SlackPlugin({ ... })",
            ),
        )
        .default([]),

    rules: z
        .array(
            z.custom<TaskRouterRule>((value: unknown) => {
                const rule = value as Partial<TaskRouterRule> | null;
                return (
                    typeof rule?.name === "string" &&
                    typeof rule.sourceName === "string" &&
                    typeof rule.derive === "function"
                );
            }, "must have name, sourceName and derive()"),
        )
        .default([]),

    scanners: z
        .array(
            z.custom<ReferenceScanner>((value: unknown) => {
                return (
                    typeof (value as Partial<ReferenceScanner> | null)?.scan ===
                    "function"
                );
            }, "must have scan()"),
        )
        .default([]),
});

/** What `tailfin.config.ts` exports. Secrets such as tokens stay in `.env`. */
export type TailfinConfig = z.input<typeof TailfinConfigSchema>;
export type DaemonConfig = z.output<typeof TailfinConfigSchema>;

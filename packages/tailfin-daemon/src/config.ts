import {
    TailfinPlugin,
    type ReferenceScanner,
    type TaskRouterRule,
} from "tailfin-core";
import { z } from "zod";

const isRule = (value: unknown): boolean => {
    const rule = value as Partial<TaskRouterRule> | null;

    return (
        typeof rule?.name === "string" &&
        typeof rule.sourceName === "string" &&
        typeof rule.derive === "function"
    );
};

const isScanner = (value: unknown): boolean =>
    typeof (value as Partial<ReferenceScanner> | null)?.scan === "function";

export const tailfinConfigSchema = z.strictObject({
    /** Defaults to `.local/tailfin.sqlite`. */
    database: z.string().default(".local/tailfin.sqlite"),
    /** One per external system, like `new SlackPlugin({ ... })`. */
    plugins: z
        .array(
            z.custom<TailfinPlugin>(
                (value) => value instanceof TailfinPlugin,
                "must be a plugin, like new SlackPlugin({ ... })",
            ),
        )
        .default([]),
    /** Your own rules. Asked before the plugins' rules, so they can override them. */
    rules: z
        .array(
            z.custom<TaskRouterRule>(
                isRule,
                "must have name, sourceName and derive()",
            ),
        )
        .default([]),
    scanners: z
        .array(z.custom<ReferenceScanner>(isScanner, "must have scan()"))
        .default([]),
});

/** What `tailfin.config.ts` exports. Secrets such as tokens stay in `.env`. */
export type TailfinConfig = z.input<typeof tailfinConfigSchema>;
export type DaemonConfig = z.output<typeof tailfinConfigSchema>;

/** Returns its argument. It exists so a config file gets its types without annotating. */
export function defineConfig(config: TailfinConfig): TailfinConfig {
    return config;
}

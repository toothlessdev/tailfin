import {
    ACTING_TOOLS,
    TailfinPlugin,
    isReadOnlyTool,
    type ReferenceScanner,
    type TaskRouterRule,
} from "tailfin-core";

import { z } from "zod";

const READ_ONLY_TOOLS = ["Read", "Grep", "Glob"];

/**
 * Sessions read text that other people wrote, so reading must not reach secrets.
 * The config can only add to this list: replacing it would let a typo remove the protection.
 */
const PROTECTED_READ_PATHS = [
    "**/.env",
    "**/.env.*",
    "**/*.pem",
    "**/*.key",
    "~/.ssh/**",
    "~/.aws/**",
    "~/.gnupg/**",
    "~/.kube/**",
    "~/.npmrc",
    "~/.netrc",
];

const modePromptSchema = z
    .strictObject({
        /** Asked last. Empty by default: the user decides what to ask and in which language. */
        request: z.string().default(""),
        /** Trusted lines placed after the fixed rules, which the config cannot replace. */
        extraInstructions: z.array(z.string().min(1)).default([]),
    })
    .prefault({});

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

    sessions: z
        .strictObject({
            /** Read-only tools to add, such as `mcp__atlassian__getJiraIssue` or `WebFetch(domain:docs.example.com)`. */
            extraAllowedTools: z
                .array(
                    z
                        .string()
                        .min(1)
                        .refine(
                            isReadOnlyTool,
                            `sessions are read-only: ${ACTING_TOOLS.join(", ")} cannot be allowed, and WebFetch needs one host like WebFetch(domain:docs.example.com)`,
                        ),
                )
                .default([]),
            extraDeniedReadPaths: z.array(z.string().min(1)).default([]),
            prompt: z
                .strictObject({
                    start: modePromptSchema,
                    resume: modePromptSchema,
                })
                .prefault({}),
        })
        .transform(({ extraAllowedTools, extraDeniedReadPaths, prompt }) => ({
            allowedTools: [...READ_ONLY_TOOLS, ...extraAllowedTools],
            deniedReadPaths: [...PROTECTED_READ_PATHS, ...extraDeniedReadPaths],
            prompt,
        }))
        .prefault({}),
});

/** What `tailfin.config.ts` exports. Secrets such as tokens stay in `.env`. */
export type TailfinConfig = z.input<typeof TailfinConfigSchema>;
export type DaemonConfig = z.output<typeof TailfinConfigSchema>;

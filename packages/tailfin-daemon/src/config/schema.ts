import {
    TailfinPlugin,
    type ReferenceScanner,
    type TaskRouterRule,
} from "tailfin-core";

import { z } from "zod";

const READ_ONLY_TOOLS = ["Read", "Grep", "Glob"];

/** Tools that write or run commands, so a session must never be given them. */
const ACTING_TOOL_PATTERN = /^(Bash|Write|Edit|NotebookEdit)(\(|$)/;

/**
 * A fetch to any host can carry data out in the URL, so it is only allowed for one named host.
 * `WebSearch` stays allowed but is not a default: every query leaves the company.
 */
const WEB_FETCH_PATTERN = /^WebFetch(\(|$)/;
const SINGLE_HOST_WEB_FETCH_PATTERN = /^WebFetch\(domain:[^*()\s]+\)$/;

function isReadOnlyTool(tool: string): boolean {
    if (WEB_FETCH_PATTERN.test(tool)) {
        return SINGLE_HOST_WEB_FETCH_PATTERN.test(tool);
    }
    return !ACTING_TOOL_PATTERN.test(tool);
}

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
                            "sessions are read-only: Bash, Write, Edit and NotebookEdit cannot be allowed, and WebFetch needs one host like WebFetch(domain:docs.example.com)",
                        ),
                )
                .default([]),
            extraDeniedReadPaths: z.array(z.string().min(1)).default([]),
        })
        .transform(({ extraAllowedTools, extraDeniedReadPaths }) => ({
            allowedTools: [...READ_ONLY_TOOLS, ...extraAllowedTools],
            deniedReadPaths: [...PROTECTED_READ_PATHS, ...extraDeniedReadPaths],
        }))
        .prefault({}),
});

/** What `tailfin.config.ts` exports. Secrets such as tokens stay in `.env`. */
export type TailfinConfig = z.input<typeof TailfinConfigSchema>;
export type DaemonConfig = z.output<typeof TailfinConfigSchema>;

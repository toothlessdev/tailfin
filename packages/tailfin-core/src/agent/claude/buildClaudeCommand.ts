import { ACTING_TOOLS } from "../policy/readOnly";

export interface ReadOnlySessionPermissions {
    readonly allowedTools: readonly string[];
    readonly deniedReadPaths: readonly string[];
}

export interface ClaudeInvocation {
    readonly sessionId: string;
    /** `start` creates the session with this id, `resume` continues an existing one. */
    readonly mode: "start" | "resume";
    readonly prompt: string;
    readonly permissions: ReadOnlySessionPermissions;
    readonly model?: string;
}

export interface ClaudeCommand {
    readonly commandLineArguments: string[];
    readonly standardInput: string;
}

export function buildClaudeCommand({
    sessionId,
    mode,
    prompt,
    permissions,
    model,
}: ClaudeInvocation): ClaudeCommand {
    return {
        commandLineArguments: [
            "-p",
            mode === "start" ? "--session-id" : "--resume",
            sessionId,
            "--output-format",
            "json",
            ...(model ? ["--model", model] : []),
            "--permission-mode",
            "dontAsk",
            // Variadic flags would fail with no value, so an empty list leaves the flag out.
            ...(permissions.allowedTools.length > 0
                ? ["--allowedTools", ...permissions.allowedTools]
                : []),
            // Leaving Bash out of the allow list is not enough: read-only shell commands such as `cat` still run.
            "--disallowedTools",
            ...ACTING_TOOLS,
            ...permissions.deniedReadPaths.map((path) => `Read(${path})`),
        ],
        // A prompt that starts with a dash is parsed as an option, and the text is not ours to control.
        standardInput: prompt,
    };
}

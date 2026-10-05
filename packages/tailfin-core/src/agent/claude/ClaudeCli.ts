import { execFile, type ExecFileException } from "node:child_process";
import { promisify } from "node:util";

import type { ClaudeCommand } from "./buildClaudeCommand";
import { ClaudeError, ClaudeFailedError, excerpt } from "./ClaudeError";

const execFileAsync = promisify(execFile);

/** The default of 1 MB would kill a long answer. */
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;

type ExecFailure = ExecFileException & { stdout?: string; stderr?: string };

export interface ClaudeResult {
    readonly result: string;
    readonly deniedTools: readonly string[];
}

interface ProcessOutput {
    readonly exitCode: number | null;
    readonly signal: NodeJS.Signals | null;
    readonly standardOutput: string;
    readonly standardError: string;
}

export class ClaudeCli {
    constructor(
        private readonly timeoutMs: number,
        private readonly executable = "claude",
    ) {}

    /** Throws a `ClaudeError` for every failure, so the caller handles them in one place. */
    async run(
        command: ClaudeCommand,
        workingDirectory: string,
    ): Promise<ClaudeResult> {
        const output = await this.execute(command, workingDirectory);
        return this.interpret(output);
    }

    private async execute(
        command: ClaudeCommand,
        workingDirectory: string,
    ): Promise<ProcessOutput> {
        const pending = execFileAsync(
            this.executable,
            command.commandLineArguments,
            {
                cwd: workingDirectory,
                timeout: this.timeoutMs,
                maxBuffer: MAX_OUTPUT_BYTES,
                encoding: "utf8",
            },
        );

        // A process that exits before reading its input would otherwise crash this one with EPIPE.
        pending.child.stdin?.on("error", () => {});
        pending.child.stdin?.end(command.standardInput);

        try {
            const { stdout, stderr } = await pending;
            return {
                exitCode: 0,
                signal: null,
                standardOutput: stdout,
                standardError: stderr,
            };
        } catch (error) {
            const failure = error as ExecFailure;

            // A string code (ENOENT, a cut-off output) means no exit status exists to report.
            if (typeof failure.code === "string") {
                throw new ClaudeFailedError(
                    `Could not run ${this.executable}: ${failure.message}`,
                    { cause: failure },
                );
            }
            return {
                exitCode: failure.code ?? null,
                signal: failure.signal ?? null,
                standardOutput: failure.stdout ?? "",
                standardError: failure.stderr ?? "",
            };
        }
    }

    private interpret(output: ProcessOutput): ClaudeResult {
        const combinedText = `${output.standardError}\n${output.standardOutput}`;
        const describedError = ClaudeError.fromCliText(combinedText);
        if (describedError) throw describedError;

        if (output.signal) {
            throw new ClaudeFailedError(
                `claude was stopped by ${output.signal}, which is the ${this.timeoutMs} ms timeout unless something else killed it`,
            );
        }
        if (output.exitCode !== 0) {
            throw new ClaudeFailedError(
                `claude exited with ${output.exitCode}: ${excerpt(combinedText)}`,
            );
        }

        return parseResult(output.standardOutput);
    }
}

function parseResult(standardOutput: string): ClaudeResult {
    let parsed: unknown;
    try {
        parsed = JSON.parse(standardOutput);
    } catch (error) {
        throw new ClaudeFailedError(
            `claude printed something that is not JSON: ${excerpt(standardOutput)}`,
            { cause: error },
        );
    }

    const { result, is_error, permission_denials } = (parsed ?? {}) as {
        result?: unknown;
        is_error?: unknown;
        permission_denials?: unknown;
    };
    if (typeof result !== "string") {
        throw new ClaudeFailedError(
            `claude printed JSON without a result: ${excerpt(standardOutput)}`,
        );
    }
    if (is_error === true) {
        throw new ClaudeFailedError(excerpt(result));
    }

    return { result, deniedTools: toolNamesOf(permission_denials) };
}

function toolNamesOf(permissionDenials: unknown): string[] {
    if (!Array.isArray(permissionDenials)) return [];

    return permissionDenials.flatMap((denial: { tool_name?: unknown }) =>
        typeof denial?.tool_name === "string" ? [denial.tool_name] : [],
    );
}

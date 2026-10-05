import { randomUUID } from "node:crypto";

import type { Task } from "../models/Task";
import type { TaskInput } from "../models/TaskInput";
import type { SerialQueue } from "../queue/SerialQueue";
import type { TaskInputRepository } from "../repositories/TaskInputRepository";
import type { TaskRepository } from "../repositories/TaskRepository";
import { buildSessionPrompt, type SessionPrompt } from "./buildSessionPrompt";
import {
    buildClaudeCommand,
    type ReadOnlySessionPermissions,
} from "./claude/buildClaudeCommand";
import type { ClaudeCli, ClaudeResult } from "./claude/ClaudeCli";
import {
    ClaudeError,
    SessionAlreadyExistsError,
    SessionNotFoundError,
} from "./claude/ClaudeError";

type SessionMode = "start" | "resume";

export interface RunnerDependencies {
    readonly tasks: TaskRepository;
    readonly inputs: TaskInputRepository;
    readonly cli: ClaudeCli;
    /** The same queue the broker uses: every database step goes through it. */
    readonly databaseQueue: SerialQueue;
}

export interface RunnerSettings {
    readonly permissions: ReadOnlySessionPermissions;
    readonly prompt: SessionPrompt;
    readonly workingDirectory: string;
    readonly maxAttempts: number;
    readonly model?: string;
    readonly onBriefing: (task: Task, briefing: ClaudeResult) => Promise<void>;
}

interface TaskWork {
    readonly task: Task;
    readonly inputs: readonly TaskInput[];
    readonly sessionId: string;
    readonly mode: SessionMode;
}

/**
 * Feeds each task's waiting inputs to its read-only session, one session at a
 * time. Waking it only sets a flag, so the caller never waits for a session.
 */
export class Runner {
    private processing: Promise<void> | null = null;
    private hasWork = false;

    constructor(
        private readonly dependencies: RunnerDependencies,
        private readonly settings: RunnerSettings,
    ) {}

    wake(): void {
        this.hasWork = true;
        if (this.processing) return;

        this.processing = this.processWhileWork();
    }

    async idle(): Promise<void> {
        while (this.processing) await this.processing;
    }

    private async processWhileWork(): Promise<void> {
        try {
            while (this.hasWork) {
                this.hasWork = false;

                const taskIds = await this.databaseQueue.run(() =>
                    this.dependencies.inputs.findTaskIdsWithUndelivered(
                        this.settings.maxAttempts,
                    ),
                );
                for (const taskId of taskIds) {
                    await this.runTaskLoggingBugs(taskId);
                }
            }
        } finally {
            this.processing = null;
        }
    }

    /** A bug in one task's run is logged, not hidden, and does not stop the other tasks. */
    private async runTaskLoggingBugs(taskId: number): Promise<void> {
        try {
            await this.runTask(taskId);
        } catch (error) {
            console.error(`[runner] task #${taskId} hit a bug`, error);
        }
    }

    private async runTask(taskId: number): Promise<void> {
        const work = await this.databaseQueue.run(() => this.loadWork(taskId));
        if (!work) return;

        const inputIds = work.inputs.map((input) => input.id);
        let briefing: ClaudeResult;
        try {
            briefing = await this.converse(work);
        } catch (error) {
            if (!(error instanceof ClaudeError)) throw error;

            console.error(
                `[runner] task #${taskId} ${work.mode} failed: ${error.message}`,
            );
            await this.databaseQueue.run(() =>
                this.dependencies.inputs.recordFailure(inputIds, error.message),
            );
            return;
        }

        await this.databaseQueue.run(() =>
            this.dependencies.inputs.markDelivered(inputIds),
        );
        await this.deliverBriefing(work.task, briefing);
    }

    private async loadWork(taskId: number): Promise<TaskWork | null> {
        const { tasks, inputs } = this.dependencies;

        const task = await tasks.findById(taskId);
        if (!task || task.status !== "open") return null;

        const waiting = await inputs.findUndelivered(
            taskId,
            this.settings.maxAttempts,
        );
        if (waiting.length === 0) return null;

        let mode: SessionMode = "start";
        if (await inputs.hasDelivered(taskId)) mode = "resume";

        return {
            task,
            inputs: waiting,
            sessionId: await this.ensureSessionId(task),
            mode,
        };
    }

    /** Tasks saved before the column existed have none. */
    private async ensureSessionId(task: Task): Promise<string> {
        if (task.sessionId === null) {
            task.sessionId = randomUUID();
            await this.dependencies.tasks.save(task);
        }
        return task.sessionId;
    }

    private async converse(work: TaskWork): Promise<ClaudeResult> {
        try {
            return await this.invoke(work, work.mode);
        } catch (error) {
            const otherMode = modeToSwitchTo(error);
            if (!otherMode) throw error;

            return this.invoke(work, otherMode);
        }
    }

    private invoke(work: TaskWork, mode: SessionMode): Promise<ClaudeResult> {
        const prompt = buildSessionPrompt({
            mode,
            task: work.task,
            inputs: work.inputs,
            prompt: this.settings.prompt,
        });
        const command = buildClaudeCommand({
            sessionId: work.sessionId,
            mode,
            prompt,
            permissions: this.settings.permissions,
            model: this.settings.model,
        });

        console.log(
            `[runner] task #${work.task.id} ${mode} with ${work.inputs.length} input(s)`,
        );
        return this.dependencies.cli.run(
            command,
            this.settings.workingDirectory,
        );
    }

    /** The session already ran, so a failure here must not run it again. */
    private async deliverBriefing(
        task: Task,
        briefing: ClaudeResult,
    ): Promise<void> {
        try {
            await this.settings.onBriefing(task, briefing);
        } catch (error) {
            console.error(
                `[runner] task #${task.id} briefing not delivered`,
                error,
            );
        }
    }

    private get databaseQueue(): SerialQueue {
        return this.dependencies.databaseQueue;
    }
}

/** What the CLI says about the session decides the way back, so the caller does not guess. */
function modeToSwitchTo(error: unknown): SessionMode | null {
    if (error instanceof SessionAlreadyExistsError) return "resume";
    if (error instanceof SessionNotFoundError) return "start";
    return null;
}

import type { Task } from "../models/Task";
import type { TaskInput } from "../models/TaskInput";
import { StructuredPrompt } from "./StructuredPrompt";

export interface ModePrompt {
    /** Asked last, after the task and its inputs. */
    readonly request: string;
    /** Trusted lines from the config, placed after the fixed rules. */
    readonly extraInstructions: readonly string[];
}

export interface SessionPrompt {
    readonly start: ModePrompt;
    readonly resume: ModePrompt;
}

type QueuedInput = Pick<TaskInput, "eventId" | "text">;

export interface SessionPromptRequest {
    /** `start` gets the whole task, `resume` only what is new. */
    readonly mode: "start" | "resume";
    readonly task: Pick<
        Task,
        "title" | "description" | "relatedReferences" | "originEventId"
    >;
    readonly inputs: readonly QueuedInput[];
    readonly prompt: SessionPrompt;
}

export function buildSessionPrompt({
    mode,
    task,
    inputs,
    prompt,
}: SessionPromptRequest): string {
    if (mode === "resume" && inputs.length === 0) {
        throw new Error("A resumed session needs at least one new input");
    }

    // The event that created the task is queued as an input to start the session, but its
    // text is already the task's description.
    const inputTexts = inputs
        .filter((input) => input.eventId !== task.originEventId)
        .map((input) => input.text);

    if (mode === "start") {
        return StructuredPrompt.start()
            .instructions(prompt.start.extraInstructions)
            .task({
                title: task.title,
                description: task.description,
                references: task.relatedReferences.map(
                    (reference) => `${reference.kind}=${reference.key}`,
                ),
            })
            .inputs(inputTexts)
            .instructions(prompt.start.request)
            .build();
    }

    return StructuredPrompt.resume()
        .instructions(prompt.resume.extraInstructions)
        .inputs(inputTexts)
        .instructions(prompt.resume.request)
        .build();
}

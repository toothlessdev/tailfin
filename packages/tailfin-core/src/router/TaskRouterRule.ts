import type { ExternalEvent } from "../models/ExternalEvent";
import type { ExternalReference } from "../models/ExternalReference";
import type { Task } from "../models/Task";

/** What a rule fills in to request a new task. The daemon assigns id, status and timestamps. */
export interface TaskDraft {
    readonly title: string;
    readonly description: string;
    readonly references: readonly ExternalReference[];
}

export type Derivation =
    | { readonly kind: "ignore" }
    | { readonly kind: "create"; readonly draft: TaskDraft }
    /** `references` are added to the task. `input`, when present, goes to its session as a follow-up. */
    | {
          readonly kind: "update";
          readonly references?: readonly ExternalReference[];
          readonly input?: string;
      }
    | { readonly kind: "close"; readonly reason: string };

/**
 * Decides what to do with events from one source (a mention, a saved message,
 * a review request). The router receives rules by injection and several rules
 * can listen to the same source.
 */
export interface TaskRouterRule {
    /** @example "slack/mention" */
    readonly name: string;

    readonly sourceName: string;

    /** `existingTask` is the open task whose references overlap the event's, if any. */
    derive(event: ExternalEvent, existingTask: Task | null): Derivation;
}

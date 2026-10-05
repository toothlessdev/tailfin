import type { ExternalEvent } from "../models/ExternalEvent";
import type { ExternalReference } from "../models/ExternalReference";
import type { Task } from "../models/Task";

/** What a rule fills in to request a new task. The daemon assigns id, status and timestamps. */
export type TaskDraft = Pick<
    Task,
    "title" | "description" | "relatedReferences"
>;

export type TaskAction =
    | { readonly kind: "ignore" }
    | { readonly kind: "create"; readonly draft: TaskDraft }
    | {
          readonly kind: "update";
          /** Added to the task's related references. Empty when only `input` matters. */
          readonly addedReferences: readonly ExternalReference[];
          /** Goes to the task's session as a follow-up, when present. */
          readonly input?: string;
      }
    | { readonly kind: "close"; readonly reason: string };

export interface TaskRouterRule {
    /**
     * sourceName.referenceKind.purpose
     * @example "slack.thread.mention"
     */
    readonly name: string;

    readonly sourceName: string;

    /** `existingTask` is the open task whose references overlap the event's, if any. */
    decide(event: ExternalEvent, existingTask: Task | null): TaskAction;
}

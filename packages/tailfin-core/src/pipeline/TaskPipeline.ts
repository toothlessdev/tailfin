import type { ExternalReference } from "../models/ExternalReference";
import { Task } from "../models/Task";
import type { TaskRepository } from "../repositories/TaskRepository";
import type { RoutedEvent } from "../router/TaskRouter";
import type { TaskDraft } from "../router/TaskRouterRule";

export class TaskPipeline {
    constructor(private readonly tasks: TaskRepository) {}

    async run({ event, derivation, existingTask }: RoutedEvent): Promise<void> {
        switch (derivation.kind) {
            case "create":
                await this.create(event.id, derivation.draft);
                return;
            case "update":
                await this.addReferences(
                    requireTask(existingTask, derivation.kind),
                    derivation.addedReferences,
                );
                return;
            case "close":
                await this.close(requireTask(existingTask, derivation.kind));
                return;
            case "ignore":
                return;
        }
    }

    /** A replayed event finds the task it already made and does nothing. */
    private async create(eventId: string, draft: TaskDraft): Promise<void> {
        if (await this.tasks.findByOriginEventId(eventId)) return;

        await this.tasks.save(new Task({ originEventId: eventId, ...draft }));
    }

    private async addReferences(
        task: Task,
        addedReferences: readonly ExternalReference[],
    ): Promise<void> {
        const watchedIds = new Set(
            task.relatedReferences.map((reference) => reference.id),
        );
        const newReferences = addedReferences.filter(
            (reference) => !watchedIds.has(reference.id),
        );
        if (newReferences.length === 0) return;

        task.relatedReferences = [...task.relatedReferences, ...newReferences];
        await this.tasks.save(task);
    }

    private async close(task: Task): Promise<void> {
        task.status = "done";
        await this.tasks.save(task);
    }
}

function requireTask(task: Task | null, derivationKind: string): Task {
    if (!task) {
        throw new Error(`The ${derivationKind} derivation needs an open task`);
    }
    return task;
}

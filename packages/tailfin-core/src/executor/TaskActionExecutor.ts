import type { ExternalReference } from "../models/ExternalReference";
import { Task } from "../models/Task";
import { TaskInput } from "../models/TaskInput";
import type { TaskInputRepository } from "../repositories/TaskInputRepository";
import type { TaskRepository } from "../repositories/TaskRepository";
import type { RoutedEvent } from "../router/TaskRouter";
import type { TaskDraft } from "../router/TaskRouterRule";

export class TaskActionExecutor {
    constructor(
        private readonly tasks: TaskRepository,
        private readonly inputs: TaskInputRepository,
    ) {}

    async execute({ event, action, existingTask }: RoutedEvent): Promise<void> {
        switch (action.kind) {
            case "create":
                await this.create(event.id, action.draft);
                return;
            case "update": {
                const task = requireTask(existingTask, action.kind);
                await this.addReferences(task, action.addedReferences);
                if (action.input) {
                    await this.queueInput(task, event.id, action.input);
                }
                return;
            }
            case "close":
                await this.close(requireTask(existingTask, action.kind));
                return;
            case "ignore":
                return;
        }
    }

    /**
     * The creating event is also queued as an input, which is what makes the runner
     * brief the new task. A replay finds the task it already made, and queues the
     * input again only if the first run died before doing so.
     */
    private async create(eventId: string, draft: TaskDraft): Promise<void> {
        let task = await this.tasks.findByOriginEventId(eventId);
        if (!task) {
            task = await this.tasks.save(
                new Task({ originEventId: eventId, ...draft }),
            );
        }

        await this.queueInput(task, eventId, draft.description);
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

    /** A replayed event finds the input it already queued and does nothing. */
    private async queueInput(
        task: Task,
        eventId: string,
        text: string,
    ): Promise<void> {
        await this.inputs.saveIfNew(
            new TaskInput({ taskId: task.id, eventId, text }),
        );
    }

    private async close(task: Task): Promise<void> {
        task.status = "done";
        await this.tasks.save(task);
    }
}

function requireTask(task: Task | null, actionKind: string): Task {
    if (!task) {
        throw new Error(`The ${actionKind} action needs an open task`);
    }
    return task;
}

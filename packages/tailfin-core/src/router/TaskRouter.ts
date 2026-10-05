import type { ExternalEvent } from "../models/ExternalEvent";
import type { Task } from "../models/Task";
import type { ExternalReferenceRepository } from "../repositories/ExternalReferenceRepository";
import type { TaskRepository } from "../repositories/TaskRepository";
import type { TaskAction, TaskRouterRule } from "./TaskRouterRule";

export interface RoutedEvent {
    readonly event: ExternalEvent;
    readonly rule: TaskRouterRule;
    readonly action: TaskAction;

    readonly existingTask: Task | null;
}

export class TaskRouter {
    constructor(
        private readonly rules: readonly TaskRouterRule[],
        private readonly references: ExternalReferenceRepository,
        private readonly tasks: TaskRepository,
    ) {}

    async route(event: ExternalEvent): Promise<RoutedEvent | null> {
        const existingTask = await this.tasks.findOpenTaskByReferences(
            event.references,
        );

        for (const rule of this.rules) {
            if (rule.sourceName !== event.sourceName) continue;

            const action = rule.decide(event, existingTask);
            if (action.kind === "ignore") continue;

            return {
                event,
                rule,
                action: await this.withStoredReferences(action),
                existingTask,
            };
        }
        return null;
    }

    private async withStoredReferences(
        action: TaskAction,
    ): Promise<TaskAction> {
        switch (action.kind) {
            case "create":
                return {
                    ...action,
                    draft: {
                        ...action.draft,
                        relatedReferences:
                            await this.references.findOrCreateAll(
                                action.draft.relatedReferences,
                            ),
                    },
                };
            case "update":
                return {
                    ...action,
                    addedReferences: await this.references.findOrCreateAll(
                        action.addedReferences,
                    ),
                };
            default:
                return action;
        }
    }
}

import type { ExternalEvent } from "../models/ExternalEvent";
import type { Task } from "../models/Task";
import type { ExternalReferenceRepository } from "../repositories/ExternalReferenceRepository";
import type { TaskRepository } from "../repositories/TaskRepository";
import type { Derivation, TaskRouterRule } from "./TaskRouterRule";

export interface RoutedEvent {
    readonly event: ExternalEvent;
    readonly rule: TaskRouterRule;
    readonly derivation: Derivation;

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

            const derivation = rule.derive(event, existingTask);
            if (derivation.kind === "ignore") continue;

            return {
                event,
                rule,
                derivation: await this.withStoredReferences(derivation),
                existingTask,
            };
        }
        return null;
    }

    private async withStoredReferences(
        derivation: Derivation,
    ): Promise<Derivation> {
        switch (derivation.kind) {
            case "create":
                return {
                    ...derivation,
                    draft: {
                        ...derivation.draft,
                        relatedReferences:
                            await this.references.findOrCreateAll(
                                derivation.draft.relatedReferences,
                            ),
                    },
                };
            case "update":
                return {
                    ...derivation,
                    addedReferences: await this.references.findOrCreateAll(
                        derivation.addedReferences,
                    ),
                };
            default:
                return derivation;
        }
    }
}

import type { ExternalEvent } from "../models/ExternalEvent";
import type { ExternalReference } from "../models/ExternalReference";
import type { Task } from "../models/Task";
import type { ExternalEventRepository } from "../repositories/ExternalEventRepository";
import type { ExternalReferenceRepository } from "../repositories/ExternalReferenceRepository";
import type { TaskRepository } from "../repositories/TaskRepository";
import type { Derivation, TaskRouterRule } from "./TaskRouterRule";

export interface RoutedEvent {
    readonly rule: TaskRouterRule;
    readonly derivation: Derivation;

    /** The open task the event's references matched. Present for `update` and `close`. */
    readonly existingTask: Task | null;
}

export class TaskRouter {
    constructor(
        private readonly rules: readonly TaskRouterRule[],
        private readonly events: ExternalEventRepository,
        private readonly references: ExternalReferenceRepository,
        private readonly tasks: TaskRepository,
    ) {}

    /** `null` when the event is a redelivery, or when no rule wants it. */
    async route(event: ExternalEvent): Promise<RoutedEvent | null> {
        event.references = await this.storedReferencesOf(event.references);
        if (!(await this.events.saveIfNew(event))) return null;

        const existingTask = await this.tasks.findOpenTaskByReferences(
            event.references,
        );

        for (const rule of this.rules) {
            if (rule.sourceName !== event.sourceName) continue;

            const derivation = rule.derive(event, existingTask);
            if (derivation.kind === "ignore") continue;

            return {
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
                        relatedReferences: await this.storedReferencesOf(
                            derivation.draft.relatedReferences,
                        ),
                    },
                };
            case "update":
                return {
                    ...derivation,
                    addedReferences: await this.storedReferencesOf(
                        derivation.addedReferences,
                    ),
                };
            default:
                return derivation;
        }
    }

    /**
     * Sources and rules build new `ExternalReference` objects even for
     * references already stored. Swap in the stored row, or the cascade insert
     * breaks the unique constraint. Duplicates inside one list are merged first.
     */
    private async storedReferencesOf(
        references: readonly ExternalReference[],
    ): Promise<ExternalReference[]> {
        const referenceByKindAndKey = new Map(
            references.map((reference) => [
                JSON.stringify([reference.kind, reference.key]),
                reference,
            ]),
        );

        const stored: ExternalReference[] = [];
        for (const { kind, key } of referenceByKindAndKey.values()) {
            stored.push(await this.references.findOrCreate(kind, key));
        }
        return stored;
    }
}

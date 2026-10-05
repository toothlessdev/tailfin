import type { ExternalEvent } from "../models/ExternalEvent";
import type { ExternalEventRepository } from "../repositories/ExternalEventRepository";
import type { ExternalReferenceRepository } from "../repositories/ExternalReferenceRepository";

export class ExternalEventBroker {
    private publishing: Promise<unknown> = Promise.resolve();

    constructor(
        private readonly events: ExternalEventRepository,
        private readonly references: ExternalReferenceRepository,
    ) {}

    publish(event: ExternalEvent): Promise<void> {
        const stored = this.publishing.then(() => this.store(event));
        this.publishing = stored.catch(() => undefined);

        return stored;
    }

    private async store(event: ExternalEvent): Promise<void> {
        event.references = await this.references.findOrCreateAll(
            event.references,
        );
        await this.events.saveIfNew(event);
    }
}

import type { ExternalEvent } from "../models/ExternalEvent";
import type { ExternalEventRepository } from "../repositories/ExternalEventRepository";
import type { ExternalReferenceRepository } from "../repositories/ExternalReferenceRepository";

type EventHandler = (event: ExternalEvent) => Promise<void>;

export class ExternalEventBroker {
    private handler: EventHandler | null = null;
    private publishing: Promise<unknown> = Promise.resolve();
    private processing: Promise<void> | null = null;
    private hasWork = false;

    constructor(
        private readonly events: ExternalEventRepository,
        private readonly references: ExternalReferenceRepository,
    ) {}

    publish(event: ExternalEvent): Promise<void> {
        const stored = this.publishing.then(() => this.store(event));
        this.publishing = stored.catch(() => undefined);

        return stored;
    }

    consume(handler: EventHandler): void {
        this.handler = handler;
        this.wake();
    }

    private async store(event: ExternalEvent): Promise<void> {
        event.references = await this.references.findOrCreateAll(
            event.references,
        );
        await this.events.saveIfNew(event);

        this.wake();
    }

    private wake(): void {
        this.hasWork = true;
        if (this.processing || !this.handler) return;

        this.processing = this.processWhileWork(this.handler);
    }

    private async processWhileWork(handler: EventHandler): Promise<void> {
        try {
            while (this.hasWork) {
                this.hasWork = false;
                await this.routeUnroutedEvents(handler);
            }
        } finally {
            this.processing = null;
        }
    }

    private async routeUnroutedEvents(handler: EventHandler): Promise<void> {
        for (
            let event = await this.events.findOldestUnrouted();
            event;
            event = await this.events.findOldestUnrouted()
        ) {
            try {
                await handler(event);
                await this.events.markRouted(event.id);
            } catch (error) {
                // Still unrouted, so a restart or the next publish tries it again.
                console.error(`routing failed for ${event.id}`, error);
                return;
            }
        }
    }
}

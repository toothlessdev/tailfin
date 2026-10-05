import type { ExternalEvent } from "../models/ExternalEvent";
import type { ExternalEventRepository } from "../repositories/ExternalEventRepository";
import type { ExternalReferenceRepository } from "../repositories/ExternalReferenceRepository";
import type { SerialQueue } from "./SerialQueue";

type EventHandler = (event: ExternalEvent) => Promise<void>;

export class ExternalEventBroker {
    private handler: EventHandler | null = null;
    private processing: Promise<void> | null = null;
    private hasWork = false;

    constructor(
        private readonly events: ExternalEventRepository,
        private readonly references: ExternalReferenceRepository,
        private readonly databaseQueue: SerialQueue,
    ) {}

    publish(event: ExternalEvent): Promise<void> {
        return this.databaseQueue.run(() => this.store(event));
    }

    consume(handler: EventHandler): void {
        this.handler = handler;
        this.wake();
    }

    async idle(): Promise<void> {
        while (this.processing) await this.processing;
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

                let routedOne = true;
                while (routedOne) {
                    routedOne = await this.databaseQueue.run(() =>
                        this.routeOldest(handler),
                    );
                }
            }
        } finally {
            this.processing = null;
        }
    }

    /** `false` when nothing is left to route, or the handler failed. */
    private async routeOldest(handler: EventHandler): Promise<boolean> {
        const event = await this.events.findOldestUnrouted();
        if (!event) return false;

        try {
            await handler(event);
            await this.events.markRouted(event.id);
            return true;
        } catch (error) {
            // Still unrouted, so a restart or the next publish tries it again.
            console.error(`routing failed for ${event.id}`, error);
            return false;
        }
    }
}

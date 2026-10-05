import type { ExternalEvent } from "../models/ExternalEvent";
import type { ExternalEventRepository } from "../repositories/ExternalEventRepository";
import type { ExternalReferenceRepository } from "../repositories/ExternalReferenceRepository";

type EventHandler = (event: ExternalEvent) => Promise<void>;

export class ExternalEventBroker {
    private handler: EventHandler | null = null;
    private queue: Promise<unknown> = Promise.resolve();
    private processing: Promise<void> | null = null;
    private hasWork = false;

    constructor(
        private readonly events: ExternalEventRepository,
        private readonly references: ExternalReferenceRepository,
    ) {}

    publish(event: ExternalEvent): Promise<void> {
        return this.exclusive(() => this.store(event));
    }

    consume(handler: EventHandler): void {
        this.handler = handler;
        this.wake();
    }

    async idle(): Promise<void> {
        while (this.processing) await this.processing;
    }

    /**
     * The database has one connection, so a read that lands in the middle of
     * another operation's transaction sees half of it: an event row without its
     * references, for one. Every database step goes through here, one at a time.
     */
    private exclusive<T>(step: () => Promise<T>): Promise<T> {
        const result = this.queue.then(step);
        this.queue = result.catch(() => undefined);

        return result;
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
                    routedOne = await this.exclusive(() =>
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

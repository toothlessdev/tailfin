import {
    ExternalEvent,
    ExternalReference,
    type ExternalEventSource,
    type ReferenceScanner,
    type StopWatching,
} from "tailfin-core";

import type { SlackClient } from "./SlackClient";
import type { SlackMessage } from "./types/SlackMessage";

export const SLACK_SOURCE_NAME = "slack";

export interface SlackEventSourceConfig {
    readonly myUserId: string;
    readonly referenceScanner: ReferenceScanner;
}

/** Edits, deletions and join notices are not original messages. */
const KEPT_SUBTYPES = new Set<string | undefined>([
    undefined,
    "thread_broadcast",
    "file_share",
]);

export class SlackEventSource implements ExternalEventSource {
    readonly sourceName = SLACK_SOURCE_NAME;

    /** `Pick` so a test double needs only `subscribe`, not the class's private socket. */
    constructor(
        private readonly client: Pick<SlackClient, "subscribe">,
        private readonly config: SlackEventSourceConfig,
    ) {}

    push(
        emitEvent: (event: ExternalEvent) => Promise<void>,
    ): Promise<StopWatching> {
        return this.client.subscribe(async (message) => {
            const event = this.toEvent(message);
            if (event) await emitEvent(event);
        });
    }

    private toEvent(message: SlackMessage): ExternalEvent | null {
        if (!KEPT_SUBTYPES.has(message.subtype)) return null;
        if (message.user === this.config.myUserId) return null;

        const text = message.text ?? "";

        return new ExternalEvent({
            id: `slack:${message.channel}:${message.ts}`,
            sourceName: this.sourceName,
            kind: "message",
            occurredAt: new Date(Number(message.ts) * 1000),
            references: [
                new ExternalReference(
                    "slack.thread",
                    `${message.channel}:${message.thread_ts ?? message.ts}`,
                ),
                ...this.config.referenceScanner.scan(text),
            ],
            raw: message,
        });
    }
}

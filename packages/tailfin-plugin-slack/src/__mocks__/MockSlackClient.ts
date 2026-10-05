import type { StopWatching } from "tailfin-core";

import type { SlackMessage } from "../types/SlackMessage";

export class MockSlackClient {
    private onMessage: ((message: SlackMessage) => Promise<void>) | null = null;

    async subscribe(
        onMessage: (message: SlackMessage) => Promise<void>,
    ): Promise<StopWatching> {
        this.onMessage = onMessage;

        return async () => {
            this.onMessage = null;
        };
    }

    async receive(message: SlackMessage): Promise<void> {
        if (!this.onMessage) throw new Error("Nobody is subscribed");

        await this.onMessage(message);
    }
}

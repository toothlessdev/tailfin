import { SocketModeClient } from "@slack/socket-mode";
import type { StopWatching } from "tailfin-core";

import type { SlackMessage } from "./types/SlackMessage";

interface SlackMessageEnvelope {
    ack(): Promise<void>;
    event: SlackMessage;
}

export class SlackClient {
    private readonly socketModeClient: SocketModeClient;

    constructor(appToken: string) {
        this.socketModeClient = new SocketModeClient({ appToken });
    }

    async subscribe(
        onMessage: (message: SlackMessage) => Promise<void>,
    ): Promise<StopWatching> {
        this.socketModeClient.on(
            "message",
            async ({ ack, event }: SlackMessageEnvelope) => {
                try {
                    await onMessage(event);
                    await ack();
                } catch (error) {
                    // Slack redelivers an event that was never acknowledged, and its id dedupes the retry.
                    console.error("slack message was not acknowledged", error);
                }
            },
        );

        await this.socketModeClient.start();
        return () => this.socketModeClient.disconnect();
    }
}

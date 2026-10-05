import type { StopWatching } from "tailfin-core";

import type { SlackMessage } from "./types/SlackMessage";

export interface SlackClient {
    subscribe(
        onMessage: (message: SlackMessage) => Promise<void>,
    ): Promise<StopWatching>;
}

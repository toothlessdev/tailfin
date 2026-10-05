import type {
    ExternalEventSource,
    StopWatching,
} from "../../tailfin-core/src/interfaces/ExternalEventSource";
import type { ExternalEvent } from "../../tailfin-core/src/models/ExternalEvent";

export class SlackEventSource implements ExternalEventSource {
    sourceName = "slack";

    async push(
        emitEvent: (event: ExternalEvent) => Promise<void>,
    ): Promise<StopWatching> {
        throw new Error("Method not implemented.");
    }

    async pull(
        cursor: string | null,
    ): Promise<{ events: readonly ExternalEvent[]; cursor: string }> {
        throw new Error("Method not implemented.");
    }
}

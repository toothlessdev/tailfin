import type { ExternalEvent } from "../models/ExternalEvent";

export type StopWatching = () => Promise<void>;

export interface ExternalEventSource {
    readonly sourceName: string;

    push?(
        emitEvent: (event: ExternalEvent) => Promise<void>,
    ): Promise<StopWatching>;

    pull?(
        cursor: string | null,
    ): Promise<{ events: readonly ExternalEvent[]; cursor: string }>;
}

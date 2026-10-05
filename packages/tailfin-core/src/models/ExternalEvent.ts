import type { ExternalReference } from "./ExternalReference";

export interface ExternalEvent {
    readonly id: string;
    readonly sourceName: string;
    readonly kind: string;
    readonly occurredAt: Date;
    readonly references: readonly ExternalReference[];
    readonly payload: unknown;
}

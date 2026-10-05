import type { ExternalReference } from "./ExternalReference";

export interface Task {
    readonly id: string;
    readonly relatedReferences: readonly ExternalReference[];
}

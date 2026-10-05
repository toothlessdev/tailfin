import type { TaskRouterRule } from "../router/TaskRouterRule";
import type { ExternalEventSource } from "./ExternalEventSource";
import type { ReferenceScanner } from "./ReferenceScanner";

export interface PluginContext {
    /** Every plugin's scanners combined, so a source can find references to systems it has no plugin for. */
    readonly referenceScanner: ReferenceScanner;
}

/**
 * One external system. The daemon asks every plugin for its scanners first,
 * then asks each one to create its sources with all of them combined. That
 * order is why a Slack source can pick up Jira keys without knowing the Jira
 * plugin.
 */
export abstract class TailfinPlugin {
    abstract readonly name: string;

    scanners(): ReferenceScanner[] {
        return [];
    }

    rules(): TaskRouterRule[] {
        return [];
    }

    createSources(context: PluginContext): ExternalEventSource[] {
        return [];
    }
}

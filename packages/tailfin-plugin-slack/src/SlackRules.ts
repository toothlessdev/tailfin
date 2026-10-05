import type { ExternalEvent } from "../../tailfin-core/src/models/ExternalEvent";
import type { Task } from "../../tailfin-core/src/models/Task";
import type {
    Derivation,
    TaskRouterRule,
} from "../../tailfin-core/src/router/TaskRouterRule";

export class SlackMentionRule implements TaskRouterRule {
    sourceName = "slack";
    name = "slack.thread.mention";

    derive(event: ExternalEvent, existingTask: Task | null): Derivation {
        throw new Error("Not implemented");
    }
}

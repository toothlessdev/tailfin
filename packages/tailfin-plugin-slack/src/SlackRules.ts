import type {
    Derivation,
    ExternalEvent,
    Task,
    TaskRouterRule,
} from "tailfin-core";

import { SLACK_SOURCE_NAME } from "./SlackEventSource";
import type { SlackMessage } from "./types/SlackMessage";

export class SlackMentionRule implements TaskRouterRule {
    readonly sourceName = SLACK_SOURCE_NAME;
    readonly name = "slack.thread.mention";

    derive(event: ExternalEvent, existingTask: Task | null): Derivation {
        const text = (event.raw as SlackMessage).text ?? "";

        if (existingTask) {
            return {
                kind: "update",
                addedReferences: event.references,
                input: text,
            };
        }
        if (event.kind !== "mention") return { kind: "ignore" };

        return {
            kind: "create",
            draft: {
                title: text.split("\n")[0] ?? "",
                description: text,
                relatedReferences: event.references,
            },
        };
    }
}

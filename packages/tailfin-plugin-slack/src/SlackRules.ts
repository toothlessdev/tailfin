import type {
    TaskAction,
    ExternalEvent,
    Task,
    TaskRouterRule,
} from "tailfin-core";

import { SLACK_SOURCE_NAME } from "./SlackEventSource";
import type { SlackMessage } from "./types/SlackMessage";

const USER_MENTION = /<@[A-Z0-9]+>/g;
const TITLE_MAX_LENGTH = 80;

export class SlackMentionRule implements TaskRouterRule {
    readonly sourceName = SLACK_SOURCE_NAME;
    readonly name = "slack.thread.mention";

    decide(event: ExternalEvent, existingTask: Task | null): TaskAction {
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
                title: titleOf(text),
                description: text,
                relatedReferences: event.references,
            },
        };
    }
}

function titleOf(text: string): string {
    const firstLine = text.replace(USER_MENTION, "").trim().split("\n")[0];

    return (firstLine || "Slack mention").slice(0, TITLE_MAX_LENGTH);
}

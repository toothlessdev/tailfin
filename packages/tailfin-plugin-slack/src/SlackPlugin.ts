import {
    TailfinPlugin,
    type ExternalEventSource,
    type PluginContext,
    type TaskRouterRule,
} from "tailfin-core";
import { z } from "zod";

import { SlackClient } from "./SlackClient";
import { SlackEventSource } from "./SlackEventSource";
import { SlackMentionRule } from "./SlackRules";

const optionsSchema = z
    .strictObject({
        /** Your own Slack user id. Messages you write are skipped. */
        userId: z
            .string()
            .regex(/^[UW][A-Z0-9]+$/, "must look like U0123456789"),
        userGroupIds: z.array(z.string()).default([]),
        contextChannelIds: z.array(z.string()).default([]),
        /** App-level token. Defaults to the SLACK_APP_TOKEN environment variable. */
        appToken: z
            .string()
            .startsWith(
                "xapp-",
                "must be an app-level token that starts with xapp-",
            )
            .optional(),
        /** Replaces the real Slack connection, for tests. */
        client: z
            .custom<Pick<SlackClient, "subscribe">>(
                (value) =>
                    typeof (value as { subscribe?: unknown })?.subscribe ===
                    "function",
                "must have a subscribe method",
            )
            .optional(),
    })
    .refine((options) => options.client || options.appToken, {
        message: "set SLACK_APP_TOKEN in .env or pass appToken",
        path: ["appToken"],
    });

export type SlackPluginOptions = z.input<typeof optionsSchema>;

export class SlackPlugin extends TailfinPlugin {
    readonly name = "slack";
    private readonly options: z.output<typeof optionsSchema>;

    constructor(options: SlackPluginOptions) {
        super();

        const result = optionsSchema.safeParse({
            appToken: process.env.SLACK_APP_TOKEN || undefined,
            ...options,
        });
        if (!result.success) {
            throw new Error(
                `Invalid SlackPlugin options\n${z.prettifyError(result.error)}`,
            );
        }
        this.options = result.data;
    }

    override rules(): TaskRouterRule[] {
        return [new SlackMentionRule()];
    }

    override createSources({
        referenceScanner,
    }: PluginContext): ExternalEventSource[] {
        const { userId, userGroupIds, contextChannelIds, appToken, client } =
            this.options;

        return [
            new SlackEventSource(
                // The schema guarantees a token when there is no client.
                client ?? new SlackClient(appToken!),
                {
                    myUserId: userId,
                    myUserGroupIds: userGroupIds,
                    contextChannelIds,
                    referenceScanner,
                },
            ),
        ];
    }
}

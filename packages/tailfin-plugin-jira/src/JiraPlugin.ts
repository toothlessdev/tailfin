import { TailfinPlugin, type ReferenceScanner } from "tailfin-core";
import { z } from "zod";

import { JiraReferenceScanner } from "./utils/JiraReferenceScanner";

const optionsSchema = z.strictObject({
    /** Only these project keys count as Jira issues. An empty list matches nothing. */
    projectKeys: z.array(z.string()).default([]),
});

export type JiraPluginOptions = z.input<typeof optionsSchema>;

export class JiraPlugin extends TailfinPlugin {
    readonly name = "jira";
    private readonly scanner: JiraReferenceScanner;

    constructor(options: JiraPluginOptions = {}) {
        super();

        const result = optionsSchema.safeParse(options);
        if (!result.success) {
            throw new Error(
                `Invalid JiraPlugin options\n${z.prettifyError(result.error)}`,
            );
        }
        this.scanner = new JiraReferenceScanner(result.data.projectKeys);
    }

    override scanners(): ReferenceScanner[] {
        return [this.scanner];
    }
}

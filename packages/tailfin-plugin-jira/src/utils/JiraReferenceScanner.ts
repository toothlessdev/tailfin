import { ExternalReference, ReferenceScanner } from "tailfin-core";

const PROJECT_KEY_FORMAT = /^[A-Z][A-Z0-9_]*$/;

export class JiraReferenceScanner extends ReferenceScanner {
    private readonly issueKeyPattern: RegExp | null;

    constructor(projectKeys: readonly string[]) {
        super();

        for (const projectKey of projectKeys) {
            if (!PROJECT_KEY_FORMAT.test(projectKey)) {
                throw new Error(`Invalid Jira project key: ${projectKey}`);
            }
        }

        // An empty list would build `\b(?:)-\d+\b`, which matches the `-8` of `UTF-8`
        this.issueKeyPattern =
            projectKeys.length === 0
                ? null
                : new RegExp(`\\b(?:${projectKeys.join("|")})-\\d+\\b`, "g");
    }

    scan(text: string): ExternalReference[] {
        if (!this.issueKeyPattern) return [];

        return [...text.matchAll(this.issueKeyPattern)].map(
            (match) => new ExternalReference("jira.issue", match[0]),
        );
    }
}

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

        const PROJECT_KEY_PATTERN =
            "\\b(?:" + projectKeys.join("|") + ")-\\d+\\b";

        this.issueKeyPattern = new RegExp(PROJECT_KEY_PATTERN, "g");
    }

    scan(text: string): ExternalReference[] {
        if (!this.issueKeyPattern) return [];

        return [...text.matchAll(this.issueKeyPattern)].map(
            (match) => new ExternalReference("jira.issue", match[0]),
        );
    }
}

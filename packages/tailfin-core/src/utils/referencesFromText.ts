import { ExternalReference } from "../models/ExternalReference";

const JIRA_KEY = /\b[A-Z][A-Z0-9]+-\d+\b/g;
const GITHUB_PULL_REQUEST = /github\.com\/([\w.-]+\/[\w.-]+)\/pull\/(\d+)/g;

/**
 * Pulls references to other systems out of free text. Every source shares this
 * one rule, so the same Jira key means the same reference in a Slack message
 * and in a Jira comment.
 *
 * @example "PROJ-123 fixed, github.com/owner/repo/pull/12"
 *   -> jira.issue=PROJ-123, github.pr=owner/repo#12
 */
export function referencesFromText(text: string): ExternalReference[] {
    const references: ExternalReference[] = [];

    for (const match of text.matchAll(JIRA_KEY)) {
        references.push(new ExternalReference("jira.issue", match[0]));
    }
    for (const match of text.matchAll(GITHUB_PULL_REQUEST)) {
        const [, repository, number] = match;
        if (!repository || !number) continue;

        references.push(
            new ExternalReference("github.pr", `${repository}#${number}`),
        );
    }

    return references;
}

import type { ExternalReference } from "../models/ExternalReference";

/**
 * Pulls references to one external system out of free text. Core does not know
 * which systems exist: plugins implement this, and the daemon hands the same
 * extractors to every translator, so a Jira key means the same reference in a
 * Slack message and in a Jira comment.
 */
export interface ReferenceExtractor {
    extract(text: string): ExternalReference[];
}

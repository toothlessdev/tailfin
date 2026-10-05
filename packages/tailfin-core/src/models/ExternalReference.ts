/**
 * Points at one thing in an external system.
 *
 * @example { kind: "slack.thread", key: "C01AB:1726812345.000100" }
 * @example { kind: "jira.issue", key: "PROJ-123" }
 * @example { kind: "github.pr", key: "owner/repo#12" }
 */
export interface ExternalReference {
    readonly kind: string;
    readonly key: string;
}

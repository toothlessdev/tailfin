export interface SlackMessage {
    /** Edits, deletions and join notices carry a subtype. Plain messages do not. */
    readonly subtype?: string;
    readonly channel: string;
    readonly user?: string;
    readonly text?: string;

    /** Doubles as the message id inside a channel. @example "1726812345.000100" */
    readonly ts: string;

    /** `ts` of the thread root. Absent on messages outside a thread. */
    readonly thread_ts?: string;
}

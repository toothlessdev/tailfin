/**
 * `start` fails on a session that exists and `resume` fails on one that does not,
 * so the caller can switch direction. Both wordings come from the CLI, not from us.
 */
const SESSION_ALREADY_EXISTS_MESSAGE = /is already in use/;
const SESSION_NOT_FOUND_MESSAGE = /No conversation found with session ID/;

const EXCERPT_LENGTH = 300;

/** Everything that can go wrong with the claude CLI. Callers catch this class and treat any other error as a bug. */
export class ClaudeError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = new.target.name;
    }

    /** Picks the error for a failure the CLI describes in words, or `null` when the text says nothing known. */
    static fromCliText(text: string): ClaudeError | null {
        if (SESSION_ALREADY_EXISTS_MESSAGE.test(text)) {
            return new SessionAlreadyExistsError(excerpt(text));
        }
        if (SESSION_NOT_FOUND_MESSAGE.test(text)) {
            return new SessionNotFoundError(excerpt(text));
        }
        return null;
    }
}

/** `start` found a session with this id, so the caller should `resume` it. */
export class SessionAlreadyExistsError extends ClaudeError {}

/** `resume` found no session with this id, so the caller should `start` it. */
export class SessionNotFoundError extends ClaudeError {}

/** The process could not run, was stopped, exited badly, or answered with something unusable. */
export class ClaudeFailedError extends ClaudeError {}

/** Long CLI output would bury the message, so error text keeps only its start. */
export function excerpt(text: string): string {
    return text.trim().replace(/\s+/g, " ").slice(0, EXCERPT_LENGTH);
}

/**
 * Tools that write or run commands. A session never gets them: the command
 * denies each one, and the config refuses to allow them, from this one list.
 */
export const ACTING_TOOLS = ["Bash", "Write", "Edit", "NotebookEdit"];

const ACTING_TOOL_PATTERN = new RegExp(`^(${ACTING_TOOLS.join("|")})(\\(|$)`);
const WEB_FETCH_PATTERN = /^WebFetch(\(|$)/;
const SINGLE_HOST_WEB_FETCH_PATTERN = /^WebFetch\(domain:[^*()\s]+\)$/;

export function isReadOnlyTool(tool: string): boolean {
    if (WEB_FETCH_PATTERN.test(tool)) {
        return SINGLE_HOST_WEB_FETCH_PATTERN.test(tool);
    }
    return !ACTING_TOOL_PATTERN.test(tool);
}

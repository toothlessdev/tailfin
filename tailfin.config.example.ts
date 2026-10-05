import { defineConfig } from "tailfin-daemon";
import { JiraPlugin } from "tailfin-plugin-jira";
import { SlackPlugin } from "tailfin-plugin-slack";

// Copy to tailfin.config.ts, which is gitignored: it holds ids from your own workspace.
export default defineConfig({
    database: ".local/tailfin.sqlite",

    plugins: [
        // The app token comes from SLACK_APP_TOKEN in .env.
        new SlackPlugin({
            userId: "U0123456789",
            userGroupIds: [],
            contextChannelIds: [],
        }),
        new JiraPlugin({ projectKeys: ["PROJ"] }),
    ],

    // Your own rules and scanners. Rules are asked before the plugins' rules.
    rules: [],
    scanners: [],

    // The Claude sessions that brief each task. They are read-only: no setting here
    // can let a session write files, run commands or send messages.
    sessions: {
        // Where sessions run and what they can read. Use a folder of its own, not this
        // repo, which holds the database.
        workingDirectory: "~/desktop",

        // An input that failed this many times is given up on.
        maxAttempts: 3,
        timeoutSeconds: 600,
        model: "sonnet",

        // Read-only tools to add to Read, Grep and Glob. WebFetch needs one named host.
        extraAllowedTools: [
            "mcp__atlassian__getJiraIssue",
            "WebFetch(domain:docs.example.com)",
        ],

        // Paths a session may not read, added to the built-in ones (.env files, keys, ~/.ssh).
        extraDeniedReadPaths: ["**/secrets/**"],

        // What each session is asked. Empty by default, so the answer's language follows
        // your own Claude settings. extraInstructions are trusted lines placed after the
        // fixed safety rules, which cannot be replaced.
        prompt: {
            start: {
                request: "Write a short briefing. Reply in Korean.",
                extraInstructions: [],
            },
            resume: {
                request: "Update the briefing only if this changes it.",
                extraInstructions: [],
            },
        },
    },
});

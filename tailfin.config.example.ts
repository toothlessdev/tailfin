import { defineConfig } from "tailfin-daemon";
import { JiraPlugin } from "tailfin-plugin-jira";
import { SlackPlugin } from "tailfin-plugin-slack";

// Copy to tailfin.config.ts, which is gitignored: it holds ids from your own workspace.
export default defineConfig({
    // database: ".local/tailfin.sqlite",

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
});

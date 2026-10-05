const PANE = "tailfin-inbox";
const TASKS_URL = "http://127.0.0.1:7421/tasks";
const POLL_INTERVAL_MS = 5_000;
const BRIEFING_PREVIEW_ROWS = 2;
const ELLIPSIS = "...";
// Pane padding, card border and card padding, on both sides, plus one spare.
const CARD_CHROME_COLUMNS = 7;
const STATES = ["ready", "opened", "waiting", "done"];
const STATE_LABELS = {
    ready: "Ready",
    opened: "Opened",
    waiting: "Waiting",
    done: "Done",
};
const STATE_COLORS = {
    ready: "green",
    opened: "cyan",
    waiting: "#f97316",
    done: "gray",
};
const SESSION_ID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

let tasks = [];
let isDaemonOnline = false;
let hasLoaded = false;
const briefedAtByTaskId = new Map();

// A second claude://resume imports the session again as a duplicate tab.
const openedSessionIds = new Set();

export function register(on) {
    on("session.start", async ($, e, next) => {
        const saved = await $.store.get("openedSessionIds");
        if (Array.isArray(saved)) {
            for (const sessionId of saved) openedSessionIds.add(sessionId);
        }

        $.clock.every(POLL_INTERVAL_MS, () => refresh($));
        refresh($);

        await $.command.register({
            name: "inbox",
            description: "Open the tailfin task inbox",
        });
        return next(e);
    });

    on("command.run", { command: "inbox" }, async ($) => {
        await $.ui.open({
            id: PANE,
            title: "tailfin inbox",
            focus: true,
            closeOnEscape: true,
        });
        return {};
    });

    on("ui.render", { component: "Pane" }, async ($, e, next) => {
        if (e.requestId !== PANE) return next(e);

        const elements = $.ui.resolve(e);
        return elements.Box({
            flexDirection: "column",
            rowGap: 1,
            paddingX: 1,
            children: [
                header(elements),
                ...tasks.map((task) =>
                    taskRow($, elements, task, e.props.bodyColumns),
                ),
            ],
        });
    });
}

async function refresh($) {
    let fetched;
    try {
        const response = await $.http.fetch(TASKS_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        fetched = JSON.parse(response.text).tasks;
    } catch {
        isDaemonOnline = false;
        tasks = [];
        $.ui.status("");
        $.ui.invalidate("ui.render");
        return;
    }

    for (const task of fetched) {
        const previous = briefedAtByTaskId.get(task.id);
        // The first load only records, so briefings from before don't toast.
        if (hasLoaded && task.briefedAt && task.briefedAt !== previous) {
            $.ui.toast(`Briefing ready: ${task.title}`);
        }
        briefedAtByTaskId.set(task.id, task.briefedAt);
    }
    hasLoaded = true;
    isDaemonOnline = true;
    tasks = fetched;

    showStatus($);
    $.ui.invalidate("ui.render");
}

async function openInDesktop($, task) {
    // The id goes into a URL, so only a well-formed one is let through.
    if (!SESSION_ID_PATTERN.test(task.sessionId)) return;

    const cwd = encodeURIComponent(task.workingDirectory);
    const result = await $.process.run([
        "open",
        `claude://resume?session=${task.sessionId}&cwd=${cwd}`,
    ]);
    if (result.exitCode !== 0) {
        $.ui.toast(`Could not open the session: ${result.stderr}`);
        return;
    }

    openedSessionIds.add(task.sessionId);
    await $.store.set("openedSessionIds", [...openedSessionIds]);
    showStatus($);
    $.ui.invalidate("ui.render");
}

function stateOf(task) {
    if (task.status === "done") return "done";
    if (task.sessionId && openedSessionIds.has(task.sessionId)) return "opened";
    if (task.briefing && task.sessionId) return "ready";
    return "waiting";
}

function countByState() {
    const counts = { ready: 0, opened: 0, waiting: 0, done: 0 };
    for (const task of tasks) counts[stateOf(task)] += 1;
    return counts;
}

function summarize() {
    const counts = countByState();
    return STATES.map(
        (state) => `${STATE_LABELS[state]} ${counts[state]}`,
    ).join(" · ");
}

// The pane scrolls as a whole, so only the line under the prompt stays put.
function showStatus($) {
    if (tasks.every((task) => stateOf(task) === "done")) {
        $.ui.status("");
        return;
    }
    $.ui.status(`${summarize()} (/inbox)`);
}

function header({ Box, Text }) {
    if (!isDaemonOnline) {
        return Text({
            dimColor: true,
            children: [`tailfin daemon is offline (${TASKS_URL})`],
        });
    }
    if (tasks.length === 0) {
        return Text({ dimColor: true, children: ["No tasks."] });
    }
    const counts = countByState();
    return Box({
        flexDirection: "row",
        columnGap: 2,
        children: STATES.map((state) =>
            Text({
                color: STATE_COLORS[state],
                bold: counts[state] > 0,
                dimColor: counts[state] === 0,
                children: [`● ${STATE_LABELS[state]} ${counts[state]}`],
            }),
        ),
    });
}

// Hangul and CJK take two terminal columns, everything else one.
function columnsOf(text) {
    let columns = 0;
    for (const character of text) {
        const code = character.codePointAt(0);
        const isWide =
            (code >= 0x1100 && code <= 0x115f) ||
            (code >= 0x2e80 && code <= 0xa4cf) ||
            (code >= 0xac00 && code <= 0xd7a3) ||
            (code >= 0xf900 && code <= 0xfaff) ||
            (code >= 0xff00 && code <= 0xff60) ||
            (code >= 0x1f300 && code <= 0x1faff);
        if (isWide) {
            columns += 2;
        } else {
            columns += 1;
        }
    }
    return columns;
}

/**
 * Cuts the text into whole rows itself. A Box with a fixed height clips by
 * pixel, and a third wrapped line then shows up half cut at the edges.
 */
function wrapRows(text, width, maxRows) {
    const rows = [""];
    for (const character of text) {
        if (columnsOf(rows[rows.length - 1] + character) <= width) {
            rows[rows.length - 1] += character;
            continue;
        }
        if (rows.length === maxRows) {
            let last = rows[rows.length - 1];
            while (last && columnsOf(last + ELLIPSIS) > width) {
                last = last.slice(0, -1);
            }
            rows[rows.length - 1] = last + ELLIPSIS;
            return rows;
        }
        rows.push(character);
    }
    return rows;
}

function taskRow($, { Box, Text, Button }, task, bodyColumns = 60) {
    const state = stateOf(task);

    const children = [
        Box({
            flexDirection: "row",
            justifyContent: "space-between",
            columnGap: 2,
            children: [
                Text({ bold: true, children: [task.title] }),
                Text({
                    color: STATE_COLORS[state],
                    children: [`● ${STATE_LABELS[state]}`],
                }),
            ],
        }),
    ];

    if (task.briefing) {
        const width = Math.max(10, bodyColumns - CARD_CHROME_COLUMNS);
        const rows = wrapRows(
            task.briefing.replace(/\s+/g, " ").trim(),
            width,
            BRIEFING_PREVIEW_ROWS,
        );
        for (const row of rows) {
            children.push(
                Text({ dimColor: true, wrap: "truncate-end", children: [row] }),
            );
        }
    } else {
        children.push(
            Text({ dimColor: true, children: ["Briefing not ready yet."] }),
        );
    }

    if (state === "ready" || state === "opened") {
        children.push(
            Button({
                key: `open-${task.id}`,
                label: "Open",
                onPress: () => openInDesktop($, task),
            }),
        );
    }

    return Box({
        key: `task-${task.id}`,
        flexDirection: "column",
        borderStyle: "round",
        borderColor: STATE_COLORS[state],
        paddingX: 1,
        paddingY: 1,
        children,
    });
}

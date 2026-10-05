import {
    createServer,
    type IncomingMessage,
    type Server,
    type ServerResponse,
} from "node:http";
import { resolve } from "node:path";

import type { SerialQueue, Task, TaskRepository } from "tailfin-core";

const RECENTLY_DONE_LIMIT = 20;

export interface InboxServerSettings {
    readonly port: number;
    readonly workingDirectory: string;
}

export class InboxServer {
    private server: Server | null = null;

    constructor(
        private readonly tasks: TaskRepository,
        private readonly databaseQueue: SerialQueue,
        private readonly settings: InboxServerSettings,
    ) {}

    async listen(): Promise<void> {
        const server = createServer((request, response) => {
            void this.respond(request, response);
        });

        await new Promise<void>((listening, failed) => {
            server.once("error", failed);
            server.listen(this.settings.port, "127.0.0.1", () => {
                server.off("error", failed);
                listening();
            });
        });
        this.server = server;
    }

    async close(): Promise<void> {
        const server = this.server;
        if (!server) return;

        this.server = null;
        server.closeAllConnections();
        await new Promise<void>((closed, failed) => {
            server.close((error) => {
                if (error) failed(error);
                else closed();
            });
        });
    }

    private async respond(
        request: IncomingMessage,
        response: ServerResponse,
    ): Promise<void> {
        if (!this.isLoopbackHost(request.headers.host)) {
            this.send(response, 403, { error: "forbidden" });
            return;
        }

        const { pathname } = new URL(request.url ?? "/", "http://localhost");
        if (request.method !== "GET" || pathname !== "/tasks") {
            this.send(response, 404, { error: "not found" });
            return;
        }

        try {
            this.send(response, 200, { tasks: await this.loadTasks() });
        } catch (error) {
            console.error("[server] could not read the tasks", error);
            this.send(response, 500, { error: "internal error" });
        }
    }

    private isLoopbackHost(host: string | undefined): boolean {
        const { port } = this.settings;
        return host === `127.0.0.1:${port}` || host === `localhost:${port}`;
    }

    private async loadTasks() {
        const tasks = await this.databaseQueue.run(async () => {
            const open = await this.tasks.findOpen();
            const done = await this.tasks.findRecentlyDone(RECENTLY_DONE_LIMIT);
            return [...open, ...done];
        });

        const workingDirectory = resolve(this.settings.workingDirectory);
        return tasks.map((task) => this.toInboxTask(task, workingDirectory));
    }

    private toInboxTask(task: Task, workingDirectory: string) {
        return {
            id: task.id,
            title: task.title,
            status: task.status,
            briefing: task.briefing,
            briefedAt: task.briefedAt?.toISOString() ?? null,
            sessionId: task.sessionId,
            workingDirectory,
        };
    }

    private send(
        response: ServerResponse,
        status: number,
        body: unknown,
    ): void {
        response.writeHead(status, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
        });
        response.end(JSON.stringify(body));
    }
}

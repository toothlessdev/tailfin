import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    Unique,
} from "typeorm";

/** One input waiting for a task's session. `deliveredAt` marks it, like `routedAt` on events. */
@Entity({ name: "task_inputs" })
@Unique(["taskId", "eventId"])
export class TaskInput {
    @PrimaryGeneratedColumn("increment")
    id: number;

    @Column({ type: "integer" })
    taskId: number;

    /** Unique with `taskId`, so replaying an `update` cannot queue the same input twice. */
    @Column({ type: "text" })
    eventId: string;

    @Column({ type: "text" })
    text: string;

    @CreateDateColumn({ type: "datetime" })
    createdAt: Date;

    /** Set once the session took the input. Inputs still `null` after a restart are sent again. */
    @Column({ type: "datetime", nullable: true })
    deliveredAt: Date | null;

    @Column({ type: "integer", default: 0 })
    attempts: number;

    @Column({ type: "text", nullable: true })
    lastError: string | null;

    constructor(fields: Pick<TaskInput, "taskId" | "eventId" | "text">) {
        this.deliveredAt = null;
        this.attempts = 0;
        this.lastError = null;
        Object.assign(this, fields);
    }
}

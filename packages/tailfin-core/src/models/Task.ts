import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinTable,
    ManyToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";

import { ExternalReference } from "./ExternalReference";

export type TaskStatus = "open" | "done" | "dismissed";

@Entity({ name: "tasks" })
export class Task {
    @PrimaryGeneratedColumn("increment")
    id: number;

    @Column({ type: "text" })
    title: string;

    @Column({ type: "text" })
    description: string;

    @Column({ type: "text", default: "open" })
    status: TaskStatus;

    @ManyToMany(() => ExternalReference, { eager: true, cascade: ["insert"] })
    @JoinTable({ name: "task_external_references" })
    relatedReferences: ExternalReference[];

    /**
     * The event that created the task.
     * Unique, so replaying a `create` cannot make a second task.
     */
    @Index({ unique: true })
    @Column({ type: "text", nullable: true })
    originEventId: string | null;

    @CreateDateColumn({ type: "datetime" })
    createdAt: Date;

    @UpdateDateColumn({ type: "datetime" })
    updatedAt: Date;

    constructor(
        fields: Pick<Task, "title" | "description" | "relatedReferences"> &
            Partial<Pick<Task, "originEventId">>,
    ) {
        this.status = "open";
        this.originEventId = null;
        Object.assign(this, fields);
    }
}

import {
    Column,
    CreateDateColumn,
    Entity,
    JoinTable,
    ManyToMany,
    PrimaryColumn,
    UpdateDateColumn,
} from "typeorm";

import { ExternalReference } from "./ExternalReference";

export type TaskStatus = "open" | "done" | "dismissed";

@Entity({ name: "tasks" })
export class Task {
    /** @example "TASK-0123" */
    @PrimaryColumn({ type: "text" })
    id: string;

    @Column({ type: "text" })
    title: string;

    @Column({ type: "text" })
    description: string;

    @Column({ type: "text", default: "open" })
    status: TaskStatus;

    @ManyToMany(() => ExternalReference, { eager: true, cascade: ["insert"] })
    @JoinTable({ name: "task_external_references" })
    relatedReferences: ExternalReference[];

    @CreateDateColumn({ type: "datetime" })
    createdAt: Date;

    @UpdateDateColumn({ type: "datetime" })
    updatedAt: Date;

    constructor(
        fields: Pick<
            Task,
            "id" | "title" | "description" | "relatedReferences"
        >,
    ) {
        this.status = "open";
        Object.assign(this, fields);
    }
}

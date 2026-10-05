import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinTable,
    ManyToMany,
    PrimaryColumn,
} from "typeorm";

import { ExternalReference } from "./ExternalReference";

/**
 * A fact that happened in an external system. The source decides `id`, so a
 * redelivered event is recognised by it.
 */
@Entity({ name: "external_events" })
export class ExternalEvent {
    @PrimaryColumn({ type: "text" })
    id: string;

    @Index()
    @Column({ type: "text" })
    sourceName: string;

    @Column({ type: "text" })
    kind: string;

    @Column({ type: "datetime" })
    occurredAt: Date;

    @CreateDateColumn({ type: "datetime" })
    receivedAt: Date;

    /**
     * No cascade. Every reference must be a stored row (find or create) before
     * the event is saved, or a new object with an existing (kind, key) breaks
     * the unique constraint.
     */
    @ManyToMany(() => ExternalReference, { eager: true })
    @JoinTable({ name: "event_external_references" })
    references: ExternalReference[];

    /** Raw JSON from the source. */
    @Column({ type: "simple-json" })
    payload: unknown;

    constructor(fields: Omit<ExternalEvent, "receivedAt">) {
        Object.assign(this, fields);
    }
}

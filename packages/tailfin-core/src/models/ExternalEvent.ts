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

    @ManyToMany(() => ExternalReference, {
        eager: true,
        cascade: ["insert"],
    })
    @JoinTable({ name: "event_external_references" })
    references: ExternalReference[];

    @Column({ type: "simple-json" })
    raw: unknown;

    /** Set once routing finished. Events still `null` after a restart are routed again. */
    @Column({ type: "datetime", nullable: true })
    routedAt: Date | null;

    constructor(fields: Omit<ExternalEvent, "receivedAt" | "routedAt">) {
        this.routedAt = null;
        Object.assign(this, fields);
    }
}

import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

/**
 * Points at one thing in an external system. One row per (kind, key), shared
 * by every event and task that mentions it.
 *
 * @example new ExternalReference("slack.thread", "C01AB:1726812345.000100")
 * @example new ExternalReference("jira.issue", "PROJ-123")
 * @example new ExternalReference("github.pr", "owner/repo#12")
 */
@Entity({ name: "external_references" })
@Unique(["kind", "key"])
export class ExternalReference {
    @PrimaryGeneratedColumn("increment")
    id!: number;

    @Column({ type: "text" })
    kind: string;

    @Column({ type: "text" })
    key: string;

    /** TypeORM calls this with no arguments when loading rows, then overwrites the fields. */
    constructor(kind: string, key: string) {
        this.kind = kind;
        this.key = key;
    }
}

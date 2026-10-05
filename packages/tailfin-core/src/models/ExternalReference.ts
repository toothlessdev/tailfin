import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity({ name: "external_references" })
@Unique(["kind", "key"])
export class ExternalReference {
    @PrimaryGeneratedColumn("increment")
    id: number;

    @Column({ type: "text" })
    kind: string;

    @Column({ type: "text" })
    key: string;

    constructor(kind: string, key: string) {
        this.kind = kind;
        this.key = key;
    }
}

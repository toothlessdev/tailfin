import type { ExternalReference } from "../models/ExternalReference";

export abstract class ReferenceScanner {
    abstract scan(text: string): ExternalReference[];

    static compose(scanners: readonly ReferenceScanner[]): ReferenceScanner {
        return {
            scan: (text) => scanners.flatMap((scanner) => scanner.scan(text)),
        };
    }
}

/**
 * The database has one connection, so a read that lands in the middle of
 * another operation's transaction sees half of it: an event row without its
 * references, for one. Every database step goes through one of these, one at a time.
 */
export class SerialQueue {
    private tail: Promise<unknown> = Promise.resolve();

    run<T>(step: () => Promise<T>): Promise<T> {
        const result = this.tail.then(step);
        this.tail = result.catch(() => undefined);

        return result;
    }
}

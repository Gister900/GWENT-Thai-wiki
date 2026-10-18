// A value several tabs share in one localStorage key, plus this tab's changes that are not saved yet.
// The screen shows `value` = the latest stored value with the unsaved changes replayed on top, so a save that fails
// (storage full) never takes anything off the screen, and the next save that works writes them all.

export class Pending<T, Op> {
  private ops: Op[] = []
  constructor(private base: T, private apply: (v: T, op: Op) => T) {}
  /** what the screen shows */
  get value(): T { return this.ops.reduce(this.apply, this.base) }
  /** changes not saved yet */
  get count(): number { return this.ops.length }
  /** the stored value as just read (null = unreadable: keep the last one known) → what the screen shows now */
  stored(latest: T | null): T { if (latest !== null) this.base = latest; return this.value }
  /**
   * this tab's change: write = storage.update for the key (gets the latest stored value, returns what it wrote).
   * Saved → nothing pending any more · failed → the change stays pending and is replayed on the next read.
   */
  change(op: Op, write: (fn: (latest: T | null) => T) => { value: T; ok: boolean }): { value: T; ok: boolean } {
    this.ops.push(op)
    const r = write(latest => this.stored(latest))
    if (r.ok) { this.base = r.value; this.ops = [] }
    return r
  }
}

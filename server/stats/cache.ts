// In-memory caching for the statistics Lambda (DESIGN.md §4.9).
//
// Everything here lives in one Lambda execution environment only: a cold start begins empty, and
// separate instances never share values. It is not durable storage and not a global cache.

/**
 * Serves the last refresh until it expires, and coalesces concurrent callers onto one in-flight
 * refresh so a burst of requests to a warm instance triggers a single set of GitLab reads.
 */
export function createCoalescingCache<T>(
  refresh: () => Promise<{ value: T; ttlMs: number }>,
  now: () => number = Date.now,
): () => Promise<T> {
  let entry: { value: T; expiresAt: number } | null = null;
  let inflight: Promise<T> | null = null;

  return () => {
    if (entry && now() < entry.expiresAt) return Promise.resolve(entry.value);
    inflight ??= refresh()
      .then(({ value, ttlMs }) => {
        entry = { value, expiresAt: now() + ttlMs };
        return value;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };
}

export interface Snapshot<T> {
  value: T;
  /** ISO UTC time the value was successfully fetched. */
  asOf: string;
}

/**
 * The most recent successful value of one metric source, kept so an upstream failure can show a
 * clearly stale value with its original timestamp instead of nothing.
 */
export class LastGood<T> {
  #snapshot: Snapshot<T> | null = null;

  get(): Snapshot<T> | null {
    return this.#snapshot;
  }

  remember(value: T, asOf: string): Snapshot<T> {
    this.#snapshot = { value, asOf };
    return this.#snapshot;
  }

  clear(): void {
    this.#snapshot = null;
  }
}

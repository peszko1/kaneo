type Entry<T> = { value?: T; loadedAt?: number; pending?: Promise<T> };

/**
 * Shares results between blocks: identical requests in flight run once, and a
 * result younger than `maxAgeMs` is reused. Keeps the plugin under the API key
 * rate limit when a note holds several similar blocks.
 */
export class QueryCache<T> {
  private entries = new Map<string, Entry<T>>();

  constructor(private now: () => number = Date.now) {}

  get(key: string, maxAgeMs: number, load: () => Promise<T>): Promise<T> {
    const entry = this.entries.get(key) ?? {};
    if (entry.pending) return entry.pending;
    if (
      entry.value !== undefined &&
      entry.loadedAt !== undefined &&
      this.now() - entry.loadedAt < maxAgeMs
    ) {
      return Promise.resolve(entry.value);
    }

    const pending = load().then(
      (value) => {
        this.entries.set(key, { value, loadedAt: this.now() });
        return value;
      },
      (error: unknown) => {
        this.entries.delete(key);
        throw error;
      },
    );
    this.entries.set(key, { ...entry, pending });
    return pending;
  }

  clear() {
    this.entries.clear();
  }
}

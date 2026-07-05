export interface IdempotencyStore {
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
}

export const IDEMPOTENCY_STORE = Symbol('IDEMPOTENCY_STORE');

/**
 * MVP implementation — correct for a single-instance deployment, but it will
 * not share state across horizontally-scaled API pods. The interface is the
 * point: swapping this for a `RedisIdempotencyStore` (SET key value EX ttl NX)
 * is a one-file change in the module provider, not a rewrite of every
 * endpoint that uses @Idempotent(). Do this swap before running more than
 * one API instance — see docs/ARCHITECTURE.md §5 (Stage 2).
 */
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly store = new Map<string, { value: unknown; expiresAt: number }>();

  async get(key: string): Promise<unknown | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

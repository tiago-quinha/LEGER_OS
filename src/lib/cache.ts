type Entry<T> = {
  value: T;
  expiresAt: number | null;
};

export class SimpleLRU<T> {
  private map: Map<string, Entry<T>> = new Map();
  private maxSize: number;
  private defaultTTL: number | null;

  constructor(maxSize = 200, defaultTTLMs: number | null = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTLMs;
  }

  get(key: string): T | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }
    // recent access -> move to end
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number | null) {
    if (this.map.has(key)) this.map.delete(key);
    const expiresAt = ttlMs === undefined ? (this.defaultTTL ? Date.now() + this.defaultTTL : null) : (ttlMs ? Date.now() + ttlMs : null);
    this.map.set(key, { value, expiresAt });

    while (this.map.size > this.maxSize) {
      // evict oldest
      const firstKey = this.map.keys().next().value as string | undefined;
      if (firstKey) this.map.delete(firstKey);
    }
  }

  delete(key: string) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }
}

// Default shared cache instance for lightweight server-side caching
export const cache = new SimpleLRU<any>(200, 5 * 60 * 1000);

export function invalidateDashboardCache(userId: string) {
  cache.delete(`workspace_data:${userId}`);
  cache.delete(`dashboard_data:${userId}`);
  cache.delete(`cycles:${userId}`);
  cache.delete(`telemetry:${userId}:now`);
}

export function invalidateUserCache(userId: string) {
  invalidateDashboardCache(userId);
}

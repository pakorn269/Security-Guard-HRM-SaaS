/**
 * Frontend Cache Service
 * Simple in-memory cache for API responses
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class FrontendCacheService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  /**
   * Get cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached value
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Delete cached value
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cache by pattern
   */
  clearPattern(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach((key) => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Get or fetch data
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }
}

export const frontendCache = new FrontendCacheService();

/**
 * Cache TTL constants (in milliseconds)
 */
export const CACHE_TTL = {
  // Reference data (rarely changes)
  LEAVE_TYPES: 10 * 60 * 1000, // 10 minutes
  TEMPLATES: 10 * 60 * 1000, // 10 minutes

  // Dynamic data
  BALANCES: 5 * 60 * 1000, // 5 minutes
  REQUESTS: 2 * 60 * 1000, // 2 minutes

  // Analytics (expensive to compute)
  ANALYTICS: 15 * 60 * 1000, // 15 minutes
};

/**
 * Cache key generators
 */
export const CACHE_KEYS = {
  leaveTypes: () => 'leave:types',
  leaveType: (id: string) => `leave:type:${id}`,
  leaveBalances: (year: number) => `leave:balances:${year}`,
  leaveTemplates: () => 'leave:templates',
  leaveRequests: (page: number, status?: string) =>
    `leave:requests:${page}:${status || 'all'}`,
  myLeaveData: (year: number) => `leave:my-data:${year}`,
  analytics: (type: string, year: number) => `leave:analytics:${type}:${year}`,
};

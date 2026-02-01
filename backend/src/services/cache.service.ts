/**
 * Cache Service
 * In-memory caching layer using node-cache
 * Reduces database load for frequently accessed, rarely changed data
 */

import NodeCache from 'node-cache';
import { logger } from '../utils/logger.js';

/**
 * Cache Configuration
 */
const CACHE_CONFIG = {
  // Default TTL in seconds (10 minutes)
  stdTTL: 600,

  // Check period for expired keys (2 minutes)
  checkperiod: 120,

  // Use clone to avoid reference issues
  useClones: true,

  // Delete expired keys on check
  deleteOnExpire: true,

  // Max keys (prevent memory issues)
  maxKeys: 1000,
};

/**
 * Cache key prefixes for different data types
 */
export const CACHE_KEYS = {
  LEAVE_TYPES: (companyId: string) => `leave_types:${companyId}`,
  LEAVE_TYPE: (companyId: string, typeId: string) => `leave_type:${companyId}:${typeId}`,
  LEAVE_BALANCES: (companyId: string, year: number, employeeId?: string) =>
    `leave_balances:${companyId}:${year}${employeeId ? `:${employeeId}` : ''}`,
  LEAVE_TEMPLATES: (companyId: string) => `leave_templates:${companyId}`,
  EMPLOYEE_LEAVE_DATA: (employeeId: string, year: number) => `employee_leave:${employeeId}:${year}`,
  ANALYTICS_KPI: (companyId: string, year: number) => `analytics_kpi:${companyId}:${year}`,
  ANALYTICS_UTILIZATION: (companyId: string, year: number) =>
    `analytics_util:${companyId}:${year}`,
};

/**
 * Cache TTL presets for different data types
 */
export const CACHE_TTL = {
  // Reference data (rarely changes)
  LEAVE_TYPES: 600, // 10 minutes
  LEAVE_TEMPLATES: 600, // 10 minutes

  // Dynamic data (changes frequently)
  LEAVE_BALANCES: 300, // 5 minutes
  EMPLOYEE_DATA: 300, // 5 minutes

  // Analytics data (expensive to compute)
  ANALYTICS: 900, // 15 minutes

  // Short-lived cache (for request deduplication)
  SHORT: 60, // 1 minute
};

class CacheService {
  private cache: NodeCache;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  constructor() {
    this.cache = new NodeCache(CACHE_CONFIG);
    this.setupEventListeners();
  }

  /**
   * Setup cache event listeners for monitoring
   */
  private setupEventListeners(): void {
    this.cache.on('set', (key) => {
      this.stats.sets++;
      logger.debug(`Cache SET: ${key}`);
    });

    this.cache.on('del', (key) => {
      this.stats.deletes++;
      logger.debug(`Cache DEL: ${key}`);
    });

    this.cache.on('expired', (key) => {
      logger.debug(`Cache EXPIRED: ${key}`);
    });

    this.cache.on('flush', () => {
      logger.info('Cache FLUSHED');
    });
  }

  /**
   * Get value from cache
   * @param key Cache key
   * @returns Cached value or undefined
   */
  get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);

    if (value !== undefined) {
      this.stats.hits++;
      logger.debug(`Cache HIT: ${key}`);
    } else {
      this.stats.misses++;
      logger.debug(`Cache MISS: ${key}`);
    }

    return value;
  }

  /**
   * Set value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (optional, uses default if not specified)
   * @returns Success boolean
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    try {
      const success = this.cache.set(key, value, ttl || CACHE_CONFIG.stdTTL);

      if (!success) {
        logger.warn(`Cache SET failed: ${key} (possible maxKeys limit reached)`);
      }

      return success;
    } catch (error) {
      logger.error(`Cache SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get value from cache or compute and cache it
   * @param key Cache key
   * @param fetcher Function to fetch value if not in cache
   * @param ttl Time to live in seconds
   * @returns Cached or fetched value
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Cache miss - fetch and cache
    try {
      const value = await fetcher();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      logger.error(`Cache getOrSet fetcher failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete value from cache
   * @param key Cache key or array of keys
   * @returns Number of deleted entries
   */
  del(key: string | string[]): number {
    return this.cache.del(key);
  }

  /**
   * Check if key exists in cache
   * @param key Cache key
   * @returns Boolean indicating if key exists
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get TTL for a key
   * @param key Cache key
   * @returns TTL in seconds or undefined if key doesn't exist
   */
  getTtl(key: string): number | undefined {
    return this.cache.getTtl(key);
  }

  /**
   * Update TTL for a key
   * @param key Cache key
   * @param ttl New TTL in seconds
   * @returns Success boolean
   */
  setTtl(key: string, ttl: number): boolean {
    return this.cache.ttl(key, ttl);
  }

  /**
   * Flush all cache entries
   */
  flush(): void {
    this.cache.flushAll();
    this.resetStats();
  }

  /**
   * Flush cache entries matching a pattern
   * @param pattern String pattern to match (e.g., "leave_types:")
   */
  flushPattern(pattern: string): number {
    const keys = this.cache.keys();
    const matchingKeys = keys.filter((key) => key.includes(pattern));

    if (matchingKeys.length > 0) {
      logger.info(`Flushing ${matchingKeys.length} cache keys matching pattern: ${pattern}`);
      return this.cache.del(matchingKeys);
    }

    return 0;
  }

  /**
   * Invalidate cache for a specific company
   * @param companyId Company ID
   */
  invalidateCompany(companyId: string): void {
    this.flushPattern(`:${companyId}`);
  }

  /**
   * Invalidate leave types cache for a company
   * @param companyId Company ID
   */
  invalidateLeaveTypes(companyId: string): void {
    this.del(CACHE_KEYS.LEAVE_TYPES(companyId));
    this.flushPattern(`leave_type:${companyId}:`);
  }

  /**
   * Invalidate leave balances cache for a company/employee/year
   * @param companyId Company ID
   * @param year Year (optional)
   * @param employeeId Employee ID (optional)
   */
  invalidateLeaveBalances(companyId: string, year?: number, employeeId?: string): void {
    if (year && employeeId) {
      // Invalidate specific employee balance
      this.del(CACHE_KEYS.LEAVE_BALANCES(companyId, year, employeeId));
      this.del(CACHE_KEYS.EMPLOYEE_LEAVE_DATA(employeeId, year));
    } else if (year) {
      // Invalidate all balances for year
      this.flushPattern(`leave_balances:${companyId}:${year}`);
    } else {
      // Invalidate all balances for company
      this.flushPattern(`leave_balances:${companyId}:`);
    }
  }

  /**
   * Invalidate analytics cache for a company
   * @param companyId Company ID
   */
  invalidateAnalytics(companyId: string): void {
    this.flushPattern(`analytics_`);
    this.flushPattern(`:${companyId}:`);
  }

  /**
   * Get cache statistics
   * @returns Cache statistics object
   */
  getStats(): {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    hitRate: number;
    keys: number;
    size: number;
  } {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      keys: this.cache.keys().length,
      size: this.cache.getStats().ksize,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
  }

  /**
   * Get all cache keys (for debugging)
   * @returns Array of all cache keys
   */
  keys(): string[] {
    return this.cache.keys();
  }

  /**
   * Close cache and cleanup
   */
  close(): void {
    this.cache.close();
    logger.info('Cache service closed');
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Export for testing
export { CacheService };

/**
 * Performance Monitoring Middleware
 * Tracks and logs slow API requests
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Performance thresholds (in milliseconds)
 */
const THRESHOLDS = {
  SLOW: 1000, // Log warning if request takes > 1000ms
  VERY_SLOW: 3000, // Log error if request takes > 3000ms
};

/**
 * Performance monitoring middleware
 * Logs requests that exceed performance thresholds
 */
export const performanceMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  // Capture original end function
  const originalEnd = res.end;

  // Override end function to measure duration
  res.end = function (chunk?: unknown, encoding?: unknown, callback?: unknown): Response {
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = endMemory - startMemory;

    // Build log context
    const context = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      memoryDelta: Math.round(memoryDelta / 1024 / 1024 * 100) / 100, // MB
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      userId: (req as { user?: { id: string } }).user?.id,
      companyId: (req as { user?: { companyId: string } }).user?.companyId,
    };

    // Log based on performance threshold
    if (duration > THRESHOLDS.VERY_SLOW) {
      logger.error(`VERY SLOW REQUEST (${duration}ms)`, context);
    } else if (duration > THRESHOLDS.SLOW) {
      logger.warn(`SLOW REQUEST (${duration}ms)`, context);
    } else {
      // Only log in debug mode for fast requests
      logger.debug(`Request completed in ${duration}ms`, context);
    }

    // Add performance headers
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration}ms`);
    }

    // Call original end function
    // @ts-ignore - Dynamic arguments for res.end
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
};

/**
 * Request timeout middleware
 * Terminates requests that exceed maximum duration
 */
export const requestTimeoutMiddleware = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.error('Request timeout', {
          method: req.method,
          path: req.path,
          timeout: timeoutMs,
        });

        res.status(504).json({
          success: false,
          error: {
            message: 'Request timeout',
            code: 'REQUEST_TIMEOUT',
          },
        });
      }
    }, timeoutMs);

    // Clear timeout when request completes
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
};

/**
 * Performance statistics collector
 * Tracks aggregate performance metrics
 */
class PerformanceStats {
  private stats: Map<string, {
    count: number;
    totalDuration: number;
    maxDuration: number;
    minDuration: number;
    slowCount: number;
  }> = new Map();

  record(path: string, duration: number): void {
    const key = path;
    const existing = this.stats.get(key);

    if (existing) {
      existing.count++;
      existing.totalDuration += duration;
      existing.maxDuration = Math.max(existing.maxDuration, duration);
      existing.minDuration = Math.min(existing.minDuration, duration);
      if (duration > THRESHOLDS.SLOW) {
        existing.slowCount++;
      }
    } else {
      this.stats.set(key, {
        count: 1,
        totalDuration: duration,
        maxDuration: duration,
        minDuration: duration,
        slowCount: duration > THRESHOLDS.SLOW ? 1 : 0,
      });
    }
  }

  getStats(): Record<string, {
    count: number;
    avgDuration: number;
    maxDuration: number;
    minDuration: number;
    slowCount: number;
    slowPercentage: number;
  }> {
    const result: Record<string, {
      count: number;
      avgDuration: number;
      maxDuration: number;
      minDuration: number;
      slowCount: number;
      slowPercentage: number;
    }> = {};

    this.stats.forEach((value, key) => {
      result[key] = {
        count: value.count,
        avgDuration: Math.round(value.totalDuration / value.count),
        maxDuration: value.maxDuration,
        minDuration: value.minDuration,
        slowCount: value.slowCount,
        slowPercentage: Math.round((value.slowCount / value.count) * 100 * 100) / 100,
      };
    });

    return result;
  }

  getSlowestEndpoints(limit: number = 10): Array<{
    path: string;
    avgDuration: number;
    maxDuration: number;
    count: number;
  }> {
    const stats = this.getStats();
    return Object.entries(stats)
      .map(([path, stat]) => ({
        path,
        avgDuration: stat.avgDuration,
        maxDuration: stat.maxDuration,
        count: stat.count,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  reset(): void {
    this.stats.clear();
  }
}

// Export singleton instance
export const performanceStats = new PerformanceStats();

/**
 * Performance statistics recording middleware
 */
export const performanceStatsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    performanceStats.record(req.path, duration);
  });

  next();
};

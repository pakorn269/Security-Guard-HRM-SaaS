/**
 * Performance Optimization Utilities
 * Helper functions for optimizing React components and API calls
 */

/**
 * Debounce function to limit the rate at which a function can fire
 * Useful for search inputs, resize handlers, etc.
 *
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to ensure a function is only called once per specified time period
 * Useful for scroll handlers, mouse move events, etc.
 *
 * @param func Function to throttle
 * @param limit Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Cache function results in memory
 * Useful for expensive computations with stable inputs
 *
 * @param fn Function to memoize
 * @param getKey Function to generate cache key from arguments
 * @returns Memoized function
 */
export function memoize<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  getKey?: (...args: TArgs) => string
): (...args: TArgs) => TResult {
  const cache = new Map<string, TResult>();

  return (...args: TArgs): TResult => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Batch multiple function calls into a single execution
 * Useful for batching API calls, state updates, etc.
 *
 * @param fn Function to batch
 * @param wait Wait time in milliseconds
 * @returns Batched function
 */
export function batch<T>(
  fn: (items: T[]) => void,
  wait: number
): (item: T) => void {
  let items: T[] = [];
  let timeout: number | null = null;

  return (item: T) => {
    items.push(item);

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      fn(items);
      items = [];
      timeout = null;
    }, wait);
  };
}

/**
 * Lazy load images with Intersection Observer
 *
 * @param imageElement Image element to lazy load
 */
export function lazyLoadImage(imageElement: HTMLImageElement): void {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;

        if (src) {
          img.src = src;
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      }
    });
  });

  imageObserver.observe(imageElement);
}

/**
 * Prefetch data when user hovers over a link
 *
 * @param prefetchFn Function to prefetch data
 * @returns Hover event handlers
 */
export function usePrefetch(prefetchFn: () => void) {
  let timeoutId: number | null = null;

  const onMouseEnter = () => {
    timeoutId = setTimeout(() => {
      prefetchFn();
    }, 100); // Small delay to avoid unnecessary prefetches
  };

  const onMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };

  return { onMouseEnter, onMouseLeave };
}

/**
 * Calculate stale time based on data freshness requirements
 *
 * @param type Data type
 * @returns Stale time in milliseconds
 */
export function getStaleTime(
  type: 'static' | 'semi-static' | 'dynamic' | 'realtime'
): number {
  switch (type) {
    case 'static':
      return 1000 * 60 * 60; // 1 hour - for reference data (leave types, templates)
    case 'semi-static':
      return 1000 * 60 * 5; // 5 minutes - for balances, employee data
    case 'dynamic':
      return 1000 * 60; // 1 minute - for frequently changing data
    case 'realtime':
      return 0; // No caching - for real-time data
    default:
      return 1000 * 60 * 5; // Default: 5 minutes
  }
}

/**
 * Virtual scrolling helper
 * Calculate visible items in a scrollable list
 *
 * @param scrollTop Current scroll position
 * @param itemHeight Height of each item
 * @param containerHeight Height of the container
 * @param totalItems Total number of items
 * @param overscan Number of items to render outside viewport
 * @returns Visible range
 */
export function getVisibleRange(
  scrollTop: number,
  itemHeight: number,
  containerHeight: number,
  totalItems: number,
  overscan: number = 3
): { startIndex: number; endIndex: number } {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(totalItems - 1, startIndex + visibleCount + overscan * 2);

  return { startIndex, endIndex };
}

/**
 * Check if device prefers reduced motion
 * Useful for disabling animations
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Performance mark helper for measuring custom metrics
 */
export const perf = {
  mark(name: string): void {
    if (performance.mark) {
      performance.mark(name);
    }
  },

  measure(name: string, startMark: string, endMark?: string): void {
    if (performance.measure) {
      try {
        if (endMark) {
          performance.measure(name, startMark, endMark);
        } else {
          performance.measure(name, startMark);
        }
      } catch (e) {
        // Marks might not exist
        console.warn(`Performance measure failed: ${name}`, e);
      }
    }
  },

  clearMarks(name?: string): void {
    if (performance.clearMarks) {
      performance.clearMarks(name);
    }
  },

  getEntries(type?: string): PerformanceEntry[] {
    if (performance.getEntriesByType && type) {
      return performance.getEntriesByType(type);
    }
    return performance.getEntries();
  },
};

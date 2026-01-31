import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Custom hook for URL-based filter persistence with SessionStorage fallback
 * Syncs filter state with URL search parameters and SessionStorage
 *
 * Features:
 * - Automatic URL synchronization
 * - SessionStorage fallback (preserves filters when navigating via sidebar)
 * - Type-safe filter values
 * - Browser back/forward support
 * - Shareable URLs with filters
 * - Default values support
 *
 * Initialization Priority:
 * 1. URL parameters (highest priority - for sharing and bookmarks)
 * 2. SessionStorage (fallback - preserves filters during navigation)
 * 3. Default values (lowest priority - fresh start)
 */

export interface UseUrlFiltersOptions<T extends Record<string, any>> {
  /** Default filter values */
  defaults: T;
  /** SessionStorage key for persisting filters */
  storageKey?: string;
  /** Parse URL parameter to typed value */
  parser?: Partial<Record<keyof T, (value: string) => any>>;
  /** Serialize typed value to URL parameter */
  serializer?: Partial<Record<keyof T, (value: any) => string>>;
  /** Debounce URL updates (ms) */
  debounceMs?: number;
}

/**
 * Hook to manage filters with URL persistence
 *
 * @example
 * const { filters, setFilter, setFilters, resetFilters } = useUrlFilters({
 *   defaults: {
 *     page: 1,
 *     pageSize: 20,
 *     startDate: '2024-01-01',
 *     status: undefined,
 *   },
 *   parser: {
 *     page: (v) => parseInt(v, 10),
 *     pageSize: (v) => parseInt(v, 10),
 *   },
 * });
 */
export function useUrlFilters<T extends Record<string, any>>(
  options: UseUrlFiltersOptions<T>
): {
  filters: T;
  setFilter: (key: keyof T, value: any) => void;
  setFilters: (updates: Partial<T>) => void;
  resetFilters: () => void;
  isInitialized: boolean;
} {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFiltersState] = useState<T>(options.defaults);
  const [isInitialized, setIsInitialized] = useState(false);
  const storageKey = options.storageKey || 'urlFilters';

  // Parse URL parameters to typed values
  const parseUrlParams = useCallback((): Partial<T> => {
    const parsed: Partial<T> = {};

    for (const [key, value] of searchParams.entries()) {
      if (key in options.defaults) {
        const typedKey = key as keyof T;
        const parser = options.parser?.[typedKey];

        if (parser) {
          // Use custom parser
          parsed[typedKey] = parser(value) as T[keyof T];
        } else {
          // Auto-detect type from default value
          const defaultValue = options.defaults[typedKey];

          if (typeof defaultValue === 'number') {
            const parsedNumber = parseFloat(value);
            if (!isNaN(parsedNumber)) {
              (parsed as any)[typedKey] = parsedNumber;
            }
          } else if (typeof defaultValue === 'boolean') {
            (parsed as any)[typedKey] = value === 'true';
          } else {
            // String or undefined
            (parsed as any)[typedKey] = value;
          }
        }
      }
    }

    return parsed;
  }, [searchParams, options.defaults, options.parser]);

  // Load filters from SessionStorage
  const loadFromStorage = useCallback((): Partial<T> => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate that stored keys match defaults
        const validated: Partial<T> = {};
        for (const key in parsed) {
          if (key in options.defaults) {
            validated[key as keyof T] = parsed[key];
          }
        }
        return validated;
      }
    } catch (err) {
      console.warn('Failed to load filters from SessionStorage:', err);
    }
    return {};
  }, [storageKey, options.defaults]);

  // Save filters to SessionStorage
  const saveToStorage = useCallback((filters: T) => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(filters));
    } catch (err) {
      console.warn('Failed to save filters to SessionStorage:', err);
    }
  }, [storageKey]);

  // Initialize filters with hybrid approach: URL > SessionStorage > Default
  useEffect(() => {
    const urlFilters = parseUrlParams();
    const hasUrlParams = Object.keys(urlFilters).length > 0;

    let initialFilters: T;

    if (hasUrlParams) {
      // Priority 1: URL has parameters (for sharing/bookmarks)
      initialFilters = { ...options.defaults, ...urlFilters };
    } else {
      // Priority 2: Check SessionStorage (for sidebar navigation)
      const storedFilters = loadFromStorage();
      const hasStoredFilters = Object.keys(storedFilters).length > 0;

      if (hasStoredFilters) {
        initialFilters = { ...options.defaults, ...storedFilters };
      } else {
        // Priority 3: Use defaults (fresh start)
        initialFilters = options.defaults;
      }
    }

    setFiltersState(initialFilters);
    setIsInitialized(true);
  }, []); // Only run once on mount

  // Update URL and SessionStorage when filters change
  useEffect(() => {
    if (!isInitialized) return;

    // Save to SessionStorage
    saveToStorage(filters);

    // Update URL parameters
    const newParams = new URLSearchParams();

    for (const key in filters) {
      const value = filters[key];

      // Skip if value is undefined or null
      if (value === undefined || value === null) {
        continue;
      }

      const serializer = options.serializer?.[key];
      let stringValue: string;

      if (serializer) {
        // Use custom serializer
        stringValue = serializer(value);
      } else {
        // Auto-serialize
        stringValue = String(value);
      }

      newParams.set(key, stringValue);
    }

    // Update URL without navigation
    setSearchParams(newParams, { replace: true });
  }, [filters, isInitialized, options.serializer, setSearchParams, saveToStorage]);

  // Set single filter value
  const setFilter = useCallback((key: keyof T, value: any) => {
    setFiltersState((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Set multiple filter values
  const setFilters = useCallback((updates: Partial<T>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Reset all filters to defaults
  const resetFilters = useCallback(() => {
    setFiltersState(options.defaults);
  }, [options.defaults]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    isInitialized,
  };
}

/**
 * Build a shareable URL with current filters
 *
 * @param baseUrl - Base URL (default: current page)
 * @param filters - Filter object
 * @returns Complete URL with filters
 *
 * @example
 * const shareUrl = buildShareableUrl(
 *   '/attendance',
 *   { startDate: '2024-01-01', status: 'late' }
 * );
 * // Result: "https://example.com/attendance?startDate=2024-01-01&status=late"
 */
export function buildShareableUrl<T extends Record<string, any>>(
  baseUrl: string,
  filters: T
): string {
  const params = new URLSearchParams();

  for (const key in filters) {
    const value = filters[key];

    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }

  const queryString = params.toString();
  const fullUrl = `${window.location.origin}${baseUrl}`;

  return queryString ? `${fullUrl}?${queryString}` : fullUrl;
}

/**
 * Copy current page URL with filters to clipboard
 *
 * @param filters - Filter object
 * @returns Promise that resolves when copied
 *
 * @example
 * await copyFiltersToClipboard({ startDate: '2024-01-01', status: 'late' });
 */
export async function copyFiltersToClipboard<T extends Record<string, any>>(
  filters: T
): Promise<void> {
  const url = buildShareableUrl(window.location.pathname, filters);
  await navigator.clipboard.writeText(url);
}

import { useState, useEffect } from 'react';
import liff from '@line/liff';

interface LiffState {
  isInClient: boolean;
  isLoggedIn: boolean;
  isReady: boolean;
  liffId: string | null;
  error: Error | null;
}

/**
 * Custom hook to detect and manage LIFF context
 *
 * This hook initializes the LIFF SDK and provides context about
 * whether the app is running inside LINE or a regular browser.
 *
 * Usage:
 * const { isInClient, isReady, liffId } = useLiff();
 *
 * @returns {LiffState} LIFF context state
 */
export function useLiff(): LiffState {
  const [state, setState] = useState<LiffState>({
    isInClient: false,
    isLoggedIn: false,
    isReady: false,
    liffId: null,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const initializeLiff = async () => {
      try {
        // Get LIFF ID from environment
        // Default to schedule LIFF ID, but can be dynamic
        const liffId = import.meta.env.VITE_LIFF_SCHEDULE_ID;

        if (!liffId) {
          throw new Error('LIFF ID not configured');
        }

        await liff.init({ liffId });

        if (!mounted) return;

        setState({
          isInClient: liff.isInClient(),
          isLoggedIn: liff.isLoggedIn(),
          isReady: true,
          liffId: liff.id || null,
          error: null,
        });
      } catch (error) {
        if (!mounted) return;

        setState({
          isInClient: false,
          isLoggedIn: false,
          isReady: true,
          liffId: null,
          error: error instanceof Error ? error : new Error('LIFF initialization failed'),
        });
      }
    };

    initializeLiff();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}

/**
 * Get LIFF ID Token
 *
 * Retrieves the LINE ID token for authentication.
 * Must be called after LIFF is initialized and user is logged in.
 */
export async function getLiffIdToken(): Promise<string | null> {
  try {
    if (!liff.isInClient()) {
      return null;
    }

    if (!liff.isLoggedIn()) {
      await liff.login();
    }

    const idToken = liff.getIDToken();
    return idToken || null;
  } catch (error) {
    console.error('Failed to get LIFF ID token:', error);
    return null;
  }
}

/**
 * Get LIFF Context Headers
 *
 * Returns headers to include in API requests to identify LIFF context.
 * This helps the backend track whether requests come from LIFF or web.
 */
export function getLiffHeaders(): Record<string, string> {
  if (!liff.isInClient()) {
    return {};
  }

  return {
    'X-LIFF-ID': liff.id || '',
    'X-LIFF-Version': liff.getVersion(),
    'X-Is-LIFF-Client': 'true',
  };
}

/**
 * Check if running in LIFF context (synchronous)
 *
 * Note: This only works after LIFF SDK is loaded.
 * For initialization, use useLiff() hook instead.
 */
export function isLiffClient(): boolean {
  try {
    return liff.isInClient();
  } catch {
    return false;
  }
}

export default useLiff;

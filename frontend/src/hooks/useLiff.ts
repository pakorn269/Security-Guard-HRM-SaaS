import { useState, useEffect } from 'react';
import liff from '@line/liff';

interface LiffState {
  isInClient: boolean;
  isLoggedIn: boolean;
  isReady: boolean;
  liffId: string | null;
  error: Error | null;
  isDevMode: boolean;
}

/**
 * Check if LIFF development mode is enabled
 * When enabled, allows accessing LIFF pages through regular browser for testing
 */
function isLiffDevModeEnabled(): boolean {
  return import.meta.env.VITE_LIFF_DEV_MODE === 'true';
}

/**
 * Custom hook to detect and manage LIFF context
 *
 * This hook initializes the LIFF SDK and provides context about
 * whether the app is running inside LINE or a regular browser.
 *
 * When VITE_LIFF_DEV_MODE=true, the hook allows browser access for testing.
 *
 * Usage:
 * const { isInClient, isReady, liffId, isDevMode } = useLiff();
 *
 * @returns {LiffState} LIFF context state
 */
export function getCurrentLiffId(): string | null {
  const path = window.location.pathname;
  const env = import.meta.env;

  if (path.includes('/liff/schedule') && env.VITE_LIFF_SCHEDULE_ID) return env.VITE_LIFF_SCHEDULE_ID;
  if (path.includes('/liff/clock') && env.VITE_LIFF_CLOCK_ID) return env.VITE_LIFF_CLOCK_ID;
  if (path.includes('/liff/leave') && env.VITE_LIFF_LEAVE_ID) return env.VITE_LIFF_LEAVE_ID;
  if (path.includes('/liff/profile') && env.VITE_LIFF_PROFILE_ID) return env.VITE_LIFF_PROFILE_ID;

  return env.VITE_LIFF_ID || null;
}

export function useLiff(): LiffState {
  const devMode = isLiffDevModeEnabled();

  const [state, setState] = useState<LiffState>({
    isInClient: false,
    isLoggedIn: false,
    isReady: false,
    liffId: null,
    error: null,
    isDevMode: devMode,
  });

  useEffect(() => {
    let mounted = true;

    const initializeLiff = async () => {
      try {
        // Get LIFF ID from environment based on current path
        const liffId = getCurrentLiffId();

        if (!liffId) {
          throw new Error('LIFF ID not configured');
        }

        await liff.init({ liffId });

        if (!mounted) return;

        const actuallyInClient = liff.isInClient();

        // In dev mode, simulate being in client for browser testing
        setState({
          isInClient: devMode || actuallyInClient,
          isLoggedIn: liff.isLoggedIn(),
          isReady: true,
          liffId: liff.id || null,
          error: null,
          isDevMode: devMode,
        });

        if (devMode && !actuallyInClient) {
          console.warn(
            '🔧 LIFF Dev Mode: Running in browser with simulated LIFF context. ' +
            'Set VITE_LIFF_DEV_MODE=false for production.'
          );
        }
      } catch (error) {
        if (!mounted) return;

        // In dev mode, allow continuing even if LIFF init fails
        if (devMode) {
          console.warn(
            '🔧 LIFF Dev Mode: LIFF initialization failed, but dev mode is enabled. ' +
            'Proceeding with simulated context.',
            error
          );
          setState({
            isInClient: true, // Simulate being in client
            isLoggedIn: false,
            isReady: true,
            liffId: null,
            error: null, // Don't report error in dev mode
            isDevMode: devMode,
          });
        } else {
          setState({
            isInClient: false,
            isLoggedIn: false,
            isReady: true,
            liffId: null,
            error: error instanceof Error ? error : new Error('LIFF initialization failed'),
            isDevMode: devMode,
          });
        }
      }
    };

    initializeLiff();

    return () => {
      mounted = false;
    };
  }, [devMode]);

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

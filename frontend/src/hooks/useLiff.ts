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

const LIFF_ID_STORAGE_KEY = 'liff_session_id';

/**
 * Get the current LIFF ID based on the path.
 * 
 * IMPORTANT: Once a LIFF ID is determined, it is stored in sessionStorage
 * and reused for the entire session. This prevents the infinite login loop
 * that occurs when navigating between pages (e.g., /liff/clock → /liff/link)
 * where different LIFF IDs might be resolved, causing the SDK to think
 * the user isn't logged in.
 */
export function getCurrentLiffId(): string | null {
  const path = window.location.pathname;
  const env = import.meta.env;

  // IMPORTANT: /liff/link pages need their own LIFF ID because each LIFF app
  // is configured with a specific endpoint URL in LINE Developer Console.
  // Using a LIFF ID from another page (e.g., /liff/clock) will cause login state issues.
  const isLinkPage = path.includes('/liff/link');

  // For link pages, always use the dedicated LIFF_LINK_ID (or fallback to VITE_LIFF_ID)
  // Do NOT use stored LIFF ID from other pages
  if (isLinkPage) {
    const linkLiffId = env.VITE_LIFF_LINK_ID || env.VITE_LIFF_ID || null;
    console.log('[useLiff] Link page - using LIFF ID:', linkLiffId);
    return linkLiffId;
  }

  // For other LIFF pages, check if we have a stored LIFF ID for session consistency
  const storedLiffId = sessionStorage.getItem(LIFF_ID_STORAGE_KEY);
  if (storedLiffId) {
    console.log('[useLiff] Using stored LIFF ID:', storedLiffId);
    return storedLiffId;
  }

  let liffId: string | null = null;

  // Determine LIFF ID based on path
  if (path.includes('/liff/schedule') && env.VITE_LIFF_SCHEDULE_ID) {
    liffId = env.VITE_LIFF_SCHEDULE_ID;
  } else if (path.includes('/liff/clock') && env.VITE_LIFF_CLOCK_ID) {
    liffId = env.VITE_LIFF_CLOCK_ID;
  } else if (path.includes('/liff/leave') && env.VITE_LIFF_LEAVE_ID) {
    liffId = env.VITE_LIFF_LEAVE_ID;
  } else if (path.includes('/liff/profile') && env.VITE_LIFF_PROFILE_ID) {
    liffId = env.VITE_LIFF_PROFILE_ID;
  } else {
    // Fallback to default LIFF ID
    liffId = env.VITE_LIFF_ID || null;
  }

  // Store the LIFF ID for this session to ensure consistency
  if (liffId) {
    console.log('[useLiff] Storing LIFF ID for session:', liffId);
    sessionStorage.setItem(LIFF_ID_STORAGE_KEY, liffId);
  }

  return liffId;
}

/**
 * Clear the stored LIFF ID (call this on logout)
 */
export function clearStoredLiffId(): void {
  sessionStorage.removeItem(LIFF_ID_STORAGE_KEY);
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

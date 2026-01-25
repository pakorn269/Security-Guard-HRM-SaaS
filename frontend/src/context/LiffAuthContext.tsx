// LIFF Auth Context
// Manages LIFF authentication state and account linking flow
// Now also supports email-based authentication (without LINE)

import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import liff from '@line/liff';
import { getCurrentLiffId, clearStoredLiffId, getIdTokenWithRetry, waitForLiffReady } from '../hooks/useLiff';
import liffAuthService, { type LineProfile } from '../services/liff-auth.service';
import { clearTokens, getAccessToken } from '../services/api';
import type { AuthUser } from '../types/auth';

// ============================================================
// Types
// ============================================================

export type LiffAuthStatus =
    | 'initializing'     // LIFF SDK is initializing
    | 'not_logged_in'    // User not logged into LINE
    | 'verifying'        // Verifying LINE token with backend
    | 'not_linked'       // LINE verified but not linked to user
    | 'linked'           // LINE verified and linked to user
    | 'email_auth'       // Authenticated via email (no LINE)
    | 'error';           // An error occurred

export interface LiffAuthState {
    status: LiffAuthStatus;
    user: AuthUser | null;
    lineProfile: LineProfile | null;
    error: string | null;
    idToken: string | null;
    liffId: string | null;
    isEmailAuth: boolean;  // True if user logged in via email, not LINE
}

type LiffAuthAction =
    | { type: 'INIT_START' }
    | { type: 'LIFF_READY'; payload: { idToken: string; liffId: string } }
    | { type: 'NOT_LOGGED_IN' }
    | { type: 'VERIFY_START' }
    | { type: 'LINK_SUCCESS'; payload: AuthUser }
    | { type: 'NOT_LINKED'; payload: LineProfile }
    | { type: 'LINK_START' }
    | { type: 'ERROR'; payload: string }
    | { type: 'LOGOUT' }
    | { type: 'CLEAR_ERROR' }
    | { type: 'LINK_START' }
    | { type: 'ERROR'; payload: string }
    | { type: 'LOGOUT' }
    | { type: 'CLEAR_ERROR' }
    | { type: 'EMAIL_AUTH_SUCCESS'; payload: AuthUser }
    | { type: 'UPDATE_USER'; payload: AuthUser };

// ============================================================
// Initial State
// ============================================================

const initialState: LiffAuthState = {
    status: 'initializing',
    user: null,
    lineProfile: null,
    error: null,
    idToken: null,
    liffId: null,
    isEmailAuth: false,
};

// ============================================================
// Reducer
// ============================================================

function liffAuthReducer(state: LiffAuthState, action: LiffAuthAction): LiffAuthState {
    switch (action.type) {
        case 'INIT_START':
            return { ...state, status: 'initializing', error: null };

        case 'LIFF_READY':
            return {
                ...state,
                idToken: action.payload.idToken,
                liffId: action.payload.liffId,
                status: 'verifying',
            };

        case 'NOT_LOGGED_IN':
            return { ...state, status: 'not_logged_in' };

        case 'VERIFY_START':
            return { ...state, status: 'verifying', error: null };

        case 'LINK_SUCCESS':
            return {
                ...state,
                status: 'linked',
                user: action.payload,
                error: null,
            };

        case 'NOT_LINKED':
            return {
                ...state,
                status: 'not_linked',
                lineProfile: action.payload,
                error: null,
            };

        case 'LINK_START':
            return { ...state, status: 'verifying', error: null };

        case 'ERROR':
            return { ...state, status: 'error', error: action.payload };

        case 'LOGOUT':
            return {
                ...initialState,
                status: 'not_logged_in',
            };

        case 'CLEAR_ERROR':
            return { ...state, error: null };

        case 'EMAIL_AUTH_SUCCESS':
            return {
                ...state,
                status: 'email_auth',
                user: action.payload,
                error: null,
                isEmailAuth: true,
            };

        case 'UPDATE_USER':
            return {
                ...state,
                user: action.payload,
                // Check if user is still linked (has lineUserId)
                // If we unlinked, status might change if we were 'linked'.
                // If we linked, status might become 'linked' if we were 'email_auth'.
                // But keeping it simple for now, 'linked' means "Logged in via LINE" originally, or just "Is Linked"?
                // The current logic uses 'linked' as a login state mostly.
                // Let's not change status blindly, just update user.
            };

        default:
            return state;
    }
}

// ============================================================
// Context
// ============================================================

interface LiffAuthContextValue extends LiffAuthState {
    // Methods for linking
    linkWithEmployeeCode: (employeeCode: string, phone: string, companySlug: string) => Promise<boolean>;
    linkWithCredentials: (email: string, password: string) => Promise<boolean>;
    unlinkLine: () => Promise<boolean>;
    connectLine: () => Promise<boolean>;

    // Other methods
    logout: () => Promise<void>;
    clearError: () => void;
    retry: () => void;

    // Computed
    isLoading: boolean;
    isLinked: boolean;
    needsLinking: boolean;
}

const LiffAuthContext = createContext<LiffAuthContextValue | undefined>(undefined);

// ============================================================
// Provider
// ============================================================

interface LiffAuthProviderProps {
    children: ReactNode;
}

export function LiffAuthProvider({ children }: LiffAuthProviderProps) {
    const [state, dispatch] = useReducer(liffAuthReducer, initialState);
    const initializingRef = useRef(false);

    // Initialize LIFF SDK and verify with backend
    const initializeLiff = useCallback(async () => {
        // Prevent double initialization
        if (initializingRef.current) return;
        initializingRef.current = true;

        try {
            dispatch({ type: 'INIT_START' });

            // ============================================================
            // Check for existing JWT token first (handles both email login and
            // users who just completed LINE linking in LiffLinkLayout)
            // ============================================================
            const existingToken = getAccessToken();
            console.log('[LiffAuth] Checking for existing token:', !!existingToken);
            if (existingToken) {
                console.log('[LiffAuth] Found existing JWT token, verifying with /auth/me...');
                try {
                    // Use fetch instead of axios in LIFF context to avoid axios issues in LINE app
                    // axios has problems with request interception in LINE's in-app browser
                    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
                    const response = await fetch(`${baseURL}/auth/me`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${existingToken}`,
                        },
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data?.success && data?.data) {
                            const user = data.data;
                            // Check if user has LINE linked to determine auth mode
                            if (user.lineUserId) {
                                console.log('[LiffAuth] JWT token valid, user has LINE linked');
                                dispatch({ type: 'LINK_SUCCESS', payload: user });
                            } else {
                                console.log('[LiffAuth] JWT token valid, using email auth mode');
                                dispatch({ type: 'EMAIL_AUTH_SUCCESS', payload: user });
                            }
                            return;
                        }
                    } else if (response.status === 401) {
                        console.log('[LiffAuth] JWT token invalid (401), clearing and continuing with LINE auth');
                        clearTokens();
                    } else {
                        console.log('[LiffAuth] /auth/me failed with status:', response.status);
                        // Keep token and try LINE auth as fallback
                    }
                } catch (err) {
                    console.log('[LiffAuth] /auth/me fetch failed, keeping token:', err);
                    // Network error - keep token and try LINE auth as fallback
                }
            }

            console.log('[LiffAuth] No valid token found, proceeding with LINE authentication');
            // ============================================================
            // No valid JWT token, proceed with LINE authentication
            // ============================================================

            // Check if already initialized
            let liffId = liff.id;

            if (!liffId) {
                liffId = getCurrentLiffId();
                console.log('[LiffAuth] Initializing LIFF with ID:', liffId);

                if (!liffId) {
                    throw new Error('LIFF ID not configured');
                }

                // Initialize LIFF SDK
                await liff.init({ liffId });
                console.log('[LiffAuth] LIFF initialized');
            } else {
                console.log('[LiffAuth] LIFF already initialized with ID:', liffId);
            }

            // Wait for LIFF to be fully ready (handles LINE in-app browser race condition)
            await waitForLiffReady();
            console.log('[LiffAuth] LIFF ready');

            // Check if logged into LINE
            // In LINE in-app browser, isLoggedIn() should be true immediately
            // In external browser, user may need to go through login flow
            const isInClient = liff.isInClient();
            const isLoggedIn = liff.isLoggedIn();
            console.log('[LiffAuth] Context - isInClient:', isInClient, 'isLoggedIn:', isLoggedIn);

            if (!isLoggedIn) {
                // In LINE client, user should always be logged in
                // If somehow not, wait a bit and check again (race condition handling)
                if (isInClient) {
                    console.log('[LiffAuth] In LINE client but not logged in yet, waiting...');
                    await new Promise((resolve) => setTimeout(resolve, 200));
                    if (!liff.isLoggedIn()) {
                        console.log('[LiffAuth] Still not logged in after wait, proceeding anyway in LINE client');
                    }
                } else {
                    console.log('[LiffAuth] Not logged into LINE, redirecting to login...');
                    dispatch({ type: 'NOT_LOGGED_IN' });
                    liff.login();
                    return;
                }
            }

            // Get ID token with retry logic for LINE in-app browser race condition
            // In LINE client, the token should be available but might take a moment
            const idToken = await getIdTokenWithRetry(5, 100);
            console.log('[LiffAuth] ID Token retrieved:', idToken ? 'Yes' : 'No');

            if (!idToken) {
                throw new Error('ไม่สามารถดึงข้อมูลยืนยันตัวตนจาก LINE ได้ กรุณาลองใหม่อีกครั้ง');
            }

            dispatch({ type: 'LIFF_READY', payload: { idToken, liffId } });

            // Verify with backend
            console.log('[LiffAuth] Verifying with backend...');
            const verifyResult = await liffAuthService.verifyLineToken(idToken, liffId);

            if (verifyResult.isLinked) {
                console.log('[LiffAuth] User is linked:', verifyResult.user.id);
                dispatch({ type: 'LINK_SUCCESS', payload: verifyResult.user });
            } else {
                console.log('[LiffAuth] User not linked, LINE profile:', verifyResult.lineProfile.userId);
                dispatch({ type: 'NOT_LINKED', payload: verifyResult.lineProfile });
            }
        } catch (err) {
            console.error('[LiffAuth] Error:', err);
            dispatch({
                type: 'ERROR',
                payload: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
            });
            // Only reset on error to allow retry
            // Keep initializingRef true on success to prevent re-initialization loops
            initializingRef.current = false;
        }
        // Note: initializingRef stays true after successful init to prevent re-init loops
        // The retry() function explicitly resets it when user wants to retry
    }, []);

    // Initialize on mount
    useEffect(() => {
        initializeLiff();
    }, [initializeLiff]);

    // Link with employee code + phone (for guards)
    const linkWithEmployeeCode = useCallback(async (
        employeeCode: string,
        phone: string,
        companySlug: string
    ): Promise<boolean> => {
        if (!state.idToken || !state.liffId) {
            dispatch({ type: 'ERROR', payload: 'ไม่พบข้อมูล LINE token' });
            return false;
        }

        try {
            dispatch({ type: 'LINK_START' });

            const result = await liffAuthService.linkEmployee({
                idToken: state.idToken,
                liffId: state.liffId,
                employeeCode,
                phone,
                companySlug,
            });

            dispatch({ type: 'LINK_SUCCESS', payload: result.user });
            return true;
        } catch (err) {
            dispatch({
                type: 'ERROR',
                payload: err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อบัญชีได้',
            });
            return false;
        }
    }, [state.idToken, state.liffId]);

    // Link with email + password (for managers/admins)
    const linkWithCredentials = useCallback(async (
        email: string,
        password: string
    ): Promise<boolean> => {
        if (!state.idToken || !state.liffId) {
            dispatch({ type: 'ERROR', payload: 'ไม่พบข้อมูล LINE token' });
            return false;
        }

        try {
            dispatch({ type: 'LINK_START' });

            const result = await liffAuthService.linkCredentials({
                idToken: state.idToken,
                liffId: state.liffId,
                email,
                password,
            });

            dispatch({ type: 'LINK_SUCCESS', payload: result.user });
            return true;
        } catch (err) {
            dispatch({
                type: 'ERROR',
                payload: err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อบัญชีได้',
            });
            return false;
        }
    }, [state.idToken, state.liffId]);

    // Unlink LINE account
    const unlinkLine = useCallback(async (): Promise<boolean> => {
        try {
            dispatch({ type: 'LINK_START' }); // Shows loading
            const result = await liffAuthService.unlinkLine();
            dispatch({ type: 'UPDATE_USER', payload: result.user });
            // If success, we should update status?
            // If we were 'linked' (meaning logged in via LINE), unlinking is weird but possible if we have other credentials.
            // If we are 'email_auth', we just update user.

            // To be safe, if we unlink, we might want to ensure status reflects that?
            // But 'status' is mostly for the initial load determining if we show "Link" page or "App".
            // Once in the app, status matters less, except for 'isLinked' computed property.

            // We need to make sure we clear loading state.
            // Using 'UPDATE_USER' doesn't clear loading if we used 'LINK_START' (which sets verifying).
            // Actually 'LINK_START' sets status='verifying'.
            // And 'UPDATE_USER' just updates user.
            // We need an action that sets status back to 'linked' or 'email_auth' OR just 'ready'?
            // Our reducer is a bit rigid.

            // Let's modify 'UPDATE_USER' or use 'LINK_SUCCESS'.
            // 'LINK_SUCCESS' sets status='linked'.
            // If we unlink, we probably don't want status='linked' if that implies "Logged in via LINE".
            // But if we use 'LINK_SUCCESS', it clears loading.

            // Let's use 'LINK_SUCCESS' for now as it updates user and clears error/loading.
            // Even if unlinked, we are "Authorized".
            // But 'isLinked' computed property checks for status==='linked' || status==='email_auth'.
            // If we use 'LINK_SUCCESS', status becomes 'linked'.
            // But 'isLinked' relies on that?
            // Actually 'isLinked' computed property is:
            // const isLinked = state.status === 'linked' || state.status === 'email_auth';

            // If I unlink, I am still authenticated.
            // So LINK_SUCCESS is fine for maintaining "authenticated" state, 
            // BUT the user object won't have lineUserId, so I can check that for UI.

            dispatch({ type: 'LINK_SUCCESS', payload: result.user });
            return true;
        } catch (err) {
            dispatch({
                type: 'ERROR',
                payload: err instanceof Error ? err.message : 'ไม่สามารถยกเลิกการเชื่อมต่อได้',
            });
            return false;
        }
    }, []);

    // Connect LINE account
    const connectLine = useCallback(async (): Promise<boolean> => {
        if (!state.idToken || !state.liffId) {
            // If missing token, we can't link.
            // In real app, we might trigger liff login here if needed.
            if (!liff.isLoggedIn()) {
                liff.login();
                return false;
            }
            // Retrieve token if not in state?
            const idToken = liff.getIDToken();
            if (!idToken) {
                dispatch({ type: 'ERROR', payload: 'ไม่พบข้อมูล LINE Token' });
                return false;
            }
            // We continue with this token
            try {
                dispatch({ type: 'LINK_START' });
                const user = await liffAuthService.linkLine(idToken, liff.id!);
                // Note: liff.id is the liffId if initialized. Or use state.liffId if available.
                // Better to use what we have or re-fetch.

                dispatch({ type: 'LINK_SUCCESS', payload: user });
                return true;
            } catch (err) {
                dispatch({
                    type: 'ERROR',
                    payload: err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อบัญชีได้',
                });
                return false;
            }
        }

        try {
            dispatch({ type: 'LINK_START' });
            const result = await liffAuthService.linkLine(state.idToken, state.liffId);
            dispatch({ type: 'LINK_SUCCESS', payload: result });
            return true;
        } catch (err) {
            dispatch({
                type: 'ERROR',
                payload: err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อบัญชีได้',
            });
            return false;
        }
    }, [state.idToken, state.liffId]);

    // Logout
    const logout = useCallback(async () => {
        clearTokens();
        clearStoredLiffId(); // Clear the stored LIFF ID for new session

        // Only logout from LIFF if user was authenticated via LINE (not email)
        if (!state.isEmailAuth && liff.isLoggedIn()) {
            liff.logout();
        }

        dispatch({ type: 'LOGOUT' });
    }, [state.isEmailAuth]);

    // Clear error
    const clearError = useCallback(() => {
        dispatch({ type: 'CLEAR_ERROR' });
    }, []);

    // Retry initialization
    const retry = useCallback(() => {
        initializingRef.current = false;
        initializeLiff();
    }, [initializeLiff]);

    // Computed values
    const isLoading = state.status === 'initializing' || state.status === 'verifying';
    const isLinked = state.status === 'linked' || state.status === 'email_auth';
    const needsLinking = state.status === 'not_linked';

    const value: LiffAuthContextValue = {
        ...state,
        linkWithEmployeeCode,
        linkWithCredentials,
        unlinkLine,
        connectLine,
        logout,
        clearError,
        retry,
        isLoading,
        isLinked,
        needsLinking,
    };

    return (
        <LiffAuthContext.Provider value={value}>
            {children}
        </LiffAuthContext.Provider>
    );
}

// ============================================================
// Hook
// ============================================================

export function useLiffAuth() {
    const context = useContext(LiffAuthContext);
    if (context === undefined) {
        throw new Error('useLiffAuth must be used within a LiffAuthProvider');
    }
    return context;
}

export default LiffAuthContext;

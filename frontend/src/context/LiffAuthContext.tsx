// LIFF Auth Context
// Manages LIFF authentication state and account linking flow
// Now also supports email-based authentication (without LINE)

import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import liff from '@line/liff';
import liffAuthService, { type LineProfile } from '../services/liff-auth.service';
import api, { clearTokens, getAccessToken } from '../services/api';
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
    | { type: 'EMAIL_AUTH_SUCCESS'; payload: AuthUser };

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
            // Check for existing JWT token first (email login users)
            // ============================================================
            const existingToken = getAccessToken();
            if (existingToken) {
                console.log('[LiffAuth] Found existing JWT token, verifying...');
                try {
                    // Try to get current user with existing token
                    const response = await api.get('/auth/me');
                    if (response.data?.success && response.data?.data) {
                        console.log('[LiffAuth] JWT token valid, using email auth mode');
                        dispatch({ type: 'EMAIL_AUTH_SUCCESS', payload: response.data.data });
                        return;
                    }
                } catch {
                    // Token invalid/expired, continue with LINE auth
                    console.log('[LiffAuth] JWT token invalid, clearing and continuing with LINE auth');
                    clearTokens();
                }
            }

            // ============================================================
            // No valid JWT token, proceed with LINE authentication
            // ============================================================
            const liffId = import.meta.env.VITE_LIFF_ID;
            console.log('[LiffAuth] Initializing LIFF with ID:', liffId);

            if (!liffId) {
                throw new Error('LIFF ID not configured');
            }

            // Initialize LIFF SDK
            await liff.init({ liffId });
            console.log('[LiffAuth] LIFF initialized');

            // Check if logged into LINE
            if (!liff.isLoggedIn()) {
                console.log('[LiffAuth] Not logged into LINE, redirecting to login...');
                dispatch({ type: 'NOT_LOGGED_IN' });
                liff.login();
                return;
            }

            // Get ID token
            const idToken = liff.getIDToken();
            console.log('[LiffAuth] ID Token retrieved:', idToken ? 'Yes' : 'No');

            if (!idToken) {
                throw new Error('ไม่สามารถดึงข้อมูลยืนยันตัวตนจาก LINE ได้');
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
        } finally {
            initializingRef.current = false;
        }
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

    // Logout
    const logout = useCallback(async () => {
        clearTokens();

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

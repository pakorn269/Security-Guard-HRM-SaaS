// LIFF Email Auth Context
// Manages authentication state for users who login via email (without LINE)

import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getAccessToken, clearTokens } from '../services/api';
import type { AuthUser } from '../types/auth';

// ============================================================
// Types
// ============================================================

export type LiffEmailAuthStatus =
    | 'initializing'     // Checking stored tokens
    | 'not_logged_in'    // No valid session
    | 'logged_in'        // User is authenticated
    | 'error';           // An error occurred

export interface LiffEmailAuthState {
    status: LiffEmailAuthStatus;
    user: AuthUser | null;
    error: string | null;
}

type LiffEmailAuthAction =
    | { type: 'INIT_START' }
    | { type: 'LOGIN_SUCCESS'; payload: AuthUser }
    | { type: 'NOT_LOGGED_IN' }
    | { type: 'ERROR'; payload: string }
    | { type: 'LOGOUT' }
    | { type: 'CLEAR_ERROR' };

// ============================================================
// Initial State
// ============================================================

const initialState: LiffEmailAuthState = {
    status: 'initializing',
    user: null,
    error: null,
};

// ============================================================
// Reducer
// ============================================================

function liffEmailAuthReducer(state: LiffEmailAuthState, action: LiffEmailAuthAction): LiffEmailAuthState {
    switch (action.type) {
        case 'INIT_START':
            return { ...state, status: 'initializing', error: null };

        case 'LOGIN_SUCCESS':
            return {
                ...state,
                status: 'logged_in',
                user: action.payload,
                error: null,
            };

        case 'NOT_LOGGED_IN':
            return { ...state, status: 'not_logged_in' };

        case 'ERROR':
            return { ...state, status: 'error', error: action.payload };

        case 'LOGOUT':
            return {
                ...initialState,
                status: 'not_logged_in',
            };

        case 'CLEAR_ERROR':
            return { ...state, error: null };

        default:
            return state;
    }
}

// ============================================================
// Context
// ============================================================

interface LiffEmailAuthContextValue extends LiffEmailAuthState {
    login: (user: AuthUser) => void;
    logout: () => void;
    clearError: () => void;
    isLoading: boolean;
    isLoggedIn: boolean;
}

const LiffEmailAuthContext = createContext<LiffEmailAuthContextValue | undefined>(undefined);

// ============================================================
// Provider
// ============================================================

interface LiffEmailAuthProviderProps {
    children: ReactNode;
}

export function LiffEmailAuthProvider({ children }: LiffEmailAuthProviderProps) {
    const [state, dispatch] = useReducer(liffEmailAuthReducer, initialState);

    // Check for existing session on mount
    useEffect(() => {
        const checkSession = async () => {
            dispatch({ type: 'INIT_START' });

            const token = getAccessToken();
            if (!token) {
                dispatch({ type: 'NOT_LOGGED_IN' });
                return;
            }

            // Token exists - try to verify it
            try {
                // For now, just mark as logged in if token exists
                // The API will return 401 if token is invalid
                dispatch({ type: 'NOT_LOGGED_IN' });
            } catch (err) {
                console.error('[LiffEmailAuth] Session check failed:', err);
                dispatch({ type: 'NOT_LOGGED_IN' });
            }
        };

        checkSession();
    }, []);

    // Login handler
    const login = useCallback((user: AuthUser) => {
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    }, []);

    // Logout handler
    const logout = useCallback(() => {
        clearTokens();
        dispatch({ type: 'LOGOUT' });
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        dispatch({ type: 'CLEAR_ERROR' });
    }, []);

    // Computed values
    const isLoading = state.status === 'initializing';
    const isLoggedIn = state.status === 'logged_in';

    const value: LiffEmailAuthContextValue = {
        ...state,
        login,
        logout,
        clearError,
        isLoading,
        isLoggedIn,
    };

    return (
        <LiffEmailAuthContext.Provider value={value}>
            {children}
        </LiffEmailAuthContext.Provider>
    );
}

// ============================================================
// Hook
// ============================================================

export function useLiffEmailAuth() {
    const context = useContext(LiffEmailAuthContext);
    if (context === undefined) {
        throw new Error('useLiffEmailAuth must be used within a LiffEmailAuthProvider');
    }
    return context;
}

export default LiffEmailAuthContext;

import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import authService from '../services/auth.service';
import { getAccessToken, clearTokens } from '../services/api';
import type { AuthUser, LoginCredentials, RegisterData, AuthState, PhoneLoginCredentials } from '../types/auth';

// Action types
type AuthAction =
    | { type: 'AUTH_START' }
    | { type: 'AUTH_SUCCESS'; payload: AuthUser }
    | { type: 'AUTH_FAILURE'; payload: string }
    | { type: 'AUTH_LOGOUT' }
    | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true, // Start with loading to check existing token
    error: null,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case 'AUTH_START':
            return { ...state, isLoading: true, error: null };
        case 'AUTH_SUCCESS':
            return {
                ...state,
                user: action.payload,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            };
        case 'AUTH_FAILURE':
            return {
                ...state,
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: action.payload,
            };
        case 'AUTH_LOGOUT':
            return {
                ...state,
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
            };
        case 'CLEAR_ERROR':
            return { ...state, error: null };
        default:
            return state;
    }
}

// Context interface
interface AuthContextValue extends AuthState {
    login: (credentials: LoginCredentials) => Promise<boolean>;
    phoneLogin: (credentials: PhoneLoginCredentials) => Promise<boolean>;
    register: (data: RegisterData) => Promise<boolean>;
    logout: () => Promise<void>;
    lineLogin: (idToken: string, liffId: string) => Promise<boolean>;
    clearError: () => void;
    checkAuth: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Provider component
interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [state, dispatch] = useReducer(authReducer, initialState);

    // Check existing token on mount
    const checkAuth = useCallback(async () => {
        const token = getAccessToken();
        if (token) {
            try {
                const user = await authService.getCurrentUser();
                dispatch({ type: 'AUTH_SUCCESS', payload: user });
            } catch {
                clearTokens();
                dispatch({ type: 'AUTH_LOGOUT' });
            }
        } else {
            dispatch({ type: 'AUTH_LOGOUT' });
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Login handler - returns true on success
    const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
        dispatch({ type: 'AUTH_START' });
        try {
            const response = await authService.login(credentials);
            dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
            return true;
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
            dispatch({ type: 'AUTH_FAILURE', payload: message });
            return false;
        }
    }, []);

    // Phone Login handler - returns true on success
    const phoneLogin = useCallback(async (credentials: PhoneLoginCredentials): Promise<boolean> => {
        dispatch({ type: 'AUTH_START' });
        try {
            const response = await authService.phoneLogin(credentials);
            dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
            return true;
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'Login failed';
            dispatch({ type: 'AUTH_FAILURE', payload: message });
            return false;
        }
    }, []);

    // Register handler - returns true on success
    const register = useCallback(async (data: RegisterData): Promise<boolean> => {
        dispatch({ type: 'AUTH_START' });
        try {
            const response = await authService.register(data);
            dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
            return true;
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'การลงทะเบียนล้มเหลว';
            dispatch({ type: 'AUTH_FAILURE', payload: message });
            return false;
        }
    }, []);

    // LINE Login handler - returns true on success
    const lineLogin = useCallback(async (idToken: string, liffId: string): Promise<boolean> => {
        dispatch({ type: 'AUTH_START' });
        try {
            const response = await authService.lineLogin(idToken, liffId);
            dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
            return true;
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'LINE login ล้มเหลว';
            dispatch({ type: 'AUTH_FAILURE', payload: message });
            return false;
        }
    }, []);

    // Logout handler
    const logout = useCallback(async () => {
        await authService.logout();
        dispatch({ type: 'AUTH_LOGOUT' });
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        dispatch({ type: 'CLEAR_ERROR' });
    }, []);

    const value: AuthContextValue = {
        ...state,
        login,
        phoneLogin,
        register,
        logout,
        lineLogin,
        clearError,
        checkAuth,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;

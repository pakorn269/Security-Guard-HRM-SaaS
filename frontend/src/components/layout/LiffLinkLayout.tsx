// LIFF Link Layout
// Wrapper for account linking pages - initializes LIFF without auto-redirecting to login
// This prevents the infinite login loop when users haven't linked their account yet

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import liff from '@line/liff';
import { Loader2, AlertCircle, RefreshCw, LogIn } from 'lucide-react';
import { getCurrentLiffId } from '../../hooks/useLiff';
import liffAuthService, { type LineProfile, type AutoLinkResult } from '../../services/liff-auth.service';
import { clearTokens, getAccessToken } from '../../services/api';
import type { AuthUser } from '../../types/auth';
import api from '../../services/api';

// ============================================================
// Types
// ============================================================

export type LiffLinkStatus =
    | 'initializing'     // LIFF SDK is initializing
    | 'not_logged_in'    // User not logged into LINE (needs manual login)
    | 'verifying'        // Verifying LINE token with backend
    | 'not_linked'       // LINE verified but not linked to user
    | 'linked'           // LINE verified and linked to user
    | 'error';           // An error occurred

export interface LiffLinkState {
    status: LiffLinkStatus;
    user: AuthUser | null;
    lineProfile: LineProfile | null;
    error: string | null;
    idToken: string | null;
    liffId: string | null;
}

interface LiffLinkContextValue extends LiffLinkState {
    // Methods
    loginWithLine: () => void;
    linkWithEmployeeCode: (employeeCode: string, phone: string, companySlug: string) => Promise<boolean>;
    autoLinkEmployee: (employeeCode: string, phone: string, companySlug?: string) => Promise<AutoLinkResult>;
    linkWithCredentials: (email: string, password: string) => Promise<boolean>;
    retry: () => void;
    clearError: () => void;

    // Computed
    isLoading: boolean;
    needsLinking: boolean;
    needsLogin: boolean;
}

const LiffLinkContext = createContext<LiffLinkContextValue | undefined>(undefined);

// ============================================================
// Hook
// ============================================================

export function useLiffLink() {
    const context = useContext(LiffLinkContext);
    if (context === undefined) {
        throw new Error('useLiffLink must be used within a LiffLinkProvider');
    }
    return context;
}

// ============================================================
// Provider
// ============================================================

interface LiffLinkProviderProps {
    children: ReactNode;
}

export function LiffLinkProvider({ children }: LiffLinkProviderProps) {
    const [state, setState] = useState<LiffLinkState>({
        status: 'initializing',
        user: null,
        lineProfile: null,
        error: null,
        idToken: null,
        liffId: null,
    });

    const initializeLiff = useCallback(async () => {
        try {
            setState(prev => ({ ...prev, status: 'initializing', error: null }));

            // Check for existing JWT token first
            const existingToken = getAccessToken();
            if (existingToken) {
                console.log('[LiffLink] Found existing JWT token, verifying...');
                try {
                    const response = await api.get('/auth/me');
                    if (response.data?.success && response.data?.data) {
                        console.log('[LiffLink] JWT token valid, user is already linked');
                        setState(prev => ({
                            ...prev,
                            status: 'linked',
                            user: response.data.data,
                        }));
                        return;
                    }
                } catch {
                    console.log('[LiffLink] JWT token invalid, clearing...');
                    clearTokens();
                }
            }

            // Check if LIFF SDK is already initialized (e.g., from LiffLayout navigation)
            let liffId = liff.id;
            const isAlreadyInitialized = !!liffId;

            if (!liffId) {
                liffId = getCurrentLiffId();
                console.log('[LiffLink] Initializing LIFF with ID:', liffId);

                if (!liffId) {
                    throw new Error('LIFF ID not configured');
                }

                await liff.init({ liffId });
                console.log('[LiffLink] LIFF initialized');
            } else {
                console.log('[LiffLink] LIFF already initialized with ID:', liffId);
            }

            // Check LIFF context for debugging
            const isInClient = liff.isInClient();
            const isLoggedIn = liff.isLoggedIn();
            console.log('[LiffLink] LIFF Context - isInClient:', isInClient, 'isLoggedIn:', isLoggedIn, 'wasAlreadyInitialized:', isAlreadyInitialized);

            // If we're in LINE client, the user is guaranteed to be logged in
            // even if isLoggedIn() returns false (can happen due to timing)
            if (isInClient) {
                console.log('[LiffLink] Running inside LINE client, proceeding as logged in');
                // In LINE client, we can always get the ID token
                const idToken = liff.getIDToken();
                if (idToken) {
                    console.log('[LiffLink] ID Token retrieved in LINE client');
                    setState(prev => ({
                        ...prev,
                        status: 'verifying',
                        idToken,
                        liffId,
                    }));

                    // Verify with backend
                    console.log('[LiffLink] Verifying with backend...');
                    const verifyResult = await liffAuthService.verifyLineToken(idToken, liffId);

                    if (verifyResult.isLinked) {
                        console.log('[LiffLink] User is linked:', verifyResult.user.id);
                        setState(prev => ({
                            ...prev,
                            status: 'linked',
                            user: verifyResult.user,
                        }));
                    } else {
                        console.log('[LiffLink] User not linked, LINE profile:', verifyResult.lineProfile.userId);
                        setState(prev => ({
                            ...prev,
                            status: 'not_linked',
                            lineProfile: verifyResult.lineProfile,
                        }));
                    }
                    return;
                }
            }

            // External browser: Check if logged into LINE
            if (!isLoggedIn) {
                console.log('[LiffLink] Not logged into LINE (external browser) - waiting for user action');
                setState(prev => ({
                    ...prev,
                    status: 'not_logged_in',
                    liffId,
                }));
                return; // Stop here - don't call liff.login() automatically
            }

            // User is logged in, get ID token
            const idToken = liff.getIDToken();
            console.log('[LiffLink] ID Token retrieved:', idToken ? 'Yes' : 'No');

            if (!idToken) {
                throw new Error('ไม่สามารถดึงข้อมูลยืนยันตัวตนจาก LINE ได้');
            }

            setState(prev => ({
                ...prev,
                status: 'verifying',
                idToken,
                liffId,
            }));

            // Verify with backend
            console.log('[LiffLink] Verifying with backend...');
            const verifyResult = await liffAuthService.verifyLineToken(idToken, liffId);

            if (verifyResult.isLinked) {
                console.log('[LiffLink] User is linked:', verifyResult.user.id);
                setState(prev => ({
                    ...prev,
                    status: 'linked',
                    user: verifyResult.user,
                }));
            } else {
                console.log('[LiffLink] User not linked, LINE profile:', verifyResult.lineProfile.userId);
                setState(prev => ({
                    ...prev,
                    status: 'not_linked',
                    lineProfile: verifyResult.lineProfile,
                }));
            }
        } catch (err) {
            console.error('[LiffLink] Error:', err);
            setState(prev => ({
                ...prev,
                status: 'error',
                error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
            }));
        }
    }, []);

    // Initialize on mount
    useEffect(() => {
        initializeLiff();
    }, [initializeLiff]);

    // Manual LINE login - user clicks a button
    const loginWithLine = useCallback(() => {
        console.log('[LiffLink] User initiated LINE login');
        liff.login();
    }, []);

    // Link with employee code
    const linkWithEmployeeCode = useCallback(async (
        employeeCode: string,
        phone: string,
        companySlug: string
    ): Promise<boolean> => {
        if (!state.idToken || !state.liffId) {
            setState(prev => ({ ...prev, error: 'ไม่พบข้อมูล LINE token' }));
            return false;
        }

        try {
            setState(prev => ({ ...prev, status: 'verifying', error: null }));

            const result = await liffAuthService.linkEmployee({
                idToken: state.idToken,
                liffId: state.liffId,
                employeeCode,
                phone,
                companySlug,
            });

            setState(prev => ({
                ...prev,
                status: 'linked',
                user: result.user,
            }));
            return true;
        } catch (err) {
            setState(prev => ({
                ...prev,
                status: 'not_linked',
                error: err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อบัญชีได้',
            }));
            return false;
        }
    }, [state.idToken, state.liffId]);

    // Auto-link with employee code + phone
    const autoLinkEmployee = useCallback(async (
        employeeCode: string,
        phone: string,
        companySlug?: string
    ): Promise<AutoLinkResult> => {
        if (!state.idToken || !state.liffId) {
            setState(prev => ({ ...prev, error: 'ไม่พบข้อมูล LINE token' }));
            return { success: false, message: 'ไม่พบข้อมูล LINE token' };
        }

        try {
            setState(prev => ({ ...prev, status: 'verifying', error: null }));

            const result = await liffAuthService.autoLinkEmployee({
                idToken: state.idToken,
                liffId: state.liffId,
                employeeCode,
                phone,
                companySlug,
            });

            if (result.success && result.data) {
                // Linked successfully
                setState(prev => ({
                    ...prev,
                    status: 'linked',
                    user: result.data!.user,
                }));
            } else {
                // Pending approval or require company slug or other cases
                // We return the result so the page can handle UI
                setState(prev => ({
                    ...prev,
                    status: 'not_linked',
                    error: null // Clear error as we handle it in UI
                }));
            }
            return result;
        } catch (err) {
            setState(prev => ({
                ...prev,
                status: 'not_linked',
                error: err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อบัญชีได้',
            }));
            return { success: false, message: err instanceof Error ? err.message : 'Unknown error' };
        }
    }, [state.idToken, state.liffId]);

    // Link with credentials
    const linkWithCredentials = useCallback(async (
        email: string,
        password: string
    ): Promise<boolean> => {
        if (!state.idToken || !state.liffId) {
            setState(prev => ({ ...prev, error: 'ไม่พบข้อมูล LINE token' }));
            return false;
        }

        try {
            setState(prev => ({ ...prev, status: 'verifying', error: null }));

            const result = await liffAuthService.linkCredentials({
                idToken: state.idToken,
                liffId: state.liffId,
                email,
                password,
            });

            setState(prev => ({
                ...prev,
                status: 'linked',
                user: result.user,
            }));
            return true;
        } catch (err) {
            setState(prev => ({
                ...prev,
                status: 'not_linked',
                error: err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อบัญชีได้',
            }));
            return false;
        }
    }, [state.idToken, state.liffId]);

    // Retry
    const retry = useCallback(() => {
        initializeLiff();
    }, [initializeLiff]);

    // Clear error
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    // Computed values
    const isLoading = state.status === 'initializing' || state.status === 'verifying';
    const needsLinking = state.status === 'not_linked';
    const needsLogin = state.status === 'not_logged_in';

    const value: LiffLinkContextValue = {
        ...state,
        loginWithLine,
        linkWithEmployeeCode,
        autoLinkEmployee,
        linkWithCredentials,
        retry,
        clearError,
        isLoading,
        needsLinking,
        needsLogin,
    };

    return (
        <LiffLinkContext.Provider value={value}>
            {children}
        </LiffLinkContext.Provider>
    );
}

// ============================================================
// Layout Component
// ============================================================

export default function LiffLinkLayout() {
    return (
        <LiffLinkProvider>
            <LiffLinkLayoutContent />
        </LiffLinkProvider>
    );
}

function LiffLinkLayoutContent() {
    const { status, error, retry, isLoading, needsLogin, loginWithLine } = useLiffLink();

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 safe-area-inset">
                <div className="flex flex-col items-center gap-4 p-6">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <Loader2 size={32} className="text-primary-500 animate-spin" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-neutral-600 dark:text-neutral-300 font-medium">
                            กำลังโหลด...
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                            กรุณารอสักครู่
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (status === 'error' && error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 safe-area-inset">
                <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-6 max-w-sm w-full border border-neutral-200 dark:border-neutral-800">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center">
                        <AlertCircle size={28} className="text-error-500" />
                    </div>
                    <div className="text-center mb-6">
                        <h1 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                            เกิดข้อผิดพลาด
                        </h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {error}
                        </p>
                    </div>
                    <button
                        onClick={retry}
                        className="w-full inline-flex items-center justify-center gap-2 h-12 px-4 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-medium rounded-md transition-colors touch-target"
                    >
                        <RefreshCw size={18} />
                        ลองใหม่อีกครั้ง
                    </button>
                </div>
            </div>
        );
    }

    // Not logged into LINE - show login button (instead of auto-redirect)
    if (needsLogin) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 safe-area-inset">
                <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-6 max-w-sm w-full border border-neutral-200 dark:border-neutral-800">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                        <LogIn size={28} className="text-success-500" />
                    </div>
                    <div className="text-center mb-6">
                        <h1 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                            เข้าสู่ระบบด้วย LINE
                        </h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            กรุณาเข้าสู่ระบบด้วยบัญชี LINE ของคุณเพื่อดำเนินการต่อ
                        </p>
                    </div>
                    <button
                        onClick={loginWithLine}
                        className="w-full inline-flex items-center justify-center gap-2 h-12 px-4 bg-[#06C755] hover:bg-[#05b34d] active:bg-[#049a42] text-white font-medium rounded-md transition-colors touch-target"
                    >
                        <LogIn size={18} />
                        เข้าสู่ระบบด้วย LINE
                    </button>
                </div>
            </div>
        );
    }

    // Render child routes via Outlet (the actual linking pages)
    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
            <Outlet />
        </div>
    );
}

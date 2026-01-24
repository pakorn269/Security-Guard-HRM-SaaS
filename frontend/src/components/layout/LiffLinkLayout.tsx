// LIFF Link Layout
// Wrapper for account linking pages - initializes LIFF without auto-redirecting to login
// This prevents the infinite login loop when users haven't linked their account yet

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
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

// Debug context to pass error details without polluting main context
interface LiffLinkDebugContextValue {
    debugError: string | null;
    debugLogs?: string[];
}
const LiffLinkDebugContext = createContext<LiffLinkDebugContextValue | undefined>(undefined);

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

const LIFF_INIT_KEY = 'liff_link_initialized';
const LIFF_PROFILE_KEY = 'liff_line_profile';

export function LiffLinkProvider({ children }: LiffLinkProviderProps) {
    const [state, setState] = useState<LiffLinkState>({
        status: 'initializing',
        user: null,
        lineProfile: null,
        error: null,
        idToken: null,
        liffId: null,
    });
    const [debugError, setDebugError] = useState<string | null>(null);
    const [debugLogs, setDebugLogs] = useState<string[]>([]); // Track initialization steps
    const hasInitializedRef = useRef(false); // Use ref for re-renders within same page load

    const addDebugLog = (message: string) => {
        const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
        setDebugLogs(prev => [...prev.slice(-10), `[${timestamp}] ${message}`]); // Keep last 10 logs
    };

    // Check if already initialized in this session (survives page reloads)
    const isSessionInitialized = () => {
        return sessionStorage.getItem(LIFF_INIT_KEY) === 'true';
    };

    const markSessionInitialized = () => {
        sessionStorage.setItem(LIFF_INIT_KEY, 'true');
    };

    // Store LINE profile to sessionStorage
    const saveLineProfile = (profile: LineProfile) => {
        sessionStorage.setItem(LIFF_PROFILE_KEY, JSON.stringify(profile));
    };

    // Retrieve LINE profile from sessionStorage
    const getStoredLineProfile = (): LineProfile | null => {
        const stored = sessionStorage.getItem(LIFF_PROFILE_KEY);
        if (!stored) return null;
        try {
            return JSON.parse(stored) as LineProfile;
        } catch {
            return null;
        }
    };

    // Clear LINE profile from sessionStorage
    const clearLineProfile = () => {
        sessionStorage.removeItem(LIFF_PROFILE_KEY);
    };

    const initializeLiff = useCallback(async () => {
        // Prevent multiple initializations using ref (same page) and sessionStorage (across reloads)
        if (hasInitializedRef.current || isSessionInitialized()) {
            console.log('[LiffLink] Already initialized this session, skipping');
            addDebugLog('Already initialized this session, skipping');

            // Still need to check if user is linked and update state
            const existingToken = getAccessToken();
            if (existingToken) {
                try {
                    const response = await api.get('/auth/me');
                    if (response.data?.success && response.data?.data) {
                        setState(prev => ({
                            ...prev,
                            status: 'linked',
                            user: response.data.data,
                        }));
                        return;
                    }
                } catch {
                    // Token invalid, continue to show linking page
                    clearTokens();
                }
            }

            // User not linked yet, show linking page
            // Try to restore LINE profile from sessionStorage
            const storedProfile = getStoredLineProfile();
            console.log('[LiffLink] Restoring from storage, storedProfile:', storedProfile);
            addDebugLog(`Stored profile: ${storedProfile ? storedProfile.displayName : 'null'}`);

            // If no stored profile, we need to re-fetch it from LINE
            // BUT only if we haven't already tried (prevent infinite loop)
            if (!storedProfile) {
                // Check if we already tried re-initializing (prevent loop)
                const hasTriedReinit = sessionStorage.getItem('liff_link_reinit_attempted');
                if (hasTriedReinit) {
                    console.log('[LiffLink] Already attempted re-init, showing not_linked with null profile');
                    addDebugLog('Re-init already attempted, using null profile');
                    setState(prev => ({
                        ...prev,
                        status: 'not_linked',
                        lineProfile: null,
                    }));
                    return;
                }

                console.log('[LiffLink] No stored profile, need to re-initialize to fetch profile');
                addDebugLog('No stored profile, re-initializing...');
                // Mark that we're attempting re-init to prevent loop
                sessionStorage.setItem('liff_link_reinit_attempted', 'true');
                // Clear the session flag so we can re-initialize
                sessionStorage.removeItem(LIFF_INIT_KEY);
                hasInitializedRef.current = false;
                // Don't return - fall through to full initialization
            } else {
                // Clear the re-init flag since we have a profile
                sessionStorage.removeItem('liff_link_reinit_attempted');
                setState(prev => ({
                    ...prev,
                    status: 'not_linked',
                    lineProfile: storedProfile,
                }));
                return;
            }
        }

        try {
            console.log('[LiffLink] Starting initialization...');
            addDebugLog('Starting initialization...');
            hasInitializedRef.current = true;
            // Don't mark session as initialized yet - wait until we have profile or user data
            setState(prev => ({ ...prev, status: 'initializing', error: null }));

            // Check for existing JWT token first
            const existingToken = getAccessToken();
            if (existingToken) {
                console.log('[LiffLink] Found existing JWT token, verifying...');
                addDebugLog('Found JWT token, verifying...');
                try {
                    const response = await api.get('/auth/me');
                    if (response.data?.success && response.data?.data) {
                        console.log('[LiffLink] JWT token valid, user is already linked');
                        addDebugLog('JWT valid - user linked!');
                        setState(prev => ({
                            ...prev,
                            status: 'linked',
                            user: response.data.data,
                        }));
                        return;
                    }
                } catch {
                    console.log('[LiffLink] JWT token invalid, clearing...');
                    addDebugLog('JWT invalid, clearing tokens');
                    clearTokens();
                }
            }

            // Check if LIFF SDK is already initialized (e.g., from LiffLayout navigation)
            let liffId = liff.id;
            const isAlreadyInitialized = !!liffId;

            if (!liffId) {
                liffId = getCurrentLiffId();
                console.log('[LiffLink] Initializing LIFF with ID:', liffId);
                addDebugLog(`Init LIFF ID: ${liffId}`);

                if (!liffId) {
                    throw new Error('LIFF ID not configured');
                }

                await liff.init({ liffId });
                console.log('[LiffLink] LIFF initialized');
                addDebugLog('LIFF SDK initialized');
            } else {
                console.log('[LiffLink] LIFF already initialized with ID:', liffId);
                addDebugLog(`LIFF already init: ${liffId}`);
            }

            // Check LIFF context for debugging
            const isInClient = liff.isInClient();
            const isLoggedIn = liff.isLoggedIn();
            console.log('[LiffLink] LIFF Context - isInClient:', isInClient, 'isLoggedIn:', isLoggedIn, 'wasAlreadyInitialized:', isAlreadyInitialized);
            addDebugLog(`isInClient:${isInClient} isLoggedIn:${isLoggedIn}`);

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
                        clearLineProfile(); // Clear stored profile when linked
                        sessionStorage.removeItem('liff_link_reinit_attempted'); // Clear re-init flag
                        markSessionInitialized(); // Mark as initialized now that we have user data
                        setState(prev => ({
                            ...prev,
                            status: 'linked',
                            user: verifyResult.user,
                        }));
                    } else {
                        console.log('[LiffLink] User not linked, LINE profile:', verifyResult.lineProfile.userId);
                        console.log('[LiffLink] Saving profile to sessionStorage:', verifyResult.lineProfile);
                        saveLineProfile(verifyResult.lineProfile); // Save to sessionStorage
                        sessionStorage.removeItem('liff_link_reinit_attempted'); // Clear re-init flag after successful profile save
                        markSessionInitialized(); // Mark as initialized now that we have profile
                        addDebugLog(`Saved profile: ${verifyResult.lineProfile.displayName}`);
                        setState(prev => ({
                            ...prev,
                            status: 'not_linked',
                            lineProfile: verifyResult.lineProfile,
                        }));
                    }
                    return;
                } else {
                    // ID token not available yet - this shouldn't happen in LINE client
                    // but if it does, show an error instead of falling through
                    console.error('[LiffLink] In LINE client but no ID token available');
                    throw new Error('ไม่สามารถดึงข้อมูลยืนยันตัวตนจาก LINE ได้');
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
                clearLineProfile(); // Clear stored profile when linked
                sessionStorage.removeItem('liff_link_reinit_attempted'); // Clear re-init flag
                markSessionInitialized(); // Mark as initialized now that we have user data
                setState(prev => ({
                    ...prev,
                    status: 'linked',
                    user: verifyResult.user,
                }));
            } else {
                console.log('[LiffLink] User not linked, LINE profile:', verifyResult.lineProfile.userId);
                saveLineProfile(verifyResult.lineProfile); // Save to sessionStorage
                sessionStorage.removeItem('liff_link_reinit_attempted'); // Clear re-init flag
                markSessionInitialized(); // Mark as initialized now that we have profile
                setState(prev => ({
                    ...prev,
                    status: 'not_linked',
                    lineProfile: verifyResult.lineProfile,
                }));
            }
        } catch (err) {
            console.error('[LiffLink] Error:', err);
            const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
            const errorDetails = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack || ''}` : JSON.stringify(err);
            setDebugError(errorDetails);
            setState(prev => ({
                ...prev,
                status: 'error',
                error: errorMessage,
            }));
        }
    }, []); // Empty deps - only initialize once

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
            // Clear error but don't change status (would unmount child page)
            setState(prev => ({ ...prev, error: null }));

            const result = await liffAuthService.linkEmployee({
                idToken: state.idToken,
                liffId: state.liffId,
                employeeCode,
                phone,
                companySlug,
            });

            clearLineProfile(); // Clear stored profile after successful linking
            setState(prev => ({
                ...prev,
                status: 'linked',
                user: result.user,
            }));
            return true;
        } catch (err) {
            setState(prev => ({
                ...prev,
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
            // Clear any previous error, but DON'T change status to 'verifying'
            // because that would cause isLoading=true and unmount the child page
            setState(prev => ({ ...prev, error: null }));

            const result = await liffAuthService.autoLinkEmployee({
                idToken: state.idToken,
                liffId: state.liffId,
                employeeCode,
                phone,
                companySlug,
            });

            if (result.success && result.data) {
                // Linked successfully
                clearLineProfile(); // Clear stored profile after successful linking
                setState(prev => ({
                    ...prev,
                    status: 'linked',
                    user: result.data!.user,
                }));
            }
            // For other cases (pendingApproval, requireCompanySlug, etc.)
            // we just return the result and let the child page handle the UI
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อบัญชีได้';
            setState(prev => ({
                ...prev,
                error: errorMessage,
            }));
            return { success: false, message: errorMessage };
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
            // Clear error but don't change status (would unmount child page)
            setState(prev => ({ ...prev, error: null }));

            const result = await liffAuthService.linkCredentials({
                idToken: state.idToken,
                liffId: state.liffId,
                email,
                password,
            });

            clearLineProfile(); // Clear stored profile after successful linking
            setState(prev => ({
                ...prev,
                status: 'linked',
                user: result.user,
            }));
            return true;
        } catch (err) {
            setState(prev => ({
                ...prev,
                error: err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อบัญชีได้',
            }));
            return false;
        }
    }, [state.idToken, state.liffId]);

    // Retry - reset the initialization flags to allow re-initialization
    const retry = useCallback(() => {
        console.log('[LiffLink] Retry requested, resetting initialization flags');
        hasInitializedRef.current = false;
        sessionStorage.removeItem(LIFF_INIT_KEY);
        sessionStorage.removeItem('liff_link_reinit_attempted'); // Clear re-init flag on retry
        clearLineProfile(); // Also clear stored profile on retry
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
            <LiffLinkDebugContext.Provider value={{ debugError: debugError, debugLogs }}>
                {children}
            </LiffLinkDebugContext.Provider>
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
    const debugContext = useContext(LiffLinkDebugContext);

    // If already linked, redirect to clock page
    // This handles the case where a linked user navigates directly to /liff/link
    useEffect(() => {
        if (status === 'linked') {
            console.log('[LiffLink] User already linked, redirecting to clock page');
            // Use window.location.replace for cleaner redirect in LIFF context
            // React Router's navigate can sometimes cause issues in LINE's webview
            window.location.replace('/liff/clock');
        }
    }, [status]);

    // Show redirecting message while navigating
    if (status === 'linked') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 safe-area-inset">
                <div className="flex flex-col items-center gap-4 p-6">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                            <Loader2 size={32} className="text-success-500 animate-spin" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-neutral-600 dark:text-neutral-300 font-medium">
                            บัญชีเชื่อมต่อแล้ว
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                            กำลังเปลี่ยนเส้นทาง...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 safe-area-inset p-4">
                <div className="flex flex-col items-center gap-4 w-full max-w-md">
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
                    {/* Debug logs */}
                    {debugContext?.debugLogs && debugContext.debugLogs.length > 0 && (
                        <div className="w-full mt-4 p-3 bg-neutral-100 dark:bg-neutral-800 rounded text-left max-h-48 overflow-y-auto">
                            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Debug Logs:</p>
                            {debugContext.debugLogs.map((log, i) => (
                                <p key={i} className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                                    {log}
                                </p>
                            ))}
                        </div>
                    )}
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
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                            {error}
                        </p>
                        {/* Debug info */}
                        <div className="mt-4 p-3 bg-neutral-100 dark:bg-neutral-800 rounded text-left max-h-48 overflow-y-auto">
                            <p className="text-xs font-mono text-neutral-600 dark:text-neutral-400 break-all">
                                <strong>LIFF ID:</strong> {import.meta.env.VITE_LIFF_LINK_ID || 'not set'}
                            </p>
                            <p className="text-xs font-mono text-neutral-600 dark:text-neutral-400 mt-1">
                                <strong>Status:</strong> {status}
                            </p>
                            <p className="text-xs font-mono text-neutral-600 dark:text-neutral-400 mt-1">
                                <strong>Path:</strong> {window.location.pathname}
                            </p>
                            {debugContext?.debugError && (
                                <p className="text-xs font-mono text-error-600 dark:text-error-400 mt-2 whitespace-pre-wrap">
                                    <strong>Error Details:</strong><br />
                                    {debugContext.debugError}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <button
                            onClick={retry}
                            className="w-full inline-flex items-center justify-center gap-2 h-12 px-4 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-medium rounded-md transition-colors touch-target"
                        >
                            <RefreshCw size={18} />
                            ลองใหม่อีกครั้ง
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/line/verify`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ idToken: 'test', liffId: 'test' })
                                    });
                                    const data = await response.json();
                                    alert(`Backend Response: ${JSON.stringify(data)}`);
                                } catch (err) {
                                    alert(`Fetch Error: ${err instanceof Error ? err.message : String(err)}`);
                                }
                            }}
                            className="w-full text-xs h-10 px-3 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-medium rounded-md transition-colors"
                        >
                            Test Backend Connection
                        </button>
                    </div>
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


import { useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAccessToken } from '../../services/api';

interface LiffProtectedRouteProps {
  children: ReactNode;
}

/**
 * LIFF Protected Route Component
 *
 * Protects LIFF routes by enforcing:
 * 1. User is authenticated (via AuthContext OR going through LIFF linking flow)
 * 2. User has 'guard' role (guards use LIFF exclusively)
 *
 * Non-guard users are redirected to web dashboard.
 * Unauthenticated users are redirected to LIFF linking page.
 *
 * IMPORTANT: Linking pages (/liff/link/*) are exempt from AuthContext checks
 * because users going through LIFF linking flow are authenticated via LiffAuthContext
 * (LINE login) but haven't yet received JWT tokens stored in AuthContext.
 * The LiffLayout/LiffAuthContext handles the complete linking flow internally.
 *
 * Note: LINE client check has been removed to allow browser access.
 */
export function LiffProtectedRoute({ children }: LiffProtectedRouteProps) {
  const { isAuthenticated: isAuthAuthenticated, isLoading: authLoading, user, checkAuth } = useAuth();
  const location = useLocation();
  const [isRechecking, setIsRechecking] = useState(() => {
    // Initialize to true if token exists but auth not confirmed yet
    // This prevents redirect before we've had a chance to verify the token
    const token = getAccessToken();
    return !!token && !authLoading;
  });
  const hasRecheckedRef = useRef(false);

  // Check if we need to re-verify auth (token exists but not authenticated)
  // This handles navigation from /liff/link where tokens were just stored
  // Also handles page reloads or direct navigation when tokens exist
  useEffect(() => {
    const token = getAccessToken();
    // If there's a token but AuthContext says not authenticated (and not loading), re-check
    if (token && !isAuthAuthenticated && !authLoading && !hasRecheckedRef.current) {
      console.log('[LiffProtectedRoute] Token exists but not authenticated, re-checking auth...');
      hasRecheckedRef.current = true;
      setIsRechecking(true);
      checkAuth().finally(() => {
        setIsRechecking(false);
      });
    } else if (!token && isRechecking) {
      // No token, stop rechecking
      setIsRechecking(false);
    } else if (isAuthAuthenticated && isRechecking) {
      // Auth confirmed, stop rechecking
      setIsRechecking(false);
    }
  }, [isAuthAuthenticated, authLoading, checkAuth, isRechecking]);

  // Check if we're on any linking page - these bypass AuthContext checks
  // because the linking flow is managed by LiffAuthContext inside LiffLayout
  const isLinkingPage = location.pathname.startsWith('/liff/link');

  // For linking pages, skip AuthContext loading/auth checks entirely
  // LiffLayout will handle authentication via LiffAuthContext
  if (isLinkingPage) {
    return <>{children}</>;
  }

  // Show loading while checking auth status (only for non-linking pages)
  // Also show loading if we're re-checking auth after tokens were stored
  if (authLoading || isRechecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-surface-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 spinner" />
          <p className="text-surface-500 animate-pulse">กำลังตรวจสอบ...</p>
        </div>
      </div>
    );
  }

  // Check authentication (only for non-linking pages)
  if (!isAuthAuthenticated) {
    // Redirect to LIFF account linking page
    console.log('[LiffProtectedRoute] Not authenticated, redirecting to link page from', location.pathname);
    return <Navigate to="/liff/link" state={{ from: location }} replace />;
  }

  // Check if user is guard (guards use LIFF exclusively)
  if (user && user.role !== 'guard') {
    // Non-guard users should use web dashboard, not LIFF
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-surface-950 p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-surface-800 dark:text-white mb-2">
            เข้าสู่ระบบผิดช่องทาง
          </h1>
          <p className="text-surface-600 dark:text-surface-400 mb-4">
            บัญชีของคุณควรใช้งานผ่านเว็บไซต์
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            ไปยังหน้าเว็บไซต์
          </a>
        </div>
      </div>
    );
  }

  // All checks passed - render protected content
  return <>{children}</>;
}

export default LiffProtectedRoute;



import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface LiffProtectedRouteProps {
  children: ReactNode;
}

/**
 * LIFF Protected Route Component
 *
 * Protects LIFF routes by enforcing:
 * 1. User is authenticated
 * 2. User has 'guard' role (guards use LIFF exclusively)
 *
 * Non-guard users are redirected to web dashboard.
 * Unauthenticated users are redirected to LIFF linking page.
 *
 * Note: LINE client check has been removed to allow browser access.
 */
export function LiffProtectedRoute({ children }: LiffProtectedRouteProps) {
  const { isAuthenticated: isAuthAuthenticated, isLoading: authLoading, user } = useAuth();
  const location = useLocation();

  const isLinkingPage = location.pathname.startsWith('/liff/link');

  // Show loading while checking auth status
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-surface-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 spinner" />
          <p className="text-surface-500 animate-pulse">กำลังตรวจสอบ...</p>
        </div>
      </div>
    );
  }

  // Check authentication
  // Use isAuthAuthenticated directly from useAuth context
  if (!isAuthAuthenticated && !isLinkingPage) {
    // Redirect to LIFF account linking page
    console.log('[LiffProtectedRoute] Not authenticated, redirecting to link page from', location.pathname);
    return <Navigate to="/liff/link" state={{ from: location }} replace />;
  }

  // Check if user is guard (guards use LIFF exclusively)
  // Skip this check if on linking page (since role might be unknown or irrelevant during linking flow)
  if (isAuthAuthenticated && user && user.role !== 'guard' && !isLinkingPage) {
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


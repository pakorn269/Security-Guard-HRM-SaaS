import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLiff } from '../../hooks/useLiff';

interface LiffProtectedRouteProps {
  children: ReactNode;
}

/**
 * LIFF Protected Route Component
 *
 * Protects routes that should only be accessible from LINE LIFF.
 * Enforces that:
 * 1. User is running in LIFF client (LINE app)
 * 2. User is authenticated
 * 3. User has 'guard' role (guards use LIFF exclusively)
 *
 * Non-guard users are redirected to web dashboard.
 * Unauthenticated users are redirected to LIFF linking page.
 * Non-LIFF access is redirected to login select page.
 */
export function LiffProtectedRoute({ children }: LiffProtectedRouteProps) {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { isInClient, isReady: liffReady, error: liffError } = useLiff();
  const location = useLocation();

  // Show loading while checking both auth and LIFF status
  if (authLoading || !liffReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-surface-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 spinner" />
          <p className="text-surface-500 animate-pulse">กำลังตรวจสอบ...</p>
        </div>
      </div>
    );
  }

  // Check if LIFF initialization failed
  if (liffError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-surface-950 p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            LIFF Error
          </h1>
          <p className="text-surface-700 dark:text-surface-300 mb-2">
            {liffError.message}
          </p>
          <p className="text-surface-500 text-sm">
            กรุณาเปิดผ่าน LINE เท่านั้น
          </p>
        </div>
      </div>
    );
  }

  // Check if running in LIFF context
  if (!isInClient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-surface-950 p-4">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg
              className="w-20 h-20 mx-auto text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-surface-800 dark:text-white mb-2">
            กรุณาเปิดผ่าน LINE
          </h1>
          <p className="text-surface-600 dark:text-surface-400 mb-4">
            หน้านี้สามารถเข้าถึงได้เฉพาะผ่าน LINE LIFF เท่านั้น
          </p>
          <p className="text-sm text-surface-500">
            Please open this page through LINE app only.
          </p>
        </div>
      </div>
    );
  }

  // Check authentication
  if (!isAuthenticated) {
    // Redirect to LIFF account linking page
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

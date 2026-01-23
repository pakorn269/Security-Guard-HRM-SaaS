import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface NonLiffProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Array<'super_admin' | 'company_admin' | 'manager' | 'guard'>;
}

/**
 * Non-LIFF Protected Route Component
 *
 * Protects web-only routes (admin/manager dashboard).
 * Enforces that:
 * 1. User is authenticated
 * 2. User is NOT a guard (guards must use LIFF exclusively)
 * 3. User has required role (optional)
 *
 * Guards are blocked with a clear error message.
 * Unauthenticated users are redirected to login.
 */
export function NonLiffProtectedRoute({ children, allowedRoles }: NonLiffProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-surface-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 spinner" />
          <p className="text-surface-500 animate-pulse">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Block guards from accessing web routes
  if (user?.role === 'guard') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-surface-950 p-4">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg
              className="w-20 h-20 mx-auto text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-surface-800 dark:text-white mb-2">
            ไม่อนุญาตให้เข้าถึง
          </h1>
          <p className="text-surface-600 dark:text-surface-400 mb-2">
            พนักงานรักษาความปลอดภัยต้องใช้งานผ่าน LINE เท่านั้น
          </p>
          <p className="text-sm text-surface-500 mb-6">
            Guard users must access the system via LINE LIFF only.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              กรุณาเปิดแอป LINE และใช้งานผ่านลิงก์ที่ได้รับจากบริษัท
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check role-based access
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-surface-950 p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-surface-800 dark:text-white mb-2">
            ไม่มีสิทธิ์เข้าถึง
          </h1>
          <p className="text-surface-600 dark:text-surface-400">
            คุณไม่มีสิทธิ์เข้าถึงหน้านี้
          </p>
          <p className="text-sm text-surface-500 mt-2">
            Access denied. Insufficient permissions.
          </p>
        </div>
      </div>
    );
  }

  // All checks passed - render protected content
  return <>{children}</>;
}

export default NonLiffProtectedRoute;

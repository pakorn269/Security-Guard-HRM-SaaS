import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
    children: ReactNode;
    allowedRoles?: Array<'super_admin' | 'company_admin' | 'manager' | 'guard'>;
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
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

    // Check role-based access
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // If a guard tries to access a non-allowed page (likely dashboard), redirect to LIFF
        if (user.role === 'guard') {
            return <Navigate to="/liff/clock" replace />;
        }

        return (
            <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-surface-950">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-surface-800 dark:text-white mb-2">
                        ไม่มีสิทธิ์เข้าถึง
                    </h1>
                    <p className="text-surface-500">
                        คุณไม่มีสิทธิ์เข้าถึงหน้านี้
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

export default ProtectedRoute;

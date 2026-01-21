import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from './components/common';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));

// Sprint 2: Employee pages
const EmployeesPage = lazy(() => import('./pages/employees/EmployeesPage'));
const EmployeeDetailPage = lazy(() => import('./pages/employees/EmployeeDetailPage'));

// Sprint 3: Shift Scheduling pages
const SchedulePage = lazy(() => import('./pages/shifts/SchedulePage'));
const ShiftTemplatesPage = lazy(() => import('./pages/shifts/ShiftTemplatesPage'));

// Sprint 4: Attendance pages
const AttendancePage = lazy(() => import('./pages/attendance/AttendancePage'));

// Sprint 5: Leave Management pages
const LeavePage = lazy(() => import('./pages/leave/LeavePage'));
const LeaveBalancesPage = lazy(() => import('./pages/leave/LeaveBalancesPage'));
const LeaveTypesPage = lazy(() => import('./pages/leave/LeaveTypesPage'));

// Sprint 6: Reports & Settings pages
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const SitesPage = lazy(() => import('./pages/sites/SitesPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));

// Layouts
const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'));
const LiffLayout = lazy(() => import('./components/layout/LiffLayout'));

// LIFF pages
const LiffSchedulePage = lazy(() => import('./pages/liff/LiffSchedulePage'));
const LiffClockPage = lazy(() => import('./pages/liff/LiffClockPage'));
const LiffLeavePage = lazy(() => import('./pages/liff/LiffLeavePage'));
const LiffProfilePage = lazy(() => import('./pages/liff/LiffProfilePage'));

// LIFF Account Linking pages
const LiffLinkPage = lazy(() => import('./pages/liff/LiffLinkPage'));
const LiffLinkEmployeePage = lazy(() => import('./pages/liff/LiffLinkEmployeePage'));
const LiffLinkCredentialsPage = lazy(() => import('./pages/liff/LiffLinkCredentialsPage'));

// Loading component
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-surface-950">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 spinner" />
            <p className="text-surface-500 animate-pulse">Loading...</p>
        </div>
    </div>
);

// Wrap lazy components with Suspense
const withSuspense = (Component: React.LazyExoticComponent<React.ComponentType>) => (
    <Suspense fallback={<PageLoader />}>
        <Component />
    </Suspense>
);

const routes: RouteObject[] = [
    // Public routes
    {
        path: '/login',
        element: withSuspense(LoginPage),
        errorElement: <ErrorBoundary />,
    },
    {
        path: '/register',
        element: withSuspense(RegisterPage),
        errorElement: <ErrorBoundary />,
    },

    // Dashboard routes (admin/manager)
    {
        path: '/',
        element: (
            <ProtectedRoute>
                {withSuspense(DashboardLayout)}
            </ProtectedRoute>
        ),
        errorElement: <ErrorBoundary />,
        children: [
            {
                index: true,
                element: withSuspense(DashboardPage),
            },
            // Sprint 2: Employee Management
            {
                path: 'employees',
                element: withSuspense(EmployeesPage),
            },
            {
                path: 'employees/:id',
                element: withSuspense(EmployeeDetailPage),
            },
            // Sprint 3: Shift Scheduling
            {
                path: 'schedule',
                element: withSuspense(SchedulePage),
            },
            {
                path: 'shift-templates',
                element: withSuspense(ShiftTemplatesPage),
            },
            // Sprint 4: Attendance
            {
                path: 'attendance',
                element: withSuspense(AttendancePage),
            },
            // Sprint 5: Leave Management
            {
                path: 'leave',
                element: withSuspense(LeavePage),
            },
            {
                path: 'leave-balances',
                element: withSuspense(LeaveBalancesPage),
            },
            {
                path: 'leave-types',
                element: withSuspense(LeaveTypesPage),
            },
            // Sprint 6: Reports & Settings
            {
                path: 'reports',
                element: withSuspense(ReportsPage),
            },
            {
                path: 'sites',
                element: withSuspense(SitesPage),
            },
            {
                path: 'settings',
                element: withSuspense(SettingsPage),
            },
        ],
    },

    // LIFF routes (guard)
    {
        path: '/liff',
        element: withSuspense(LiffLayout),
        errorElement: <ErrorBoundary />,
        children: [
            {
                path: 'schedule',
                element: withSuspense(LiffSchedulePage),
            },
            {
                path: 'clock',
                element: withSuspense(LiffClockPage),
            },
            {
                path: 'leave',
                element: withSuspense(LiffLeavePage),
            },
            {
                path: 'profile',
                element: withSuspense(LiffProfilePage),
            },
            // Account Linking pages
            {
                path: 'link',
                element: withSuspense(LiffLinkPage),
            },
            {
                path: 'link/employee',
                element: withSuspense(LiffLinkEmployeePage),
            },
            {
                path: 'link/credentials',
                element: withSuspense(LiffLinkCredentialsPage),
            },
        ],
    },
];

export const router = createBrowserRouter(routes);

export default router;

import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from './components/common';
import { LiffProtectedRoute } from './components/auth/LiffProtectedRoute';
import { NonLiffProtectedRoute } from './components/auth/NonLiffProtectedRoute';

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
const LiffLinkLayout = lazy(() => import('./components/layout/LiffLinkLayout'));

// LIFF pages
const LiffSchedulePage = lazy(() => import('./pages/liff/LiffSchedulePage'));
const LiffClockPage = lazy(() => import('./pages/liff/LiffClockPage'));
const LiffLeavePage = lazy(() => import('./pages/liff/LiffLeavePage'));
const LiffProfilePage = lazy(() => import('./pages/liff/LiffProfilePage'));

// LIFF Account Linking pages
const LiffLinkPage = lazy(() => import('./pages/liff/LiffLinkPage'));
const LiffLinkEmployeePage = lazy(() => import('./pages/liff/LiffLinkEmployeePage'));
const LiffLinkCredentialsPage = lazy(() => import('./pages/liff/LiffLinkCredentialsPage'));

// LIFF Email Login pages (for guards without LINE)
const LiffLoginSelectPage = lazy(() => import('./pages/liff/LiffLoginSelectPage'));
const LiffEmailLoginPage = lazy(() => import('./pages/liff/LiffEmailLoginPage'));

// Company URL Login pages
const CompanyLoginPage = lazy(() => import('./pages/liff/CompanyLoginPage'));
const SetPinPage = lazy(() => import('./pages/liff/SetPinPage'));
const ForgotPinPage = lazy(() => import('./pages/liff/ForgotPinPage'));

// Debug page
const DebugEnvPage = lazy(() => import('./pages/debug/DebugEnvPage'));

// Loading component
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-surface-950">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 spinner" />
            <p className="text-surface-500 dark:text-surface-400 animate-pulse">Loading...</p>
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

    // Dashboard routes (admin/manager) - Non-LIFF only (blocks guards)
    {
        path: '/',
        element: (
            <NonLiffProtectedRoute>
                {withSuspense(DashboardLayout)}
            </NonLiffProtectedRoute>
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
                path: 'settings/:tab?',
                element: withSuspense(SettingsPage),
            },
        ],
    },

    // LIFF routes (guard only) - Must be in LIFF context
    {
        path: '/liff',
        element: (
            <LiffProtectedRoute>
                {withSuspense(LiffLayout)}
            </LiffProtectedRoute>
        ),
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
            // PIN Management
            {
                path: 'change-pin',
                element: withSuspense(SetPinPage),
            },
        ],
    },

    // LIFF Account Linking routes (outside LiffLayout to prevent auto-redirect loop)
    // These pages handle LIFF initialization manually with user-controlled flow
    {
        path: '/liff/link',
        element: (
            <Suspense fallback={<PageLoader />}>
                <LiffLinkLayout>
                    <LiffLinkPage />
                </LiffLinkLayout>
            </Suspense>
        ),
        errorElement: <ErrorBoundary />,
    },
    {
        path: '/liff/link/employee',
        element: (
            <Suspense fallback={<PageLoader />}>
                <LiffLinkLayout>
                    <LiffLinkEmployeePage />
                </LiffLinkLayout>
            </Suspense>
        ),
        errorElement: <ErrorBoundary />,
    },
    {
        path: '/liff/link/credentials',
        element: (
            <Suspense fallback={<PageLoader />}>
                <LiffLinkLayout>
                    <LiffLinkCredentialsPage />
                </LiffLinkLayout>
            </Suspense>
        ),
        errorElement: <ErrorBoundary />,
    },

    // LIFF Email Login routes (outside LiffLayout to bypass LINE auth)
    {
        path: '/liff/login-select',
        element: withSuspense(LiffLoginSelectPage),
        errorElement: <ErrorBoundary />,
    },
    {
        path: '/liff/email-login',
        element: withSuspense(LiffEmailLoginPage),
        errorElement: <ErrorBoundary />,
    },

    // Company URL Login routes
    {
        path: '/liff/:companySlug/login',
        element: withSuspense(CompanyLoginPage),
        errorElement: <ErrorBoundary />,
    },
    {
        path: '/liff/:companySlug/set-pin',
        element: withSuspense(SetPinPage),
        errorElement: <ErrorBoundary />,
    },
    {
        path: '/liff/:companySlug/forgot-pin',
        element: withSuspense(ForgotPinPage),
        errorElement: <ErrorBoundary />,
    },

    // Debug route (non-production only)
    {
        path: '/debug/env',
        element: withSuspense(DebugEnvPage),
        errorElement: <ErrorBoundary />,
    },
];

export const router = createBrowserRouter(routes);

export default router;


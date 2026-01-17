import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));

// Layouts
const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'));
const LiffLayout = lazy(() => import('./components/layout/LiffLayout'));

// LIFF pages
const LiffSchedulePage = lazy(() => import('./pages/liff/LiffSchedulePage'));
const LiffClockPage = lazy(() => import('./pages/liff/LiffClockPage'));
const LiffLeavePage = lazy(() => import('./pages/liff/LiffLeavePage'));
const LiffProfilePage = lazy(() => import('./pages/liff/LiffProfilePage'));

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
    },

    // Dashboard routes (admin/manager)
    {
        path: '/',
        element: withSuspense(DashboardLayout),
        children: [
            {
                index: true,
                element: withSuspense(DashboardPage),
            },
            // TODO: Add more dashboard routes in Sprint 2+
            // { path: 'employees', element: withSuspense(EmployeesPage) },
            // { path: 'employees/:id', element: withSuspense(EmployeeDetailPage) },
            // { path: 'schedule', element: withSuspense(SchedulePage) },
            // { path: 'attendance', element: withSuspense(AttendancePage) },
            // { path: 'leave', element: withSuspense(LeavePage) },
            // { path: 'reports', element: withSuspense(ReportsPage) },
            // { path: 'settings', element: withSuspense(SettingsPage) },
        ],
    },

    // LIFF routes (guard)
    {
        path: '/liff',
        element: withSuspense(LiffLayout),
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
        ],
    },
];

export const router = createBrowserRouter(routes);

export default router;

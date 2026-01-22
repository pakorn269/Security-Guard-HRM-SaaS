// LIFF Email Layout
// Layout for LIFF pages accessed via email login (no LINE required)

import { Outlet, Navigate, NavLink, useLocation } from 'react-router-dom';
import { Loader2, Clock, Calendar, Palmtree, User, type LucideIcon } from 'lucide-react';
import { getAccessToken } from '../../services/api';
import { useState, useEffect } from 'react';

// LIFF Bottom Navigation Items
interface LiffNavItem {
    path: string;
    label: string;
    icon: LucideIcon;
}

const liffNavItems: LiffNavItem[] = [
    { path: '/liff-email/clock', label: 'ลงเวลา', icon: Clock },
    { path: '/liff-email/schedule', label: 'ตารางเวร', icon: Calendar },
    { path: '/liff-email/leave', label: 'ลา', icon: Palmtree },
    { path: '/liff-email/profile', label: 'โปรไฟล์', icon: User },
];

// LIFF Bottom Navigation Component
function LiffBottomNav() {
    return (
        <nav
            className="
                fixed bottom-0 left-0 right-0 z-40
                bg-white dark:bg-neutral-900
                border-t border-neutral-200 dark:border-neutral-800
                safe-area-bottom
            "
        >
            <div className="flex items-center justify-around h-14">
                {liffNavItems.map((item) => (
                    <LiffNavItem key={item.path} item={item} />
                ))}
            </div>
        </nav>
    );
}

// LIFF Navigation Item
function LiffNavItem({ item }: { item: LiffNavItem }) {
    const Icon = item.icon;

    return (
        <NavLink
            to={item.path}
            className={({ isActive }) =>
                `
                    flex flex-col items-center justify-center
                    min-w-[64px] h-full px-2
                    transition-colors touch-target
                    ${isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-neutral-500 dark:text-neutral-400'
                }
                `
            }
        >
            {({ isActive }) => (
                <>
                    <Icon
                        size={22}
                        className={isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}
                        aria-hidden="true"
                    />
                    <span className="mt-0.5 text-[10px] font-medium truncate max-w-full">
                        {item.label}
                    </span>
                </>
            )}
        </NavLink>
    );
}

/**
 * LIFF Email Layout
 * 
 * Similar to LiffLayout but without LINE authentication
 * Uses JWT tokens from email login instead
 */
export default function LiffEmailLayout() {
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // Check if user has a valid token
        const token = getAccessToken();
        setIsAuthenticated(!!token);
        setIsLoading(false);
    }, []);

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

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/liff/login-select" replace />;
    }

    // Check if on a login-related page
    const isLoginPage = location.pathname.includes('/login');

    // Main layout
    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 no-overscroll">
            {/* Main content with safe area padding */}
            <div className={`safe-area-inset min-h-screen flex flex-col ${!isLoginPage ? 'pb-14' : ''}`}>
                <Outlet />
            </div>

            {/* Bottom navigation for authenticated users */}
            {!isLoginPage && <LiffBottomNav />}
        </div>
    );
}

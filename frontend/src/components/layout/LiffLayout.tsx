import { Outlet, useLocation, Navigate, NavLink } from 'react-router-dom';
import { AlertCircle, RefreshCw, Loader2, Clock, Calendar, Palmtree, User, type LucideIcon } from 'lucide-react';
import { LiffAuthProvider, useLiffAuth } from '../../context/LiffAuthContext';

// LIFF Bottom Navigation Items
interface LiffNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

const liffNavItems: LiffNavItem[] = [
  { path: '/liff/clock', label: 'ลงเวลา', icon: Clock },
  { path: '/liff/schedule', label: 'ตารางเวร', icon: Calendar },
  { path: '/liff/leave', label: 'ลา', icon: Palmtree },
  { path: '/liff/profile', label: 'โปรไฟล์', icon: User },
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
 * LIFF Layout (Mobile)
 *
 * Specifications (Part 4):
 * - Header: 48px, simplified navigation
 * - Content: Full-width, safe-area-aware
 * - Bottom action: Fixed, safe-area-bottom padding
 * - Touch targets: Minimum 44x44px
 * - Padding: 16px horizontal
 * 
 * Account Linking Flow:
 * 1. Initialize LIFF SDK
 * 2. Verify LINE token with backend
 * 3. If not linked → redirect to /liff/link
 * 4. If linked → show normal content
 */

// Inner component that uses LiffAuthContext
function LiffLayoutContent() {
  const location = useLocation();
  const { status, error, retry, isLoading, needsLinking } = useLiffAuth();

  // Check if we're on a linking page
  const isLinkingPage = location.pathname.startsWith('/liff/link');

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

  // Error state
  if (status === 'error' && error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 safe-area-inset">
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-6 max-w-sm w-full border border-neutral-200 dark:border-neutral-800">
          {/* Error icon */}
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center">
            <AlertCircle size={28} className="text-error-500" />
          </div>

          {/* Error content */}
          <div className="text-center mb-6">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              เกิดข้อผิดพลาด
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {error}
            </p>
          </div>

          {/* Retry button */}
          <button
            onClick={retry}
            className="
              w-full inline-flex items-center justify-center gap-2
              h-12 px-4
              bg-primary-500 hover:bg-primary-600 active:bg-primary-700
              text-white font-medium
              rounded-md transition-colors
              touch-target
            "
          >
            <RefreshCw size={18} />
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  // Not logged into LINE state
  if (status === 'not_logged_in') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 safe-area-inset">
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-6 max-w-sm w-full border border-neutral-200 dark:border-neutral-800">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Loader2 size={28} className="text-primary-500 animate-spin" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              กำลังเปลี่ยนเส้นทาง
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              กรุณารอสักครู่ ระบบกำลังนำท่านไปยังหน้า LINE Login
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to linking page if user is not linked and not on linking page
  if (needsLinking && !isLinkingPage) {
    return <Navigate to="/liff/link" replace />;
  }

  // Check if user is authenticated (either via LINE linking or email login)
  const isAuthenticated = status === 'linked' || status === 'email_auth';

  // Redirect away from linking page if already authenticated
  if (isAuthenticated && isLinkingPage) {
    return <Navigate to="/liff/clock" replace />;
  }

  // Determine if we should show bottom navigation
  // Show when authenticated and not on linking pages
  const showBottomNav = isAuthenticated && !isLinkingPage;

  // Main layout (authenticated users or on linking pages)
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 no-overscroll">
      {/* Main content with safe area padding */}
      <div className={`safe-area-inset min-h-screen flex flex-col ${showBottomNav ? 'pb-14' : ''}`}>
        <Outlet />
      </div>

      {/* Bottom navigation for authenticated users */}
      {showBottomNav && <LiffBottomNav />}
    </div>
  );
}

// Wrapper component that provides LiffAuthContext
export default function LiffLayout() {
  return (
    <LiffAuthProvider>
      <LiffLayoutContent />
    </LiffAuthProvider>
  );
}

// LIFF Page wrapper with header and optional bottom action
interface LiffPageProps {
  /** Page content */
  children: React.ReactNode;
  /** Page title */
  title?: string;
  /** Show header */
  showHeader?: boolean;
  /** Show back button in header */
  showBack?: boolean;
  /** Header right action */
  headerAction?: React.ReactNode;
  /** Bottom action content */
  bottomAction?: React.ReactNode;
  /** Additional content padding */
  noPadding?: boolean;
  /** Additional CSS classes */
  className?: string;
}

import React from 'react';
import MobileHeader from './MobileHeader';
import { BottomAction } from './BottomNav';

export function LiffPage({
  children,
  title,
  showHeader = true,
  showBack = false,
  headerAction,
  bottomAction,
  noPadding = false,
  className = '',
}: LiffPageProps) {
  return (
    <div className={`flex flex-col min-h-screen ${className}`}>
      {/* Header - 48px */}
      {showHeader && (
        <MobileHeader
          title={title}
          showBack={showBack}
          rightAction={headerAction}
        />
      )}

      {/* Scrollable content area */}
      <main
        className={`
          flex-1 overflow-y-auto
          ${noPadding ? '' : 'p-4'}
          ${bottomAction ? 'pb-24' : ''}
        `}
      >
        {children}
      </main>

      {/* Fixed bottom action */}
      {bottomAction && <BottomAction>{bottomAction}</BottomAction>}
    </div>
  );
}

export type { LiffPageProps };

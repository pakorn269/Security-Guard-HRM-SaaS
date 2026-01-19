import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import liff from '@line/liff';

/**
 * LIFF Layout (Mobile)
 *
 * Specifications (Part 4):
 * - Header: 48px, simplified navigation
 * - Content: Full-width, safe-area-aware
 * - Bottom action: Fixed, safe-area-bottom padding
 * - Touch targets: Minimum 44x44px
 * - Padding: 16px horizontal
 */
export default function LiffLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = import.meta.env.VITE_LIFF_ID;
        if (!liffId) {
          throw new Error('LIFF ID not configured');
        }

        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        setIsLoading(false);
      } catch (err) {
        console.error('LIFF initialization failed', err);
        setError(err instanceof Error ? err.message : 'LIFF initialization failed');
        setIsLoading(false);
      }
    };

    initLiff();
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

  // Error state
  if (error) {
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
            onClick={() => window.location.reload()}
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

  // Main layout
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 no-overscroll">
      {/* Main content with safe area padding */}
      <div className="safe-area-inset min-h-screen flex flex-col">
        <Outlet />
      </div>
    </div>
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

import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import liff from '@line/liff';

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 safe-area-top safe-area-bottom">
        <div className="flex flex-col items-center gap-4 p-4">
          <Loader2 size={40} className="text-primary-500 animate-spin" />
          <p className="text-neutral-500 dark:text-neutral-400 text-center text-sm">
            กำลังโหลด...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 safe-area-top safe-area-bottom">
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-6 max-w-sm w-full text-center border border-neutral-200 dark:border-neutral-800">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center">
            <AlertCircle size={28} className="text-error-500" />
          </div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            เกิดข้อผิดพลาด
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 bg-primary-500 hover:bg-primary-600 text-white rounded font-medium transition-colors touch-target"
          >
            <RefreshCw size={18} />
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 no-overscroll">
      {/* Main content with safe area padding */}
      <div className="safe-area-top safe-area-bottom safe-area-left safe-area-right">
        <Outlet />
      </div>
    </div>
  );
}

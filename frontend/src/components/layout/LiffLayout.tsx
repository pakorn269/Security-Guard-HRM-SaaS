import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
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
            <div className="flex items-center justify-center min-h-screen bg-surface-50 safe-area-top safe-area-bottom">
                <div className="flex flex-col items-center gap-4 p-4">
                    <div className="w-12 h-12 spinner" />
                    <p className="text-surface-500 text-center">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-surface-50 p-4 safe-area-top safe-area-bottom">
                <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error-100 flex items-center justify-center">
                        <span className="text-3xl">❌</span>
                    </div>
                    <h1 className="text-xl font-semibold text-surface-800 mb-2">เกิดข้อผิดพลาด</h1>
                    <p className="text-surface-500 text-sm">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 w-full px-4 py-3 bg-primary-600 text-white rounded-lg font-medium touch-target"
                    >
                        ลองใหม่อีกครั้ง
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-50 no-overscroll safe-area-top safe-area-bottom">
            <Outlet />
        </div>
    );
}


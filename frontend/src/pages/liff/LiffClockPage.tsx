import { useState } from 'react';

export default function LiffClockPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [clockedIn, setClockedIn] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

    const handleClockIn = async () => {
        setIsLoading(true);

        // Get geolocation
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                    setClockedIn(true);
                    setIsLoading(false);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    setIsLoading(false);
                    alert('ไม่สามารถระบุตำแหน่งได้ กรุณาเปิด GPS');
                }
            );
        }
    };

    const handleClockOut = async () => {
        setIsLoading(true);
        setTimeout(() => {
            setClockedIn(false);
            setIsLoading(false);
        }, 1000);
    };

    return (
        <div className="p-4 flex flex-col items-center justify-center min-h-screen animate-fade-in">
            {/* Current shift info */}
            <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-lg text-center mb-6">
                <p className="text-surface-500 text-sm">กะงานวันนี้</p>
                <p className="text-2xl font-bold text-surface-800 mt-1">08:00 - 17:00</p>
                <p className="text-surface-500 mt-2">📍 อาคาร A</p>
            </div>

            {/* Clock button */}
            <button
                onClick={clockedIn ? handleClockOut : handleClockIn}
                disabled={isLoading}
                className={`w-48 h-48 rounded-full flex flex-col items-center justify-center text-white font-bold text-xl shadow-xl transition-all transform hover:scale-105 active:scale-95 ${clockedIn
                        ? 'bg-gradient-to-br from-error-500 to-error-600'
                        : 'bg-gradient-to-br from-success-500 to-success-600'
                    } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} animate-pulse-glow`}
                style={{
                    boxShadow: clockedIn
                        ? '0 0 40px -10px rgba(239, 68, 68, 0.5)'
                        : '0 0 40px -10px rgba(34, 197, 94, 0.5)',
                }}
            >
                {isLoading ? (
                    <div className="w-12 h-12 spinner border-white border-t-transparent" />
                ) : (
                    <>
                        <span className="text-4xl mb-2">{clockedIn ? '🚪' : '✋'}</span>
                        <span>{clockedIn ? 'ลงเวลาออก' : 'ลงเวลาเข้า'}</span>
                    </>
                )}
            </button>

            {/* Status */}
            <div className="mt-8 text-center">
                {clockedIn ? (
                    <div className="space-y-2">
                        <p className="text-success-600 font-semibold">✅ ลงเวลาเข้างานแล้ว</p>
                        <p className="text-surface-500 text-sm">เวลา 08:02 น.</p>
                        <p className="text-surface-400 text-xs">
                            📍 {location?.lat.toFixed(6)}, {location?.lng.toFixed(6)}
                        </p>
                    </div>
                ) : (
                    <p className="text-surface-500">กดปุ่มด้านบนเพื่อลงเวลาเข้างาน</p>
                )}
            </div>

            {/* GPS notice */}
            <div className="mt-8 bg-primary-50 rounded-xl p-4 text-center max-w-sm">
                <p className="text-primary-700 text-sm">
                    📍 ระบบจะบันทึกตำแหน่ง GPS ของคุณเมื่อลงเวลา
                </p>
            </div>
        </div>
    );
}

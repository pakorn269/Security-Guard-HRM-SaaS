import { useState, useEffect, useCallback } from 'react';
import {
    clockIn,
    clockOut,
    getTodayAttendance,
    type TodayAttendanceResponse,
} from '../../services/attendance.service';

interface GeolocationData {
    latitude: number;
    longitude: number;
    accuracy: number;
}

type GeolocationError = {
    code: number;
    message: string;
};

export default function LiffClockPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isClocking, setIsClocking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [todayData, setTodayData] = useState<TodayAttendanceResponse | null>(null);
    const [location, setLocation] = useState<GeolocationData | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Fetch today's attendance status
    const fetchTodayStatus = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getTodayAttendance();
            setTodayData(data);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load attendance status';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTodayStatus();
    }, [fetchTodayStatus]);

    // Get current geolocation
    const getGeolocation = (): Promise<GeolocationData> => {
        return new Promise((resolve, reject) => {
            if (!('geolocation' in navigator)) {
                reject({ code: 0, message: 'Geolocation not supported' });
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                    });
                },
                (error) => {
                    reject({
                        code: error.code,
                        message: getGeolocationErrorMessage(error.code),
                    });
                },
                {
                    enableHighAccuracy: true,
                    timeout: 30000,
                    maximumAge: 0,
                }
            );
        });
    };

    const getGeolocationErrorMessage = (code: number): string => {
        switch (code) {
            case 1:
                return 'กรุณาอนุญาตการเข้าถึงตำแหน่ง';
            case 2:
                return 'ไม่สามารถระบุตำแหน่งได้ กรุณาลองใหม่';
            case 3:
                return 'หมดเวลาการระบุตำแหน่ง กรุณาลองใหม่';
            default:
                return 'เกิดข้อผิดพลาดในการระบุตำแหน่ง';
        }
    };

    // Handle clock in
    const handleClockIn = async () => {
        setIsClocking(true);
        setLocationError(null);
        setError(null);
        setSuccessMessage(null);

        try {
            // Get GPS location first
            const geoData = await getGeolocation();
            setLocation(geoData);

            // Call API
            await clockIn({
                latitude: geoData.latitude,
                longitude: geoData.longitude,
                accuracy: geoData.accuracy,
                shiftId: todayData?.shift?.id,
            });

            setSuccessMessage('ลงเวลาเข้างานสำเร็จ!');

            // Refresh status
            await fetchTodayStatus();
        } catch (err: unknown) {
            if ((err as GeolocationError).code !== undefined) {
                setLocationError((err as GeolocationError).message);
            } else {
                const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถลงเวลาเข้าได้';
                setError(errorMessage);
            }
        } finally {
            setIsClocking(false);
        }
    };

    // Handle clock out
    const handleClockOut = async () => {
        setIsClocking(true);
        setLocationError(null);
        setError(null);
        setSuccessMessage(null);

        try {
            // Get GPS location first
            const geoData = await getGeolocation();
            setLocation(geoData);

            // Call API
            const result = await clockOut({
                latitude: geoData.latitude,
                longitude: geoData.longitude,
                accuracy: geoData.accuracy,
            });

            setSuccessMessage(`ลงเวลาออกสำเร็จ! (${result.totalHours} ชั่วโมง)`);

            // Refresh status
            await fetchTodayStatus();
        } catch (err: unknown) {
            if ((err as GeolocationError).code !== undefined) {
                setLocationError((err as GeolocationError).message);
            } else {
                const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถลงเวลาออกได้';
                setError(errorMessage);
            }
        } finally {
            setIsClocking(false);
        }
    };

    // Format time for display
    const formatTime = (timeStr: string | null | undefined): string => {
        if (!timeStr) return '-';
        const date = new Date(timeStr);
        return date.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Get status color
    const getStatusColor = (status: string | undefined): string => {
        switch (status) {
            case 'on_time':
                return 'text-success-600';
            case 'late':
                return 'text-warning-600';
            case 'completed':
                return 'text-primary-600';
            case 'early_leave':
                return 'text-warning-600';
            default:
                return 'text-surface-500';
        }
    };

    // Get status text in Thai
    const getStatusText = (status: string | undefined): string => {
        switch (status) {
            case 'on_time':
                return 'ตรงเวลา';
            case 'late':
                return 'สาย';
            case 'completed':
                return 'เสร็จสิ้น';
            case 'early_leave':
                return 'ออกก่อนเวลา';
            case 'no_show':
                return 'ไม่มา';
            case 'pending':
                return 'รอดำเนินการ';
            default:
                return '-';
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="p-4 flex flex-col items-center justify-center min-h-screen">
                <div className="w-12 h-12 spinner" />
                <p className="text-surface-500 mt-4">กำลังโหลด...</p>
            </div>
        );
    }

    // Error state
    if (error && !todayData) {
        return (
            <div className="p-4 flex flex-col items-center justify-center min-h-screen">
                <div className="text-error-500 text-6xl mb-4">⚠️</div>
                <p className="text-error-600 text-center">{error}</p>
                <button
                    onClick={fetchTodayStatus}
                    className="mt-4 px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                    ลองใหม่
                </button>
            </div>
        );
    }

    const { shift, attendance, canClockIn, canClockOut, currentStatus } = todayData || {};

    return (
        <div className="p-4 flex flex-col items-center justify-center min-h-screen animate-fade-in">
            {/* Success message */}
            {successMessage && (
                <div className="fixed top-4 left-4 right-4 bg-success-100 border border-success-300 text-success-800 px-4 py-3 rounded-xl shadow-lg animate-bounce-in z-50">
                    <p className="text-center font-medium">✅ {successMessage}</p>
                </div>
            )}

            {/* Current shift info */}
            <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-lg text-center mb-6">
                {shift ? (
                    <>
                        <p className="text-surface-500 text-sm">กะงานวันนี้</p>
                        <p className="text-2xl font-bold text-surface-800 mt-1">
                            {shift.startTime} - {shift.endTime}
                        </p>
                        {shift.location && (
                            <p className="text-surface-500 mt-2">📍 {shift.location}</p>
                        )}
                    </>
                ) : (
                    <>
                        <p className="text-surface-500 text-sm">วันนี้</p>
                        <p className="text-xl font-semibold text-surface-600 mt-1">
                            ไม่มีกะงานที่กำหนด
                        </p>
                        <p className="text-surface-400 text-sm mt-2">
                            คุณสามารถลงเวลาเข้าได้หากต้องการ
                        </p>
                    </>
                )}
            </div>

            {/* Current attendance status */}
            {attendance && (
                <div className="w-full max-w-sm bg-surface-50 rounded-xl p-4 mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-surface-500 text-sm">เวลาเข้า</span>
                        <span className="font-semibold">{formatTime(attendance.clockInTime)}</span>
                    </div>
                    {attendance.clockOutTime && (
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-surface-500 text-sm">เวลาออก</span>
                            <span className="font-semibold">{formatTime(attendance.clockOutTime)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="text-surface-500 text-sm">สถานะ</span>
                        <span className={`font-semibold ${getStatusColor(attendance.status)}`}>
                            {getStatusText(attendance.status)}
                        </span>
                    </div>
                    {attendance.totalHours && (
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-surface-200">
                            <span className="text-surface-500 text-sm">รวมชั่วโมง</span>
                            <span className="font-semibold text-primary-600">
                                {attendance.totalHours} ชม.
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Clock button */}
            {(canClockIn || canClockOut) && (
                <button
                    onClick={canClockOut ? handleClockOut : handleClockIn}
                    disabled={isClocking}
                    className={`w-48 h-48 rounded-full flex flex-col items-center justify-center text-white font-bold text-xl shadow-xl transition-all transform hover:scale-105 active:scale-95 ${canClockOut
                            ? 'bg-gradient-to-br from-error-500 to-error-600'
                            : 'bg-gradient-to-br from-success-500 to-success-600'
                        } ${isClocking ? 'opacity-70 cursor-not-allowed' : ''} animate-pulse-glow`}
                    style={{
                        boxShadow: canClockOut
                            ? '0 0 40px -10px rgba(239, 68, 68, 0.5)'
                            : '0 0 40px -10px rgba(34, 197, 94, 0.5)',
                    }}
                >
                    {isClocking ? (
                        <div className="w-12 h-12 spinner border-white border-t-transparent" />
                    ) : (
                        <>
                            <span className="text-4xl mb-2">{canClockOut ? '🚪' : '✋'}</span>
                            <span>{canClockOut ? 'ลงเวลาออก' : 'ลงเวลาเข้า'}</span>
                        </>
                    )}
                </button>
            )}

            {/* Already clocked out message */}
            {currentStatus === 'clocked_out' && (
                <div className="w-48 h-48 rounded-full flex flex-col items-center justify-center bg-surface-100 text-surface-500">
                    <span className="text-4xl mb-2">✅</span>
                    <span className="text-lg font-medium">เสร็จสิ้นแล้ว</span>
                </div>
            )}

            {/* No shift message */}
            {currentStatus === 'no_shift' && !canClockIn && (
                <div className="w-48 h-48 rounded-full flex flex-col items-center justify-center bg-surface-100 text-surface-500">
                    <span className="text-4xl mb-2">📅</span>
                    <span className="text-lg font-medium text-center">ไม่มีกะวันนี้</span>
                </div>
            )}

            {/* Error messages */}
            {(error || locationError) && (
                <div className="mt-6 bg-error-50 border border-error-200 rounded-xl p-4 max-w-sm w-full">
                    <p className="text-error-700 text-center text-sm">
                        ⚠️ {locationError || error}
                    </p>
                </div>
            )}

            {/* Location info */}
            {location && (
                <div className="mt-6 text-center">
                    <p className="text-surface-400 text-xs">
                        📍 พิกัด: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </p>
                    <p className="text-surface-400 text-xs">
                        ความแม่นยำ: ±{Math.round(location.accuracy)} เมตร
                    </p>
                </div>
            )}

            {/* GPS notice */}
            <div className="mt-8 bg-primary-50 rounded-xl p-4 text-center max-w-sm">
                <p className="text-primary-700 text-sm">
                    📍 ระบบจะบันทึกตำแหน่ง GPS ของคุณเมื่อลงเวลา
                </p>
            </div>
        </div>
    );
}

import { useState, useEffect, useCallback } from 'react';
import {

    MapPin,
    AlertCircle,
    LogIn,
    LogOut,
    CheckCircle,
    CalendarOff,
    Timer,
    Navigation,
    RefreshCw,
    Loader2,
} from 'lucide-react';
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
                return 'text-neutral-500';
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
                <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                    <Loader2 size={32} className="text-primary-500 animate-spin" />
                </div>
                <p className="text-neutral-500 dark:text-neutral-400">กำลังโหลด...</p>
            </div>
        );
    }

    // Error state
    if (error && !todayData) {
        return (
            <div className="p-4 flex flex-col items-center justify-center min-h-screen">
                <div className="w-16 h-16 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center mb-4">
                    <AlertCircle size={32} className="text-error-500" />
                </div>
                <p className="text-error-600 text-center mb-4">{error}</p>
                <button
                    onClick={fetchTodayStatus}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
                >
                    <RefreshCw size={16} />
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
                <div className="fixed top-4 left-4 right-4 bg-success-100 dark:bg-success-900/30 border border-success-300 dark:border-success-700 text-success-800 dark:text-success-200 px-4 py-3 rounded-lg shadow-lg animate-bounce-in z-50">
                    <div className="flex items-center justify-center gap-2">
                        <CheckCircle size={18} className="text-success-600" />
                        <span className="font-medium">{successMessage}</span>
                    </div>
                </div>
            )}

            {/* Current shift info */}
            <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-lg p-6 shadow-sm border border-neutral-200 dark:border-neutral-800 text-center mb-6">
                {shift ? (
                    <>
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm">กะงานวันนี้</p>
                        <p className="text-2xl font-bold text-neutral-800 dark:text-white mt-1">
                            {shift.startTime} - {shift.endTime}
                        </p>
                        {shift.location && (
                            <div className="flex items-center justify-center gap-1.5 text-neutral-500 dark:text-neutral-400 mt-2">
                                <MapPin size={14} />
                                <span>{shift.location}</span>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm">วันนี้</p>
                        <p className="text-xl font-semibold text-neutral-600 dark:text-neutral-300 mt-1">
                            ไม่มีกะงานที่กำหนด
                        </p>
                        <p className="text-neutral-400 dark:text-neutral-500 text-sm mt-2">
                            คุณสามารถลงเวลาเข้าได้หากต้องการ
                        </p>
                    </>
                )}
            </div>

            {/* Current attendance status */}
            {attendance && (
                <div className="w-full max-w-sm bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-neutral-500 dark:text-neutral-400 text-sm flex items-center gap-1.5">
                            <LogIn size={14} />
                            เวลาเข้า
                        </span>
                        <span className="font-semibold text-neutral-800 dark:text-white">{formatTime(attendance.clockInTime)}</span>
                    </div>
                    {attendance.clockOutTime && (
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-neutral-500 dark:text-neutral-400 text-sm flex items-center gap-1.5">
                                <LogOut size={14} />
                                เวลาออก
                            </span>
                            <span className="font-semibold text-neutral-800 dark:text-white">{formatTime(attendance.clockOutTime)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="text-neutral-500 dark:text-neutral-400 text-sm">สถานะ</span>
                        <span className={`font-semibold ${getStatusColor(attendance.status)}`}>
                            {getStatusText(attendance.status)}
                        </span>
                    </div>
                    {attendance.totalHours && (
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                            <span className="text-neutral-500 dark:text-neutral-400 text-sm flex items-center gap-1.5">
                                <Timer size={14} />
                                รวมชั่วโมง
                            </span>
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
                    className={`
                        w-44 h-44 rounded-full flex flex-col items-center justify-center text-white font-bold text-lg 
                        shadow-xl transition-all transform hover:scale-105 active:scale-95
                        ${canClockOut
                            ? 'bg-gradient-to-br from-error-500 to-error-600'
                            : 'bg-gradient-to-br from-success-500 to-success-600'
                        } 
                        ${isClocking ? 'opacity-70 cursor-not-allowed' : ''}
                    `}
                    style={{
                        boxShadow: canClockOut
                            ? '0 0 40px -10px rgba(239, 68, 68, 0.5)'
                            : '0 0 40px -10px rgba(34, 197, 94, 0.5)',
                    }}
                >
                    {isClocking ? (
                        <Loader2 size={32} className="animate-spin" />
                    ) : (
                        <>
                            {canClockOut ? (
                                <LogOut size={40} className="mb-2" />
                            ) : (
                                <LogIn size={40} className="mb-2" />
                            )}
                            <span>{canClockOut ? 'ลงเวลาออก' : 'ลงเวลาเข้า'}</span>
                        </>
                    )}
                </button>
            )}

            {/* Already clocked out message */}
            {currentStatus === 'clocked_out' && (
                <div className="w-44 h-44 rounded-full flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                    <CheckCircle size={40} className="mb-2 text-success-500" />
                    <span className="text-lg font-medium">เสร็จสิ้นแล้ว</span>
                </div>
            )}

            {/* No shift message */}
            {currentStatus === 'no_shift' && !canClockIn && (
                <div className="w-44 h-44 rounded-full flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                    <CalendarOff size={40} className="mb-2" />
                    <span className="text-lg font-medium text-center">ไม่มีกะวันนี้</span>
                </div>
            )}

            {/* Error messages */}
            {(error || locationError) && (
                <div className="mt-6 bg-error-50 dark:bg-error-900/30 border border-error-200 dark:border-error-700 rounded-lg p-4 max-w-sm w-full">
                    <div className="flex items-center gap-2 text-error-700 dark:text-error-300 text-sm">
                        <AlertCircle size={16} />
                        <span>{locationError || error}</span>
                    </div>
                </div>
            )}

            {/* Location info */}
            {location && (
                <div className="mt-6 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-neutral-400 dark:text-neutral-500 text-xs">
                        <Navigation size={12} />
                        <span>พิกัด: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
                    </div>
                    <p className="text-neutral-400 dark:text-neutral-500 text-xs mt-1">
                        ความแม่นยำ: ±{Math.round(location.accuracy)} เมตร
                    </p>
                </div>
            )}

            {/* GPS notice */}
            <div className="mt-8 bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 text-center max-w-sm border border-primary-100 dark:border-primary-800">
                <div className="flex items-center justify-center gap-2 text-primary-700 dark:text-primary-300 text-sm">
                    <MapPin size={16} />
                    <span>ระบบจะบันทึกตำแหน่ง GPS ของคุณเมื่อลงเวลา</span>
                </div>
            </div>
        </div>
    );
}

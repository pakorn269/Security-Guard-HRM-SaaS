import { useState, useEffect, useCallback, useRef } from 'react';
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
    QrCode,
    X,
} from 'lucide-react';
import {
    clockIn,
    clockOut,
    getTodayAttendance,
    type TodayAttendanceResponse,
} from '../../services/attendance.service';
import sitesService, { type Site } from '../../services/sites.service';
import useGeolocation from '../../hooks/useGeolocation';
import GpsErrorModal from '../../components/common/GpsErrorModal';
import { TimeDebugger } from '../../components/common';
import type { ApiError } from '../../services/api';
import QrScanner from 'qr-scanner';

// Helper to extract Thai error message from API errors
function getThaiErrorMessage(err: unknown, fallback: string): string {
    // Check if it's an ApiError with message_th
    if (err && typeof err === 'object') {
        const apiErr = err as ApiError;
        if (apiErr.message_th) {
            return apiErr.message_th;
        }
        if (apiErr.message) {
            return apiErr.message;
        }
    }
    // Fallback for standard Error objects
    if (err instanceof Error) {
        return err.message;
    }
    return fallback;
}

export default function LiffClockPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isClocking, setIsClocking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [todayData, setTodayData] = useState<TodayAttendanceResponse | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showGpsErrorModal, setShowGpsErrorModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<'clock_in' | 'clock_out' | null>(null);

    // QR Scanner state
    const [showQrScanner, setShowQrScanner] = useState(false);
    const [qrError, setQrError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const qrScannerRef = useRef<QrScanner | null>(null);

    // Sites state
    const [sites, setSites] = useState<Site[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<string>('');
    const [isLoadingSites, setIsLoadingSites] = useState(false);

    // Use the new geolocation hook with Fail-Fast strategy
    const {
        location,
        error: geoError,
        isLoading: isGettingLocation,
        getLocation,
        clearError: clearGeoError,
    } = useGeolocation();

    // Fetch available sites (with graceful degradation for RBAC restrictions)
    const fetchSites = useCallback(async () => {
        try {
            setIsLoadingSites(true);
            const response = await sitesService.list({ status: 'active' });
            setSites(response.data);

            // Auto-select first site if only one available
            if (response.data.length === 1) {
                setSelectedSiteId(response.data[0].id);
            }
        } catch (err: unknown) {
            // Check for permission errors (403 Forbidden or 401 Unauthorized)
            // These are expected for security guards accessing via browser
            const isPermissionError =
                err &&
                typeof err === 'object' &&
                'response' in err &&
                err.response &&
                typeof err.response === 'object' &&
                'status' in err.response &&
                (err.response.status === 403 || err.response.status === 401);

            if (isPermissionError) {
                // Silent fail - just log a warning, don't block the UI
                console.warn('Site fetch skipped due to permissions');
            } else {
                // Log other errors but still don't block the UI
                console.error('Failed to load sites:', err);
            }
            // Keep sites array empty - UI will handle gracefully
        } finally {
            setIsLoadingSites(false);
        }
    }, []);

    // Fetch today's attendance status
    const fetchTodayStatus = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getTodayAttendance();
            setTodayData(data);
        } catch (err: unknown) {
            // Use Thai error message if available from API
            const errorMessage = getThaiErrorMessage(err, 'ไม่สามารถโหลดสถานะการลงเวลาได้');
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTodayStatus();
        fetchSites();
    }, [fetchTodayStatus, fetchSites]);

    // Initialize QR Scanner
    const initQrScanner = useCallback(async () => {
        if (!videoRef.current) return;

        try {
            setQrError(null);

            // Clean up existing scanner
            if (qrScannerRef.current) {
                qrScannerRef.current.stop();
                qrScannerRef.current.destroy();
            }

            const scanner = new QrScanner(
                videoRef.current,
                (result) => {
                    // QR code detected
                    handleQrCodeScanned(result.data);
                },
                {
                    returnDetailedScanResult: true,
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                }
            );

            qrScannerRef.current = scanner;
            await scanner.start();
        } catch (err) {
            console.error('QR Scanner error:', err);
            setQrError('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง');
        }
    }, []);

    // Open QR Scanner
    const openQrScanner = useCallback(() => {
        const siteIdToUse = todayData?.shift?.siteId || selectedSiteId;

        if (!siteIdToUse) {
            setError('กรุณาเลือกสถานที่ก่อนสแกน QR Code');
            return;
        }

        setShowQrScanner(true);
        setQrError(null);

        // Wait for video element to be rendered
        setTimeout(() => {
            initQrScanner();
        }, 100);
    }, [todayData?.shift?.siteId, selectedSiteId, initQrScanner]);

    // Close QR Scanner
    const closeQrScanner = useCallback(() => {
        if (qrScannerRef.current) {
            qrScannerRef.current.stop();
            qrScannerRef.current.destroy();
            qrScannerRef.current = null;
        }
        setShowQrScanner(false);
        setQrError(null);
    }, []);

    // Handle QR code scanned
    const handleQrCodeScanned = async (qrCodeData: string) => {
        closeQrScanner();

        setIsClocking(true);
        setError(null);
        setSuccessMessage(null);
        setPendingAction('clock_in');

        try {
            // Get GPS location
            const geoData = await getLocation();

            // Use shift's siteId if available
            const siteIdToUse = todayData?.shift?.siteId || selectedSiteId;

            // Call API with QR code
            await clockIn({
                latitude: geoData.latitude,
                longitude: geoData.longitude,
                accuracy: geoData.accuracy,
                siteId: siteIdToUse,
                zoneQrCode: qrCodeData,
                shiftId: todayData?.shift?.id,
            });

            setSuccessMessage('ลงเวลาเข้างานสำเร็จ (QR Code)!');
            setPendingAction(null);

            // Refresh status
            await fetchTodayStatus();
        } catch (err: unknown) {
            // Check if it's a geolocation error (has 'code' property AND is a GeolocationPositionError)
            const isGeoError = err && typeof err === 'object' && 'code' in err &&
                (err as { code: number }).code >= 1 && (err as { code: number }).code <= 3;

            if (isGeoError) {
                setShowGpsErrorModal(true);
            } else {
                // Use Thai error message if available from API
                const errorMessage = getThaiErrorMessage(err, 'ไม่สามารถลงเวลาเข้าได้');
                setError(errorMessage);
                setPendingAction(null);
            }
        } finally {
            setIsClocking(false);
        }
    };

    // Cleanup QR scanner on unmount
    useEffect(() => {
        return () => {
            if (qrScannerRef.current) {
                qrScannerRef.current.stop();
                qrScannerRef.current.destroy();
            }
        };
    }, []);

    /**
     * Handle clock in with GPS
     */
    const handleClockIn = async () => {
        // Use shift's siteId if available, otherwise require manual selection
        const siteIdToUse = todayData?.shift?.siteId || selectedSiteId;

        if (!siteIdToUse) {
            setError('กรุณาเลือกสถานที่ก่อนลงเวลา');
            return;
        }

        setIsClocking(true);
        setError(null);
        setSuccessMessage(null);
        setPendingAction('clock_in');

        try {
            // Get GPS location first with 5-second timeout
            const geoData = await getLocation();

            // Call API (siteId is optional, backend will use shift's siteId if not provided)
            await clockIn({
                latitude: geoData.latitude,
                longitude: geoData.longitude,
                accuracy: geoData.accuracy,
                siteId: siteIdToUse,
                shiftId: todayData?.shift?.id,
            });

            setSuccessMessage('ลงเวลาเข้างานสำเร็จ!');
            setPendingAction(null);

            // Refresh status
            await fetchTodayStatus();
        } catch (err: unknown) {
            // Check if it's a geolocation error (has 'code' property AND is a GeolocationPositionError)
            const isGeoError = err && typeof err === 'object' && 'code' in err &&
                (err as { code: number }).code >= 1 && (err as { code: number }).code <= 3;

            if (isGeoError) {
                // Show the GPS error modal
                setShowGpsErrorModal(true);
            } else {
                // Use Thai error message if available from API
                const errorMessage = getThaiErrorMessage(err, 'ไม่สามารถลงเวลาเข้าได้');
                setError(errorMessage);
                setPendingAction(null);
            }
        } finally {
            setIsClocking(false);
        }
    };

    /**
     * Handle clock out with Fail-Fast geolocation
     */
    const handleClockOut = async () => {
        setIsClocking(true);
        setError(null);
        setSuccessMessage(null);
        setPendingAction('clock_out');

        try {
            // Get GPS location first with 5-second timeout
            const geoData = await getLocation();

            // Call API
            const result = await clockOut({
                latitude: geoData.latitude,
                longitude: geoData.longitude,
                accuracy: geoData.accuracy,
            });

            setSuccessMessage(`ลงเวลาออกสำเร็จ! (${result.totalHours} ชั่วโมง)`);
            setPendingAction(null);

            // Refresh status
            await fetchTodayStatus();
        } catch (err: unknown) {
            // Check if it's a geolocation error (has 'code' property AND is a GeolocationPositionError)
            const isGeoError = err && typeof err === 'object' && 'code' in err &&
                (err as { code: number }).code >= 1 && (err as { code: number }).code <= 3;

            if (isGeoError) {
                // Show the GPS error modal
                setShowGpsErrorModal(true);
            } else {
                // Use Thai error message if available from API
                const errorMessage = getThaiErrorMessage(err, 'ไม่สามารถลงเวลาออกได้');
                setError(errorMessage);
                setPendingAction(null);
            }
        } finally {
            setIsClocking(false);
        }
    };

    /**
     * Handle retry from GPS error modal
     */
    const handleGpsRetry = async () => {
        setShowGpsErrorModal(false);
        clearGeoError();

        // Retry the pending action
        if (pendingAction === 'clock_in') {
            await handleClockIn();
        } else if (pendingAction === 'clock_out') {
            await handleClockOut();
        }
    };

    /**
     * Handle close GPS error modal
     */
    const handleGpsModalClose = () => {
        setShowGpsErrorModal(false);
        clearGeoError();
        setPendingAction(null);
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

    // Add extra padding at bottom (pb-20) to account for TimeDebugger (~60px) above the bottom nav
    return (
        <div className="p-4 pb-20 flex flex-col items-center justify-center min-h-screen animate-fade-in">
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

            {/* Site selection - Only show when clocking in AND shift has no site assigned */}
            {canClockIn && !shift?.siteId && (
                <div className="w-full max-w-sm mb-6">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        เลือกสถานที่
                    </label>
                    <select
                        value={selectedSiteId}
                        onChange={(e) => setSelectedSiteId(e.target.value)}
                        disabled={isLoadingSites || isClocking}
                        className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
                    >
                        <option value="">-- เลือกสถานที่ --</option>
                        {sites.map((site) => (
                            <option key={site.id} value={site.id}>
                                {site.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Show assigned site info when shift has a site */}
            {canClockIn && shift?.siteId && (
                <div className="w-full max-w-sm mb-6 bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 border border-primary-100 dark:border-primary-800">
                    <div className="flex items-center gap-2 text-primary-700 dark:text-primary-300">
                        <MapPin size={16} />
                        <span className="text-sm font-medium">สถานที่ที่กำหนด: {shift.location || 'ระบุสถานที่'}</span>
                    </div>
                </div>
            )}

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

            {/* Clock buttons - GPS and QR */}
            {canClockIn && (
                <div className="flex flex-col items-center gap-4 mb-6">
                    {/* Main GPS Clock In Button */}
                    <button
                        onClick={handleClockIn}
                        disabled={isClocking || (!shift?.siteId && !selectedSiteId)}
                        className={`
                            w-44 h-44 rounded-full flex flex-col items-center justify-center text-white font-bold text-lg
                            shadow-xl transition-all transform hover:scale-105 active:scale-95
                            bg-gradient-to-br from-success-500 to-success-600
                            ${isClocking || (!shift?.siteId && !selectedSiteId) ? 'opacity-70 cursor-not-allowed' : ''}
                        `}
                        style={{
                            boxShadow: '0 0 40px -10px rgba(34, 197, 94, 0.5)',
                        }}
                    >
                        {isClocking ? (
                            <Loader2 size={32} className="animate-spin" />
                        ) : (
                            <>
                                <LogIn size={40} className="mb-2" />
                                <span>ลงเวลาเข้า (GPS)</span>
                            </>
                        )}
                    </button>

                    {/* QR Code Button */}
                    <button
                        onClick={openQrScanner}
                        disabled={isClocking || (!shift?.siteId && !selectedSiteId)}
                        className={`
                            inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium
                            bg-primary-500 text-white hover:bg-primary-600
                            transition-all shadow-md
                            ${isClocking || (!shift?.siteId && !selectedSiteId) ? 'opacity-70 cursor-not-allowed' : ''}
                        `}
                    >
                        <QrCode size={20} />
                        <span>สแกน QR Code</span>
                    </button>
                </div>
            )}

            {/* Clock Out Button */}
            {canClockOut && (
                <button
                    onClick={handleClockOut}
                    disabled={isClocking}
                    className={`
                        w-44 h-44 rounded-full flex flex-col items-center justify-center text-white font-bold text-lg
                        shadow-xl transition-all transform hover:scale-105 active:scale-95
                        bg-gradient-to-br from-error-500 to-error-600
                        ${isClocking ? 'opacity-70 cursor-not-allowed' : ''}
                    `}
                    style={{
                        boxShadow: '0 0 40px -10px rgba(239, 68, 68, 0.5)',
                    }}
                >
                    {isClocking ? (
                        <Loader2 size={32} className="animate-spin" />
                    ) : (
                        <>
                            <LogOut size={40} className="mb-2" />
                            <span>ลงเวลาออก</span>
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

            {/* Error messages (non-GPS errors only) */}
            {error && (
                <div className="mt-6 bg-error-50 dark:bg-error-900/30 border border-error-200 dark:border-error-700 rounded-lg p-4 max-w-sm w-full">
                    <div className="flex items-center gap-2 text-error-700 dark:text-error-300 text-sm">
                        <AlertCircle size={16} />
                        <span>{error}</span>
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

            {/* QR Scanner Modal */}
            {showQrScanner && (
                <div className="fixed inset-0 bg-black z-50 flex flex-col">
                    {/* Header */}
                    <div className="bg-neutral-900 px-4 py-3 flex items-center justify-between">
                        <h3 className="text-white font-medium">สแกน QR Code</h3>
                        <button
                            onClick={closeQrScanner}
                            className="text-white hover:text-neutral-300 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Scanner */}
                    <div className="flex-1 relative">
                        <video
                            ref={videoRef}
                            className="w-full h-full object-cover"
                        />

                        {/* Scanning overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-64 h-64 border-4 border-white rounded-lg shadow-lg">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-500 rounded-tl-lg"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-500 rounded-tr-lg"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-500 rounded-bl-lg"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-500 rounded-br-lg"></div>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="absolute bottom-8 left-0 right-0 text-center">
                            <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-lg inline-block">
                                วาง QR Code ไว้ในกรอบสี่เหลี่ยม
                            </p>
                        </div>

                        {/* QR Error */}
                        {qrError && (
                            <div className="absolute top-4 left-4 right-4 bg-error-500 text-white px-4 py-3 rounded-lg shadow-lg">
                                <div className="flex items-center gap-2">
                                    <AlertCircle size={18} />
                                    <span className="text-sm">{qrError}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* GPS Error Modal */}
            <GpsErrorModal
                isOpen={showGpsErrorModal}
                onClose={handleGpsModalClose}
                onRetry={handleGpsRetry}
                error={geoError}
                isRetrying={isGettingLocation}
            />

            {/* Time Debugger - shows server vs device time comparison */}
            {todayData?.serverTime && todayData?.companyTimezone && (
                <TimeDebugger
                    serverTime={todayData.serverTime}
                    companyTimezone={todayData.companyTimezone}
                />
            )}
        </div>
    );
}

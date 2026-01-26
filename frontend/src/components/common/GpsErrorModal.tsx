import { MapPinOff, RefreshCw, Settings, WifiOff, X } from 'lucide-react';
import Modal, { ModalFooter } from './Modal';
import type { GeolocationError, GeolocationErrorCode } from '../../hooks/useGeolocation';

interface GpsErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRetry: () => void;
    error: GeolocationError | null;
    isRetrying?: boolean;
}

/**
 * Get icon based on error type
 */
function getErrorIcon(code: GeolocationErrorCode | undefined) {
    switch (code) {
        case 'PERMISSION_DENIED':
            return <Settings size={48} className="text-warning-500" />;
        case 'POSITION_UNAVAILABLE':
            return <MapPinOff size={48} className="text-error-500" />;
        case 'TIMEOUT':
            return <WifiOff size={48} className="text-warning-500" />;
        default:
            return <MapPinOff size={48} className="text-error-500" />;
    }
}

/**
 * Get troubleshooting tips based on error type
 */
function getTroubleshootingTips(code: GeolocationErrorCode | undefined): string[] {
    switch (code) {
        case 'PERMISSION_DENIED':
            return [
                'เปิดการตั้งค่าเบราว์เซอร์',
                'อนุญาตการเข้าถึงตำแหน่งสำหรับเว็บไซต์นี้',
                'รีเฟรชหน้าเว็บแล้วลองใหม่',
            ];
        case 'POSITION_UNAVAILABLE':
            return [
                'ตรวจสอบว่าเปิด GPS/Location แล้ว',
                'ออกไปที่โล่งเพื่อให้รับสัญญาณ GPS ได้ดีขึ้น',
                'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
            ];
        case 'TIMEOUT':
            return [
                'ตรวจสอบสัญญาณ GPS',
                'ย้ายไปที่โล่งเพื่อรับสัญญาณที่ดีขึ้น',
                'รอสักครู่แล้วลองใหม่',
            ];
        default:
            return [
                'ตรวจสอบการตั้งค่า GPS',
                'รีสตาร์ทแอปพลิเคชัน',
                'ลองใหม่อีกครั้ง',
            ];
    }
}

/**
 * GpsErrorModal - Modal component for displaying GPS/Location errors
 *
 * Features:
 * - Shows specific error message in Thai
 * - Displays troubleshooting tips based on error type
 * - Retry button to attempt getting location again
 * - Visual feedback with appropriate icons
 */
export default function GpsErrorModal({
    isOpen,
    onClose,
    onRetry,
    error,
    isRetrying = false,
}: GpsErrorModalProps) {
    const tips = getTroubleshootingTips(error?.code);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
            showCloseButton={false}
            closeOnOverlayClick={!isRetrying}
        >
            <div className="text-center py-2">
                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className="w-20 h-20 rounded-full bg-error-50 dark:bg-error-900/30 flex items-center justify-center">
                        {getErrorIcon(error?.code)}
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-neutral-800 dark:text-white mb-2">
                    ไม่พบตำแหน่ง GPS
                </h3>

                {/* Error message */}
                <p className="text-neutral-600 dark:text-neutral-300 mb-4">
                    {error?.messageTh || 'เกิดข้อผิดพลาดในการระบุตำแหน่ง'}
                </p>

                {/* Troubleshooting tips */}
                <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-4 text-left mb-4">
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        วิธีแก้ไข:
                    </p>
                    <ul className="space-y-1.5">
                        {tips.map((tip, index) => (
                            <li
                                key={index}
                                className="text-sm text-neutral-600 dark:text-neutral-400 flex items-start gap-2"
                            >
                                <span className="text-primary-500 font-bold">{index + 1}.</span>
                                <span>{tip}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <ModalFooter>
                {/* Close button */}
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isRetrying}
                    className="flex-1 px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span className="flex items-center justify-center gap-2">
                        <X size={18} />
                        ปิด
                    </span>
                </button>

                {/* Retry button */}
                <button
                    type="button"
                    onClick={onRetry}
                    disabled={isRetrying}
                    className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span className="flex items-center justify-center gap-2">
                        <RefreshCw size={18} className={isRetrying ? 'animate-spin' : ''} />
                        {isRetrying ? 'กำลังค้นหา...' : 'ลองใหม่'}
                    </span>
                </button>
            </ModalFooter>
        </Modal>
    );
}

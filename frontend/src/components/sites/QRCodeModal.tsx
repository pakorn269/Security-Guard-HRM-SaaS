import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { Download, X } from 'lucide-react';
import { Modal, Button } from '../common';

interface QRCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    zoneName: string;
    siteName: string;
    zoneId: string;
    zoneCode?: string | null;
}

export default function QRCodeModal({
    isOpen,
    onClose,
    zoneName,
    siteName,
    zoneId,
    zoneCode,
}: QRCodeModalProps) {
    const { t } = useTranslation();
    const qrRef = useRef<HTMLDivElement>(null);

    const handleDownload = () => {
        // Get the SVG element
        const svgElement = qrRef.current?.querySelector('svg');
        if (!svgElement) return;

        // Create a canvas element
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size (increase for better quality)
        const size = 512;
        canvas.width = size;
        canvas.height = size;

        // Create an image from the SVG
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
            // Draw white background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, size, size);

            // Draw the QR code
            ctx.drawImage(img, 0, 0, size, size);

            // Convert canvas to blob and download
            canvas.toBlob((blob) => {
                if (!blob) return;

                const downloadUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');

                // Create meaningful filename
                const sanitizedSiteName = siteName.replace(/[^a-z0-9]/gi, '_');
                const sanitizedZoneName = zoneName.replace(/[^a-z0-9]/gi, '_');
                const filename = `QR_${sanitizedSiteName}_${sanitizedZoneName}.png`;

                link.href = downloadUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Cleanup
                URL.revokeObjectURL(downloadUrl);
            });

            URL.revokeObjectURL(url);
        };

        img.src = url;
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('sites.qrCode', 'Zone QR Code')}
            size="md"
        >
            <div className="flex flex-col items-center gap-6 py-4">
                {/* Site and Zone Info */}
                <div className="text-center space-y-1">
                    <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                        {zoneName}
                    </p>
                    {zoneCode && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {t('sites.code', 'Code')}: {zoneCode}
                        </p>
                    )}
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {siteName}
                    </p>
                </div>

                {/* QR Code */}
                <div
                    ref={qrRef}
                    className="p-6 bg-white rounded-lg shadow-sm border border-neutral-200"
                >
                    <QRCodeSVG
                        value={zoneId}
                        size={256}
                        level="H"
                        includeMargin={false}
                    />
                </div>

                {/* Helper Text */}
                <div className="text-center text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">
                    {t('sites.qrHelp', 'Guards can scan this QR code during patrol to verify checkpoint visits.')}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 w-full pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <Button
                        variant="outline"
                        className="flex-1"
                        leftIcon={<Download size={16} />}
                        onClick={handleDownload}
                    >
                        {t('common.download', 'Download')}
                    </Button>
                    <Button
                        variant="ghost"
                        className="flex-1"
                        leftIcon={<X size={16} />}
                        onClick={onClose}
                    >
                        {t('common.close', 'Close')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

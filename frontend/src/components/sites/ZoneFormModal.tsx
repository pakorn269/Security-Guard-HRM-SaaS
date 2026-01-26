import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { QRCodeSVG } from 'qrcode.react';
import { Modal, Button, Input, Badge } from '../common';
import { sitesService, type Zone } from '../../services/sites.service';

const zoneSchema = z.object({
    name: z.string().min(1, 'Zone name is required'),
    code: z.string().max(50).optional(),
    description: z.string().optional(),
    isActive: z.boolean(),
});

type ZoneFormData = z.infer<typeof zoneSchema>;

interface ZoneFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (zone: Zone) => void;
    zone: Zone | null;
    siteId: string;
    siteName: string;
    existingZoneCodes: string[];
}

export default function ZoneFormModal({
    isOpen,
    onClose,
    onSuccess,
    zone,
    siteId,
    siteName,
    existingZoneCodes,
}: ZoneFormModalProps) {
    const { t } = useTranslation();
    const [qrCodeValue, setQrCodeValue] = useState<string>('');

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<ZoneFormData>({
        resolver: zodResolver(zoneSchema),
        defaultValues: {
            name: '',
            code: '',
            description: '',
            isActive: true,
        },
    });

    const codeValue = watch('code');

    useEffect(() => {
        if (isOpen) {
            if (zone) {
                setValue('name', zone.name);
                setValue('code', zone.code || '');
                setValue('description', zone.description || '');
                setValue('isActive', zone.isActive);
                setQrCodeValue(zone.id); // Use existing zone ID for QR
            } else {
                reset({
                    name: '',
                    code: '',
                    description: '',
                    isActive: true,
                });
                // For new zones, we'll show a placeholder QR with temp value
                setQrCodeValue('temp-zone-qr-preview');
            }
        }
    }, [isOpen, zone, setValue, reset]);

    // Validate zone code uniqueness
    const validateZoneCode = (code: string): boolean => {
        if (!code || code.trim() === '') return true; // Optional field
        const trimmedCode = code.trim();
        // If editing, exclude current zone's code from validation
        const codesToCheck = existingZoneCodes.filter(c => c !== zone?.code);
        return !codesToCheck.includes(trimmedCode);
    };

    const onSubmit = async (data: ZoneFormData) => {
        // Validate zone code uniqueness
        if (data.code && !validateZoneCode(data.code)) {
            alert(t('sites.codeExists', 'Zone code already exists'));
            return;
        }

        try {
            if (zone) {
                // Update existing zone
                const updatedZone = await sitesService.updateZone(zone.id, {
                    name: data.name,
                    code: data.code || undefined,
                    description: data.description || undefined,
                    isActive: data.isActive,
                });
                onSuccess(updatedZone);
            } else {
                // Create new zone
                const newZone = await sitesService.createZone({
                    siteId,
                    name: data.name,
                    code: data.code || undefined,
                    description: data.description || undefined,
                });
                onSuccess(newZone);
            }
        } catch (error) {
            console.error('Failed to save zone:', error);
            alert(t('common.error', 'An error occurred'));
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={zone ? t('sites.editZone', 'Edit Zone') : t('sites.addZone', 'Add New Zone')}
            size="lg"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Site Name Info */}
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {t('sites.site', 'Site')}: <span className="font-medium text-neutral-900 dark:text-white">{siteName}</span>
                    </p>
                </div>

                {/* Zone Form Fields */}
                <div className="space-y-4">
                    <Input
                        label={t('sites.zoneName', 'Zone Name')}
                        placeholder={t('sites.zoneNamePlaceholder', 'e.g., Main Gate, Parking Lot')}
                        {...register('name')}
                        error={errors.name?.message}
                        required
                    />

                    <Input
                        label={t('sites.zoneCode', 'Zone Code')}
                        placeholder={t('sites.zoneCodePlaceholder', 'e.g., Z-001 (optional)')}
                        {...register('code')}
                        error={errors.code?.message}
                        helperText={t('sites.zoneCodeHelp', 'Optional unique identifier for this zone')}
                    />

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            {t('sites.zoneDescription', 'Description')}
                        </label>
                        <textarea
                            {...register('description')}
                            placeholder={t('sites.zoneDescriptionPlaceholder', 'Optional description or notes')}
                            rows={3}
                            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            {...register('isActive')}
                            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-primary-500 focus:ring-primary-500"
                        />
                        <label htmlFor="isActive" className="text-sm text-neutral-700 dark:text-neutral-300">
                            {t('sites.zoneActive', 'Zone is active')}
                        </label>
                    </div>
                </div>

                {/* QR Code Preview Section */}
                {zone && (
                    <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6">
                        <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4">
                            {t('sites.qrCodePreview', 'QR Code Preview')}
                        </h4>
                        <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                            {/* QR Code */}
                            <div className="p-4 bg-white rounded-lg shadow-sm border border-neutral-200">
                                <QRCodeSVG
                                    value={qrCodeValue}
                                    size={128}
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>
                            {/* QR Code Info */}
                            <div className="flex-1 text-center md:text-left">
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                                    {t('sites.qrCodeInfo', 'Guards will scan this QR code during patrol to verify checkpoint visits.')}
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                    {codeValue && (
                                        <Badge variant="neutral">
                                            {t('sites.code', 'Code')}: {codeValue}
                                        </Badge>
                                    )}
                                    <Badge variant="primary">
                                        {t('sites.unique', 'Unique ID')}: {zone.id.substring(0, 8)}...
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* New Zone Note */}
                {!zone && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                            {t('sites.qrGeneratedAfterSave', 'QR code will be generated after saving the zone')}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                    <Button variant="ghost" onClick={onClose} type="button">
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button variant="primary" type="submit" isLoading={isSubmitting}>
                        {zone ? t('common.save', 'Save Changes') : t('common.create', 'Create Zone')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

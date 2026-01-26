import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Pencil, QrCode } from 'lucide-react';
import { Modal, Button, Input, Badge } from '../../components/common';
import { sitesService, type Site, type Zone } from '../../services/sites.service';
import ZoneFormModal from '../../components/sites/ZoneFormModal';
import QRCodeModal from '../../components/sites/QRCodeModal';

const siteSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    address: z.string().optional(),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    radius: z.coerce.number().min(1).default(100),
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
    isActive: z.boolean().default(true),
});

interface SiteFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    site: Site | null;
}

export default function SiteFormModal({ isOpen, onClose, onSuccess, site }: SiteFormModalProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'details' | 'zones'>('details');
    const [zones, setZones] = useState<Zone[]>([]);

    // Zone Form Modal state
    const [isZoneFormOpen, setIsZoneFormOpen] = useState(false);
    const [editingZone, setEditingZone] = useState<Zone | null>(null);

    // QR Code Modal state
    const [isQRModalOpen, setIsQRModalOpen] = useState(false);
    const [selectedZoneForQR, setSelectedZoneForQR] = useState<Zone | null>(null);

    const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(siteSchema),
        defaultValues: {
            name: '',
            address: '',
            radius: 100,
            contactName: '',
            contactPhone: '',
            isActive: true,
            latitude: undefined,
            longitude: undefined
        }
    });

    // Form initialization effect - syncs form values, tab, and zones from site prop
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (isOpen) {
            if (site) {
                setValue('name', site.name);
                setValue('address', site.address || '');
                setValue('radius', site.radius);
                setValue('contactName', site.contactName || '');
                setValue('contactPhone', site.contactPhone || '');
                setValue('isActive', site.isActive);
                setValue('latitude', site.latitude);
                setValue('longitude', site.longitude);
                if (site.zones) setZones(site.zones);
            } else {
                reset({
                    name: '',
                    address: '',
                    radius: 100,
                    contactName: '',
                    contactPhone: '',
                    isActive: true,
                });
                setZones([]);
            }
            setActiveTab('details');
        }
    }, [isOpen, site, setValue, reset]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const onSubmit = async (data: z.infer<typeof siteSchema>) => {
        try {
            if (site) {
                await sitesService.update(site.id, data);
            } else {
                await sitesService.create(data);
            }
            onSuccess();
        } catch (error) {
            console.error('Failed to save site', error);
        }
    };

    const handleAddZone = () => {
        if (!site) return;
        setEditingZone(null);
        setIsZoneFormOpen(true);
    };

    const handleEditZone = (zone: Zone) => {
        setEditingZone(zone);
        setIsZoneFormOpen(true);
    };

    const handleZoneFormSuccess = (zone: Zone) => {
        if (editingZone) {
            // Update existing zone in list
            setZones(zones.map(z => z.id === zone.id ? zone : z));
        } else {
            // Add new zone to list
            setZones([...zones, zone]);
        }
        setIsZoneFormOpen(false);
        setEditingZone(null);
    };

    const handleZoneFormClose = () => {
        setIsZoneFormOpen(false);
        setEditingZone(null);
    };

    const handleDeleteZone = async (zoneId: string) => {
        if (!confirm(t('sites.confirmDeleteZone', 'Are you sure you want to delete this zone?'))) return;
        try {
            await sitesService.deleteZone(zoneId);
            setZones(zones.filter(z => z.id !== zoneId));
        } catch (err) {
            console.error('Failed to delete zone', err);
        }
    };

    const handleShowQRCode = (zone: Zone) => {
        setSelectedZoneForQR(zone);
        setIsQRModalOpen(true);
    };

    const handleCloseQRModal = () => {
        setIsQRModalOpen(false);
        setSelectedZoneForQR(null);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={site ? t('sites.editSite', 'Edit Site') : t('sites.addSite', 'Add New Site')}
            size="lg"
        >
            <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-6">
                <button
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'details' ? 'border-primary-500 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'}`}
                    onClick={() => setActiveTab('details')}
                >
                    {t('common.details', 'Details')}
                </button>
                <button
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'zones' ? 'border-primary-500 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'}`}
                    onClick={() => setActiveTab('zones')}
                    disabled={!site}
                >
                    {t('sites.zones', 'Zones')} {!site && `(${t('common.saveFirst', 'Save first')})`}
                </button>
            </div>

            {activeTab === 'details' ? (
                <form id="site-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        label={t('sites.name', 'Site Name')}
                        {...register('name')}
                        error={errors.name?.message as string}
                        required
                    />
                    <Input
                        label={t('sites.address', 'Address')}
                        {...register('address')}
                        error={errors.address?.message as string}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label={t('sites.contactName', 'Contact Name')}
                            {...register('contactName')}
                        />
                        <Input
                            label={t('sites.contactPhone', 'Contact Phone')}
                            {...register('contactPhone')}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label={t('sites.latitude', 'Latitude')}
                            {...register('latitude')}
                            type="number" step="any"
                        />
                        <Input
                            label={t('sites.longitude', 'Longitude')}
                            {...register('longitude')}
                            type="number" step="any"
                        />
                    </div>
                    <Input
                        label={t('sites.radius', 'Geofence Radius (m)')}
                        {...register('radius')}
                        type="number"
                    />
                </form>
            ) : (
                <div className="space-y-4">
                    {/* Add Zone Button */}
                    <div className="flex justify-end">
                        <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Plus size={16} />}
                            onClick={handleAddZone}
                            disabled={!site}
                        >
                            {t('sites.addZone', 'Add Zone')}
                        </Button>
                    </div>

                    {/* Zones List */}
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {zones.map(zone => (
                            <div key={zone.id} className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-neutral-900 dark:text-white mb-1 truncate">
                                            {zone.name}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                            {zone.code && (
                                                <Badge variant="neutral" className="text-xs">
                                                    {t('sites.code', 'Code')}: {zone.code}
                                                </Badge>
                                            )}
                                            <Badge variant={zone.isActive ? 'success' : 'neutral'} className="text-xs">
                                                {zone.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                                            </Badge>
                                        </div>
                                        {zone.description && (
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 line-clamp-2">
                                                {zone.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => handleShowQRCode(zone)}
                                            className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
                                            title={t('sites.viewQR', 'View QR Code')}
                                        >
                                            <QrCode size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleEditZone(zone)}
                                            className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
                                            title={t('common.edit', 'Edit')}
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteZone(zone.id)}
                                            className="p-1.5 text-error-500 hover:bg-error-50 dark:hover:bg-error-950/30 rounded transition-colors"
                                            title={t('common.delete', 'Delete')}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {zones.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                                    {t('sites.noZones', 'No zones added yet')}
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Plus size={16} />}
                                    onClick={handleAddZone}
                                    disabled={!site}
                                >
                                    {t('sites.addFirstZone', 'Add Your First Zone')}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                <Button variant="ghost" onClick={onClose}>
                    {t('common.cancel', 'Cancel')}
                </Button>
                {activeTab === 'details' && (
                    <Button variant="primary" type="submit" form="site-form" isLoading={isSubmitting}>
                        {site ? t('common.save', 'Save') : t('common.create', 'Create')}
                    </Button>
                )}
            </div>

            {/* Zone Form Modal */}
            {site && (
                <ZoneFormModal
                    isOpen={isZoneFormOpen}
                    onClose={handleZoneFormClose}
                    onSuccess={handleZoneFormSuccess}
                    zone={editingZone}
                    siteId={site.id}
                    siteName={site.name}
                    existingZoneCodes={zones.map(z => z.code || '').filter(Boolean)}
                />
            )}

            {/* QR Code Modal */}
            {selectedZoneForQR && site && (
                <QRCodeModal
                    isOpen={isQRModalOpen}
                    onClose={handleCloseQRModal}
                    zoneName={selectedZoneForQR.name}
                    siteName={site.name}
                    zoneId={selectedZoneForQR.id}
                    zoneCode={selectedZoneForQR.code}
                />
            )}
        </Modal>
    );
}

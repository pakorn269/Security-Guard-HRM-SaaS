import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { Modal, Button, Input } from '../../components/common';
import { sitesService, type Site, type Zone } from '../../services/sites.service';

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
    const [newZoneName, setNewZoneName] = useState('');

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

    useEffect(() => {
        if (isOpen) {
            if (site) {
                setValue('name', site.name);
                setValue('address', site.address || '');
                setValue('radius', site.radius);
                setValue('contactName', site.contactName || '');
                setValue('contactPhone', site.contactPhone || '');
                setValue('isActive', site.isActive);
                setValue('latitude', site.latitude as any);
                setValue('longitude', site.longitude as any);

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

    const onSubmit = async (data: any) => {
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

    const handleAddZone = async () => {
        if (!newZoneName.trim() || !site) return;
        try {
            const zone = await sitesService.createZone({
                siteId: site.id,
                name: newZoneName,
            });
            setZones([...zones, zone]);
            setNewZoneName('');
        } catch (err) {
            console.error('Failed to create zone', err);
        }
    };

    const handleDeleteZone = async (zoneId: string) => {
        if (!confirm('Delete zone?')) return;
        try {
            await sitesService.deleteZone(zoneId);
            setZones(zones.filter(z => z.id !== zoneId));
        } catch (err) {
            console.error('Failed to delete zone', err);
        }
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
                    Details
                </button>
                <button
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'zones' ? 'border-primary-500 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'}`}
                    onClick={() => setActiveTab('zones')}
                    disabled={!site}
                >
                    Zones {!site && '(Save first)'}
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
                    <div className="flex gap-2">
                        <Input
                            placeholder="New Zone Name (e.g. Main Gate)"
                            value={newZoneName}
                            onChange={(e) => setNewZoneName(e.target.value)}
                            className="flex-1"
                        />
                        <Button variant="secondary" onClick={handleAddZone} disabled={!newZoneName}>
                            <Plus size={16} /> Add
                        </Button>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {zones.map(zone => (
                            <div key={zone.id} className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                                <span className="font-medium text-neutral-900 dark:text-white">{zone.name}</span>
                                <div className="flex gap-2">
                                    <button className="text-error-500 hover:text-error-700" onClick={() => handleDeleteZone(zone.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {zones.length === 0 && (
                            <div className="text-center text-neutral-500 py-4">No zones added yet</div>
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
        </Modal>
    );
}

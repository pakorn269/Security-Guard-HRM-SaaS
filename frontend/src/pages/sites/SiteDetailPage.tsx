import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    Pencil,
    MapPin,
    Phone,
    User,
    Shield,
    Layers,
    QrCode,
    Trash2,
} from 'lucide-react';
import { Button, Badge, Card, Skeleton, SkeletonCard } from '../../components/common';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '../../components/navigation';
import { sitesService, type Site, type Zone } from '../../services/sites.service';
import SiteFormModal from './SiteFormModal';
import ZoneFormModal from '../../components/sites/ZoneFormModal';
import QRCodeModal from '../../components/sites/QRCodeModal';

export default function SiteDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [site, setSite] = useState<Site | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Modals state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
    const [editingZone, setEditingZone] = useState<Zone | null>(null);
    const [isQRModalOpen, setIsQRModalOpen] = useState(false);
    const [selectedZoneForQR, setSelectedZoneForQR] = useState<Zone | null>(null);

    const fetchSite = useCallback(async () => {
        if (!id) return;

        setIsLoading(true);
        try {
            const data = await sitesService.getById(id);
            setSite(data);
            setNotFound(false);
        } catch (error) {
            console.error('Failed to fetch site:', error);
            setNotFound(true);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchSite();
    }, [fetchSite]);

    const handleBack = () => {
        navigate('/sites');
    };

    const handleEdit = () => {
        setIsEditModalOpen(true);
    };

    const handleEditSuccess = () => {
        setIsEditModalOpen(false);
        fetchSite();
    };

    const handleEditZone = useCallback((zone: Zone) => {
        setEditingZone(zone);
        setIsZoneModalOpen(true);
    }, []);

    const handleZoneSuccess = () => {
        setIsZoneModalOpen(false);
        setEditingZone(null);
        fetchSite();
    };

    const handleShowQRCode = useCallback((zone: Zone) => {
        setSelectedZoneForQR(zone);
        setIsQRModalOpen(true);
    }, []);

    const handleCloseQRModal = () => {
        setIsQRModalOpen(false);
        setSelectedZoneForQR(null);
    };

    const handleDeleteZone = useCallback(async (zoneId: string, zoneName: string) => {
        if (!confirm(t('sites.confirmDeleteZone', `Delete zone "${zoneName}"?`))) return;
        try {
            await sitesService.deleteZone(zoneId);
            fetchSite();
        } catch (err) {
            console.error('Failed to delete zone', err);
        }
    }, [t, fetchSite]);

    const handleToggleZoneStatus = useCallback(async (zoneId: string, currentStatus: boolean) => {
        try {
            await sitesService.updateZone(zoneId, { isActive: !currentStatus });
            fetchSite();
        } catch (err) {
            console.error('Failed to toggle zone status', err);
        }
    }, [fetchSite]);

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-24 h-10" />
                    <Skeleton className="w-64 h-8" />
                </div>
                <SkeletonCard />
                <SkeletonCard />
            </div>
        );
    }

    // Not found state
    if (notFound || !site) {
        return (
            <div className="text-center py-12">
                <MapPin size={48} className="mx-auto text-neutral-400 mb-4" />
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                    {t('sites.notFound', 'Site not found')}
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                    {t('sites.notFoundDescription', 'The site you are looking for does not exist.')}
                </p>
                <Button variant="primary" onClick={handleBack} leftIcon={<ArrowLeft size={16} />}>
                    {t('common.backToList', 'Back to List')}
                </Button>
            </div>
        );
    }

    const zones = site.zones || [];
    const activeGuardsCount = 0; // Placeholder - will be fetched when employee integration is ready
    const totalZonesCount = zones.length;
    const activeZonesCount = zones.filter(z => z.isActive).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<ArrowLeft size={16} />}
                        onClick={handleBack}
                        className="flex-shrink-0"
                    >
                        {t('common.back', 'Back')}
                    </Button>

                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                                {site.name}
                            </h1>
                            <Badge variant={site.isActive ? 'success' : 'error'}>
                                {site.isActive
                                    ? t('common.active', 'Active')
                                    : t('common.inactive', 'Inactive')}
                            </Badge>
                        </div>
                        {site.address && (
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                                <MapPin size={14} />
                                {site.address}
                            </p>
                        )}
                    </div>
                </div>

                <Button
                    variant="primary"
                    leftIcon={<Pencil size={16} />}
                    onClick={handleEdit}
                >
                    {t('common.edit', 'Edit')}
                </Button>
            </div>

            {/* Tabs */}
            <Tabs activeTab={activeTab} onChange={setActiveTab}>
                <TabList className="mb-6">
                    <Tab value="overview" icon={<MapPin size={16} />}>
                        {t('sites.overview', 'Overview')}
                    </Tab>
                    <Tab value="zones" icon={<Layers size={16} />}>
                        {t('sites.zones', 'Zones')} ({totalZonesCount})
                    </Tab>
                    <Tab value="guards" icon={<Shield size={16} />}>
                        {t('sites.assignedGuards', 'Assigned Guards')} ({activeGuardsCount})
                    </Tab>
                </TabList>

                <TabPanels>
                    {/* Overview Tab */}
                    <TabPanel value="overview">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Stats Card */}
                            <Card>
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                                        {t('sites.statistics', 'Statistics')}
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between py-3 border-b border-neutral-200 dark:border-neutral-700">
                                            <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                                                <Layers size={18} />
                                                <span>{t('sites.totalZones', 'Total Zones')}</span>
                                            </div>
                                            <span className="text-xl font-bold text-neutral-900 dark:text-white">
                                                {totalZonesCount}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between py-3 border-b border-neutral-200 dark:border-neutral-700">
                                            <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                                                <Layers size={18} />
                                                <span>{t('sites.activeZones', 'Active Zones')}</span>
                                            </div>
                                            <span className="text-xl font-bold text-success-600 dark:text-success-400">
                                                {activeZonesCount}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between py-3">
                                            <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                                                <Shield size={18} />
                                                <span>{t('sites.activeGuards', 'Active Guards')}</span>
                                            </div>
                                            <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                                                {activeGuardsCount}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Contact & Location Card */}
                            <Card>
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                                        {t('sites.contactAndLocation', 'Contact & Location')}
                                    </h3>
                                    <div className="space-y-4">
                                        {site.address && (
                                            <div className="flex items-start gap-3">
                                                <MapPin size={18} className="text-neutral-500 dark:text-neutral-400 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                                                        {t('sites.address', 'Address')}
                                                    </p>
                                                    <p className="text-sm text-neutral-900 dark:text-white">
                                                        {site.address}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {site.contactName && (
                                            <div className="flex items-start gap-3">
                                                <User size={18} className="text-neutral-500 dark:text-neutral-400 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                                                        {t('sites.contactPerson', 'Contact Person')}
                                                    </p>
                                                    <p className="text-sm text-neutral-900 dark:text-white">
                                                        {site.contactName}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {site.contactPhone && (
                                            <div className="flex items-start gap-3">
                                                <Phone size={18} className="text-neutral-500 dark:text-neutral-400 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                                                        {t('sites.contactPhone', 'Phone Number')}
                                                    </p>
                                                    <p className="text-sm text-neutral-900 dark:text-white">
                                                        {site.contactPhone}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {site.latitude && site.longitude && (
                                            <div className="flex items-start gap-3">
                                                <MapPin size={18} className="text-neutral-500 dark:text-neutral-400 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                                                        {t('sites.coordinates', 'GPS Coordinates')}
                                                    </p>
                                                    <p className="text-sm text-neutral-900 dark:text-white font-mono">
                                                        {site.latitude.toFixed(6)}, {site.longitude.toFixed(6)}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {site.radius && (
                                            <div className="flex items-start gap-3">
                                                <MapPin size={18} className="text-neutral-500 dark:text-neutral-400 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                                                        {t('sites.geofenceRadius', 'Geofence Radius')}
                                                    </p>
                                                    <p className="text-sm text-neutral-900 dark:text-white">
                                                        {site.radius} {t('sites.meters', 'meters')}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {!site.contactName && !site.contactPhone && !site.address && (
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">
                                                {t('sites.noContactInfo', 'No contact information available')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Card>

                            {/* Map Placeholder - Full width on mobile, 2 columns on desktop */}
                            {site.latitude && site.longitude && (
                                <Card className="lg:col-span-2">
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                                            {t('sites.location', 'Location')}
                                        </h3>
                                        <div className="aspect-video bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                                            <div className="text-center">
                                                <MapPin size={48} className="mx-auto text-neutral-400 mb-2" />
                                                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                                    {t('sites.mapPlaceholder', 'Map integration coming soon')}
                                                </p>
                                                <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-2 font-mono">
                                                    {site.latitude.toFixed(6)}, {site.longitude.toFixed(6)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            )}
                        </div>
                    </TabPanel>

                    {/* Zones Tab */}
                    <TabPanel value="zones">
                        <Card>
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                        {t('sites.allZones', 'All Zones')} ({totalZonesCount})
                                    </h3>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        leftIcon={<Layers size={14} />}
                                        onClick={() => setIsZoneModalOpen(true)}
                                    >
                                        {t('sites.addZone', 'Add Zone')}
                                    </Button>
                                </div>

                                {zones.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Layers size={48} className="mx-auto text-neutral-400 mb-4" />
                                        <p className="text-neutral-600 dark:text-neutral-400">
                                            {t('sites.noZones', 'No zones created yet')}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {zones.map((zone) => (
                                            <div
                                                key={zone.id}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h4 className="font-medium text-neutral-900 dark:text-white truncate">
                                                            {zone.name}
                                                        </h4>
                                                        {zone.code && (
                                                            <Badge variant="neutral" size="sm">
                                                                {zone.code}
                                                            </Badge>
                                                        )}
                                                        <button
                                                            onClick={() => handleToggleZoneStatus(zone.id, zone.isActive)}
                                                            className="transition-opacity hover:opacity-80"
                                                            title={t('sites.clickToToggleStatus', 'Click to toggle status')}
                                                        >
                                                            <Badge
                                                                variant={zone.isActive ? 'success' : 'error'}
                                                                size="sm"
                                                            >
                                                                {zone.isActive
                                                                    ? t('common.active', 'Active')
                                                                    : t('common.inactive', 'Inactive')}
                                                            </Badge>
                                                        </button>
                                                    </div>
                                                    {zone.description && (
                                                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                                            {zone.description}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        leftIcon={<QrCode size={14} />}
                                                        onClick={() => handleShowQRCode(zone)}
                                                    >
                                                        {t('sites.qrCode', 'QR Code')}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        leftIcon={<Pencil size={14} />}
                                                        onClick={() => handleEditZone(zone)}
                                                    >
                                                        {t('common.edit', 'Edit')}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        leftIcon={<Trash2 size={14} />}
                                                        onClick={() => handleDeleteZone(zone.id, zone.name)}
                                                        className="text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300"
                                                    >
                                                        {t('common.delete', 'Delete')}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>
                    </TabPanel>

                    {/* Assigned Guards Tab */}
                    <TabPanel value="guards">
                        <Card>
                            <div className="p-6">
                                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
                                    {t('sites.guardsAssignedToSite', 'Guards Assigned to This Site')}
                                </h3>
                                <div className="text-center py-12">
                                    <Shield size={48} className="mx-auto text-neutral-400 mb-4" />
                                    <p className="text-neutral-600 dark:text-neutral-400 mb-2">
                                        {t('sites.guardsComingSoon', 'Guard assignment feature coming soon')}
                                    </p>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-500">
                                        {t('sites.guardsDescription', 'You will be able to view and manage guards assigned to this site.')}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </TabPanel>
                </TabPanels>
            </Tabs>

            {/* Modals */}
            <SiteFormModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={handleEditSuccess}
                site={site}
            />

            {isZoneModalOpen && (
                <ZoneFormModal
                    isOpen={isZoneModalOpen}
                    onClose={() => {
                        setIsZoneModalOpen(false);
                        setEditingZone(null);
                    }}
                    onSuccess={handleZoneSuccess}
                    siteId={site.id}
                    siteName={site.name}
                    zone={editingZone}
                    existingZoneCodes={zones.map(z => z.code || '').filter(Boolean)}
                />
            )}

            {selectedZoneForQR && (
                <QRCodeModal
                    isOpen={isQRModalOpen}
                    onClose={handleCloseQRModal}
                    zoneName={selectedZoneForQR.name}
                    siteName={site.name}
                    zoneId={selectedZoneForQR.id}
                    zoneCode={selectedZoneForQR.code}
                />
            )}
        </div>
    );
}

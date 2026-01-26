import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    MapPin,
    UserPlus,
    ShieldCheck,
    ChevronDown,
    ChevronRight,
    QrCode
} from 'lucide-react';
import { Button, Badge, Card } from '../../components/common';
import { PageHeader } from '../../components/layout';
import { DataTable, type ColumnDef } from '../../components/data-display';
import { SearchInput } from '../../components/forms';
import { Menu, MenuItem, MenuDivider } from '../../components/navigation';
import { sitesService, type Site, type Zone } from '../../services/sites.service';
import SiteFormModal from './SiteFormModal';
import AssignGuardsModal from './AssignGuardsModal';
import QRCodeModal from '../../components/sites/QRCodeModal';
import InlineZoneForm from '../../components/sites/InlineZoneForm';

export default function SitesPage() {
    const { t } = useTranslation();

    const [sites, setSites] = useState<Site[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSite, setEditingSite] = useState<Site | null>(null);

    // Assign Guards Modal state
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [selectedSiteForAssign, setSelectedSiteForAssign] = useState<Site | null>(null);

    // Expandable rows state
    const [expandedSiteIds, setExpandedSiteIds] = useState<Set<string>>(new Set());

    // Inline zone form state - tracks which site has inline form open
    const [inlineFormOpenForSiteId, setInlineFormOpenForSiteId] = useState<string | null>(null);

    const toggleExpand = useCallback((siteId: string) => {
        setExpandedSiteIds(prev => {
            const newExpanded = new Set(prev);
            if (newExpanded.has(siteId)) {
                newExpanded.delete(siteId);
            } else {
                newExpanded.add(siteId);
            }
            return newExpanded;
        });
    }, []);

    // QR Code Modal state
    const [isQRModalOpen, setIsQRModalOpen] = useState(false);
    const [selectedZoneForQR, setSelectedZoneForQR] = useState<{
        zone: Zone;
        siteName: string;
    } | null>(null);

    const handleShowQRCode = useCallback((zone: Zone, siteName: string) => {
        setSelectedZoneForQR({ zone, siteName });
        setIsQRModalOpen(true);
    }, []);

    const handleCloseQRModal = useCallback(() => {
        setIsQRModalOpen(false);
        setSelectedZoneForQR(null);
    }, []);

    // Inline zone management handlers
    const handleToggleInlineForm = useCallback((siteId: string) => {
        setInlineFormOpenForSiteId(prev => prev === siteId ? null : siteId);
    }, []);

    const handleInlineZoneSuccess = useCallback((newZone: Zone) => {
        // Optimistically update local state
        setSites(prevSites =>
            prevSites.map(site => {
                if (site.id === newZone.siteId) {
                    return {
                        ...site,
                        zones: [...(site.zones || []), newZone]
                    };
                }
                return site;
            })
        );
        // Keep form open for adding more zones
    }, []);

    const handleToggleZoneStatus = useCallback(async (zoneId: string, currentStatus: boolean) => {
        try {
            await sitesService.updateZone(zoneId, { isActive: !currentStatus });
            // Optimistically update local state
            setSites(prevSites =>
                prevSites.map(site => ({
                    ...site,
                    zones: site.zones?.map(zone =>
                        zone.id === zoneId ? { ...zone, isActive: !currentStatus } : zone
                    )
                }))
            );
        } catch (err) {
            console.error('Failed to toggle zone status', err);
            // Optionally show error toast
        }
    }, []);

    const handleQuickDeleteZone = useCallback(async (zoneId: string, zoneName: string) => {
        if (!confirm(t('sites.confirmDeleteZone', `Delete zone "${zoneName}"?`))) return;
        try {
            await sitesService.deleteZone(zoneId);
            // Optimistically update local state
            setSites(prevSites =>
                prevSites.map(site => ({
                    ...site,
                    zones: site.zones?.filter(zone => zone.id !== zoneId)
                }))
            );
        } catch (err) {
            console.error('Failed to delete zone', err);
            // Optionally show error toast
        }
    }, [t]);

    const fetchSites = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await sitesService.list();
            setSites(data);
        } catch (error) {
            console.error('Failed to fetch sites:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSites();
    }, [fetchSites]);

    const handleAddSite = () => {
        setEditingSite(null);
        setIsFormOpen(true);
    };

    const handleEditSite = useCallback((site: Site) => {
        setEditingSite(site);
        setIsFormOpen(true);
    }, []);

    const handleAssignGuards = useCallback((site: Site) => {
        setSelectedSiteForAssign(site);
        setIsAssignOpen(true);
    }, []);

    const handleAssignSuccess = () => {
        setIsAssignOpen(false);
        setSelectedSiteForAssign(null);
        // Optionally refresh or show success toast
    };

    const handleDeleteSite = useCallback(async (id: string) => {
        if (!confirm(t('common.confirmDelete', 'Are you sure you want to delete this site?'))) return;
        try {
            await sitesService.delete(id);
            fetchSites();
        } catch (err) {
            console.error('Failed to delete site', err);
        }
    }, [t, fetchSites]);

    const handleFormClose = () => {
        setIsFormOpen(false);
        setEditingSite(null);
    };

    const handleFormSuccess = () => {
        setIsFormOpen(false);
        setEditingSite(null);
        fetchSites();
    };

    const filteredSites = sites.filter(site => {
        const matchesSearch = site.name.toLowerCase().includes(search.toLowerCase()) ||
            site.address?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && site.isActive) ||
            (statusFilter === 'inactive' && !site.isActive);
        return matchesSearch && matchesStatus;
    });

    // Render expanded zones for a site
    const renderZonesSubComponent = useCallback((site: Site) => {
        const hasZones = site.zones && site.zones.length > 0;
        const showInlineForm = inlineFormOpenForSiteId === site.id;
        const existingZoneCodes = site.zones?.map(z => z.code || '').filter(Boolean) || [];

        return (
            <div className="space-y-3">
                {/* Zones List */}
                {hasZones && (
                    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-900">
                        <div className="bg-neutral-50 dark:bg-neutral-800 px-4 py-2 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                {t('sites.zones', 'Zones')} ({site.zones?.length || 0})
                            </h4>
                            <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<Plus size={14} />}
                                onClick={() => handleToggleInlineForm(site.id)}
                            >
                                {showInlineForm ? t('common.cancel', 'Cancel') : t('sites.quickAdd', 'Quick Add')}
                            </Button>
                        </div>
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {site.zones?.map(zone => (
                                <div key={zone.id} className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-neutral-900 dark:text-white">{zone.name}</p>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                            {zone.code && <span>Code: {zone.code}</span>}
                                            {zone.description && <span className="truncate max-w-[300px]">{zone.description}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* Quick Actions */}
                                        <button
                                            onClick={() => handleShowQRCode(zone, site.name)}
                                            className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
                                            title={t('sites.viewQR', 'View QR Code')}
                                        >
                                            <QrCode size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleEditSite(site)}
                                            className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors opacity-0 group-hover:opacity-100"
                                            title={t('common.edit', 'Edit')}
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        {/* Status Toggle Badge */}
                                        <button
                                            onClick={() => handleToggleZoneStatus(zone.id, zone.isActive)}
                                            className="transition-opacity"
                                            title={zone.isActive ? t('sites.deactivate', 'Deactivate') : t('sites.activate', 'Activate')}
                                        >
                                            <Badge variant={zone.isActive ? 'success' : 'neutral'} className="cursor-pointer hover:opacity-80">
                                                {zone.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                                            </Badge>
                                        </button>
                                        {/* Quick Delete */}
                                        <button
                                            onClick={() => handleQuickDeleteZone(zone.id, zone.name)}
                                            className="p-1.5 text-error-500 hover:bg-error-50 dark:hover:bg-error-950/30 rounded transition-colors opacity-0 group-hover:opacity-100"
                                            title={t('common.delete', 'Delete')}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Inline Zone Form */}
                {showInlineForm && (
                    <InlineZoneForm
                        siteId={site.id}
                        existingZoneCodes={existingZoneCodes}
                        onSuccess={handleInlineZoneSuccess}
                        onCancel={() => setInlineFormOpenForSiteId(null)}
                    />
                )}

                {/* Empty State with Quick Add Button */}
                {!hasZones && !showInlineForm && (
                    <div className="text-center py-8 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                            {t('sites.noZones', 'No zones added yet')}
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Plus size={14} />}
                            onClick={() => handleToggleInlineForm(site.id)}
                        >
                            {t('sites.addFirstZone', 'Add Your First Zone')}
                        </Button>
                    </div>
                )}

                {/* Empty State with Inline Form Open */}
                {!hasZones && showInlineForm && (
                    <InlineZoneForm
                        siteId={site.id}
                        existingZoneCodes={existingZoneCodes}
                        onSuccess={handleInlineZoneSuccess}
                        onCancel={() => setInlineFormOpenForSiteId(null)}
                    />
                )}
            </div>
        );
    }, [t, inlineFormOpenForSiteId, handleShowQRCode, handleToggleInlineForm, handleInlineZoneSuccess, handleToggleZoneStatus, handleQuickDeleteZone, handleEditSite]);

    // Custom mobile card renderer with expandable zones
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const renderMobileCard = useCallback((site: Site, _index: number) => {
        const isExpanded = expandedSiteIds.has(site.id);
        const hasZones = site.zones && site.zones.length > 0;

        return (
            <div className={`p-4 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 ${!site.isActive ? 'opacity-60' : ''}`}>
                {/* Site name with expand button */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                        {hasZones && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(site.id);
                                }}
                                className="mt-1 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
                                aria-label={isExpanded ? 'Collapse zones' : 'Expand zones'}
                            >
                                {isExpanded ? (
                                    <ChevronDown size={16} className="text-neutral-600 dark:text-neutral-400" />
                                ) : (
                                    <ChevronRight size={16} className="text-neutral-600 dark:text-neutral-400" />
                                )}
                            </button>
                        )}
                        <div className={`w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 ${!hasZones ? 'ml-7' : ''}`}>
                            <MapPin size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-neutral-900 dark:text-white mb-1 truncate">{site.name}</p>
                            <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                                <ShieldCheck size={12} />
                                {t('sites.zones', 'Zones')}: {site.zones?.length || 0}
                            </div>
                        </div>
                    </div>
                    {/* Actions menu */}
                    <Menu
                        trigger={
                            <button className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0">
                                <MoreHorizontal size={16} className="text-neutral-500" />
                            </button>
                        }
                        placement="bottom-end"
                    >
                        <MenuItem icon={<Pencil size={16} />} onClick={() => handleEditSite(site)}>
                            {t('common.edit', 'Edit')}
                        </MenuItem>
                        <MenuItem icon={<UserPlus size={16} />} onClick={() => handleAssignGuards(site)}>
                            {t('sites.assignGuards', 'Assign Guards')}
                        </MenuItem>
                        <MenuDivider />
                        <MenuItem icon={<Trash2 size={16} />} destructive onClick={() => handleDeleteSite(site.id)}>
                            {t('common.delete', 'Delete')}
                        </MenuItem>
                    </Menu>
                </div>

                {/* Site details */}
                <div className="space-y-1.5 text-sm mb-3">
                    {site.address && (
                        <div className="flex items-start gap-2">
                            <span className="text-neutral-500 dark:text-neutral-400 text-xs shrink-0">Address:</span>
                            <span className="text-neutral-700 dark:text-neutral-300">{site.address}</span>
                        </div>
                    )}
                    {(site.contactName || site.contactPhone) && (
                        <div className="flex items-start gap-2">
                            <span className="text-neutral-500 dark:text-neutral-400 text-xs shrink-0">Contact:</span>
                            <span className="text-neutral-700 dark:text-neutral-300">
                                {site.contactName} {site.contactPhone && `(${site.contactPhone})`}
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <span className="text-neutral-500 dark:text-neutral-400 text-xs">Status:</span>
                        <Badge variant={site.isActive ? 'success' : 'neutral'}>
                            {site.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                        </Badge>
                    </div>
                </div>

                {/* Expanded zones */}
                {isExpanded && hasZones && (
                    <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                                {t('sites.zones', 'Zones')} ({site.zones?.length || 0})
                            </p>
                            <button
                                onClick={() => handleToggleInlineForm(site.id)}
                                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                            >
                                {inlineFormOpenForSiteId === site.id ? t('common.cancel', 'Cancel') : t('sites.quickAdd', 'Quick Add')}
                            </button>
                        </div>

                        {/* Zones List */}
                        <div className="space-y-2 mb-3">
                            {site.zones?.map(zone => (
                                <div key={zone.id} className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-neutral-900 dark:text-white truncate">{zone.name}</p>
                                            {zone.code && (
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Code: {zone.code}</p>
                                            )}
                                        </div>
                                        {/* Status Toggle Badge */}
                                        <button
                                            onClick={() => handleToggleZoneStatus(zone.id, zone.isActive)}
                                            className="shrink-0"
                                        >
                                            <Badge variant={zone.isActive ? 'success' : 'neutral'} className="cursor-pointer">
                                                {zone.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                                            </Badge>
                                        </button>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleShowQRCode(zone, site.name)}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-primary-600 dark:text-primary-400 bg-white dark:bg-neutral-900 border border-primary-200 dark:border-primary-800 rounded hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors"
                                        >
                                            <QrCode size={14} />
                                            {t('sites.qr', 'QR')}
                                        </button>
                                        <button
                                            onClick={() => handleQuickDeleteZone(zone.id, zone.name)}
                                            className="px-3 py-2 text-xs font-medium text-error-600 dark:text-error-400 bg-white dark:bg-neutral-900 border border-error-200 dark:border-error-800 rounded hover:bg-error-50 dark:hover:bg-error-950/30 transition-colors"
                                            title={t('common.delete', 'Delete')}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Inline Zone Form */}
                        {inlineFormOpenForSiteId === site.id && (
                            <InlineZoneForm
                                siteId={site.id}
                                existingZoneCodes={site.zones?.map(z => z.code || '').filter(Boolean) || []}
                                onSuccess={handleInlineZoneSuccess}
                                onCancel={() => setInlineFormOpenForSiteId(null)}
                            />
                        )}
                    </div>
                )}
            </div>
        );
    }, [expandedSiteIds, inlineFormOpenForSiteId, t, toggleExpand, handleEditSite, handleAssignGuards, handleDeleteSite, handleShowQRCode, handleToggleInlineForm, handleToggleZoneStatus, handleQuickDeleteZone, handleInlineZoneSuccess]);

    const columns: ColumnDef<Site>[] = [
        {
            id: 'name',
            header: t('sites.name', 'Site Name'),
            accessorKey: 'name',
            cell: (site) => {
                const isExpanded = expandedSiteIds.has(site.id);
                const hasZones = site.zones && site.zones.length > 0;

                return (
                    <div className={`flex items-start gap-2 ${!site.isActive ? 'opacity-60' : ''}`}>
                        {/* Expand/Collapse button */}
                        {hasZones && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(site.id);
                                }}
                                className="mt-1 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                aria-label={isExpanded ? 'Collapse zones' : 'Expand zones'}
                            >
                                {isExpanded ? (
                                    <ChevronDown size={16} className="text-neutral-600 dark:text-neutral-400" />
                                ) : (
                                    <ChevronRight size={16} className="text-neutral-600 dark:text-neutral-400" />
                                )}
                            </button>
                        )}
                        {/* Site icon */}
                        <div className={`w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 mt-1 ${!hasZones ? 'ml-7' : ''}`}>
                            <MapPin size={20} />
                        </div>
                        {/* Site info */}
                        <div>
                            <p className="font-medium text-neutral-900 dark:text-white mb-1">{site.name}</p>
                            <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                                <ShieldCheck size={12} />
                                {t('sites.zones', 'Zones')}: {site.zones?.length || 0}
                            </div>
                        </div>
                    </div>
                );
            }
        },
        {
            id: 'address',
            header: t('sites.address', 'Address'),
            accessorKey: 'address',
            cell: (site) => <span className="text-neutral-600 dark:text-neutral-300 truncate max-w-[300px] block">{site.address || '-'}</span>
        },
        {
            id: 'contact',
            header: t('sites.contact', 'Contact'),
            cell: (site) => (
                <div>
                    <p className="text-sm text-neutral-900 dark:text-white">{site.contactName || '-'}</p>
                    <p className="text-xs text-neutral-500">{site.contactPhone}</p>
                </div>
            )
        },
        {
            id: 'status',
            header: t('sites.status', 'Status'),
            cell: (site) => (
                <Badge variant={site.isActive ? 'success' : 'neutral'}>
                    {site.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                </Badge>
            )
        },
        {
            id: 'actions',
            header: '',
            width: '48px',
            align: 'right',
            cell: (site) => (
                <Menu
                    trigger={
                        <button className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                            <MoreHorizontal size={16} className="text-neutral-500" />
                        </button>
                    }
                    placement="bottom-end"
                >
                    <MenuItem icon={<Pencil size={16} />} onClick={() => handleEditSite(site)}>
                        {t('common.edit', 'Edit')}
                    </MenuItem>
                    <MenuItem icon={<UserPlus size={16} />} onClick={() => handleAssignGuards(site)}>
                        {t('sites.assignGuards', 'Assign Guards')}
                    </MenuItem>
                    <MenuDivider />
                    <MenuItem icon={<Trash2 size={16} />} destructive onClick={() => handleDeleteSite(site.id)}>
                        {t('common.delete', 'Delete')}
                    </MenuItem>
                </Menu>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('sites.title', 'Sites Management')}
                description={t('sites.subtitle', 'Manage security locations and zones')}
                actions={
                    <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={handleAddSite}>
                        {t('sites.addSite', 'Add Site')}
                    </Button>
                }
            />

            <Card variant="bordered" padding="md">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <SearchInput
                            value={search}
                            onChange={setSearch}
                            placeholder={t('sites.searchPlaceholder', 'Search sites...')}
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="all">{t('sites.filterAll', 'All Sites')}</option>
                            <option value="active">{t('sites.filterActive', 'Active Only')}</option>
                            <option value="inactive">{t('sites.filterInactive', 'Inactive Only')}</option>
                        </select>
                    </div>
                </div>
            </Card>

            <DataTable
                columns={columns}
                data={filteredSites}
                isLoading={isLoading}
                getRowId={(site) => site.id}
                emptyMessage={t('sites.noSites', 'No sites found')}
                isExpandable={true}
                expandedIds={expandedSiteIds}
                onExpansionChange={setExpandedSiteIds}
                renderSubComponent={renderZonesSubComponent}
                useMobileCards={true}
                mobileCardRenderer={renderMobileCard}
            />

            <SiteFormModal
                isOpen={isFormOpen}
                onClose={handleFormClose}
                onSuccess={handleFormSuccess}
                site={editingSite}
            />

            <AssignGuardsModal
                isOpen={isAssignOpen}
                onClose={() => setIsAssignOpen(false)}
                onSuccess={handleAssignSuccess}
                site={selectedSiteForAssign}
            />

            {selectedZoneForQR && (
                <QRCodeModal
                    isOpen={isQRModalOpen}
                    onClose={handleCloseQRModal}
                    zoneName={selectedZoneForQR.zone.name}
                    siteName={selectedZoneForQR.siteName}
                    zoneId={selectedZoneForQR.zone.id}
                    zoneCode={selectedZoneForQR.zone.code}
                />
            )}
        </div>
    );
}

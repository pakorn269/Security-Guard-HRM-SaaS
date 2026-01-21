import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    MapPin,
    UserPlus,
    ShieldCheck
} from 'lucide-react';
import { Button, Badge, Card } from '../../components/common';
import { PageHeader } from '../../components/layout';
import { DataTable, type ColumnDef } from '../../components/data-display';
import { SearchInput } from '../../components/forms';
import { Menu, MenuItem, MenuDivider } from '../../components/navigation';
import { sitesService, type Site } from '../../services/sites.service';
import SiteFormModal from './SiteFormModal';
import AssignGuardsModal from './AssignGuardsModal';

export default function SitesPage() {
    const { t } = useTranslation();

    const [sites, setSites] = useState<Site[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSite, setEditingSite] = useState<Site | null>(null);

    // Assign Guards Modal state
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [selectedSiteForAssign, setSelectedSiteForAssign] = useState<Site | null>(null);

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

    const handleEditSite = (site: Site) => {
        setEditingSite(site);
        setIsFormOpen(true);
    };

    const handleAssignGuards = (site: Site) => {
        setSelectedSiteForAssign(site);
        setIsAssignOpen(true);
    };

    const handleAssignSuccess = () => {
        setIsAssignOpen(false);
        setSelectedSiteForAssign(null);
        // Optionally refresh or show success toast
    };

    const handleDeleteSite = async (id: string) => {
        if (!confirm(t('common.confirmDelete', 'Are you sure you want to delete this site?'))) return;
        try {
            await sitesService.delete(id);
            fetchSites();
        } catch (err) {
            console.error('Failed to delete site', err);
        }
    };

    const handleFormClose = () => {
        setIsFormOpen(false);
        setEditingSite(null);
    };

    const handleFormSuccess = () => {
        setIsFormOpen(false);
        setEditingSite(null);
        fetchSites();
    };

    const filteredSites = sites.filter(site =>
        site.name.toLowerCase().includes(search.toLowerCase()) ||
        site.address?.toLowerCase().includes(search.toLowerCase())
    );

    const columns: ColumnDef<Site>[] = [
        {
            id: 'name',
            header: t('sites.name', 'Site Name'),
            accessorKey: 'name',
            cell: (site) => (
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 mt-1">
                        <MapPin size={20} />
                    </div>
                    <div>
                        <p className="font-medium text-neutral-900 dark:text-white mb-1">{site.name}</p>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            <div className="flex items-center gap-1 mb-1 font-medium text-neutral-700 dark:text-neutral-300">
                                <ShieldCheck size={12} />
                                Zones ({site.zones?.length || 0})
                            </div>
                            {site.zones && site.zones.length > 0 && (
                                <div className="pl-4 space-y-0.5 border-l-2 border-neutral-200 dark:border-neutral-800 ml-1.5">
                                    {site.zones.slice(0, 3).map(zone => (
                                        <div key={zone.id} className="truncate max-w-[200px] text-neutral-600 dark:text-neutral-400">
                                            {zone.name}
                                        </div>
                                    ))}
                                    {site.zones.length > 3 && (
                                        <div className="text-neutral-400 italic">
                                            +{site.zones.length - 3} more
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
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
                <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder={t('sites.searchPlaceholder', 'Search sites...')}
                />
            </Card>

            <DataTable
                columns={columns}
                data={filteredSites}
                isLoading={isLoading}
                getRowId={(site) => site.id}
                emptyMessage={t('sites.noSites', 'No sites found')}
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
        </div>
    );
}

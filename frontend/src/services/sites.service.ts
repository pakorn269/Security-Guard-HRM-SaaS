import { apiGet, apiPost, apiPut, apiDelete } from './api';

export interface Site {
    id: string;
    companyId: string;
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    radius: number;
    contactName?: string;
    contactPhone?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
    zones?: Zone[];
}

export interface Zone {
    id: string;
    siteId: string;
    companyId: string;
    name: string;
    code?: string;
    description?: string;
    qrCode?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateSiteData {
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    contactName?: string;
    contactPhone?: string;
}

export interface UpdateSiteData extends Partial<CreateSiteData> {
    isActive?: boolean;
}

export interface CreateZoneData {
    siteId: string;
    name: string;
    code?: string;
    description?: string;
    qrCode?: string;
}

export interface UpdateZoneData extends Partial<Omit<CreateZoneData, 'siteId'>> {
    isActive?: boolean;
}

const SITES_BASE = '/sites';

export const sitesService = {
    async list(): Promise<Site[]> {
        const response = await apiGet<{ sites: Site[] }>(SITES_BASE);
        return response.success && response.data ? response.data.sites : [];
    },

    async getById(id: string): Promise<Site> {
        const response = await apiGet<{ site: Site }>(`${SITES_BASE}/${id}`);
        if (response.success && response.data) return response.data.site;
        throw new Error('Failed to get site');
    },

    async create(data: CreateSiteData): Promise<Site> {
        const response = await apiPost<{ site: Site }>(SITES_BASE, data);
        if (response.success && response.data) return response.data.site;
        throw new Error('Failed to create site');
    },

    async update(id: string, data: UpdateSiteData): Promise<Site> {
        const response = await apiPut<{ site: Site }>(`${SITES_BASE}/${id}`, data);
        if (response.success && response.data) return response.data.site;
        throw new Error('Failed to update site');
    },

    async delete(id: string): Promise<void> {
        await apiDelete(`${SITES_BASE}/${id}`);
    },

    // Zones
    async createZone(data: CreateZoneData): Promise<Zone> {
        const response = await apiPost<{ zone: Zone }>(`${SITES_BASE}/zones`, data);
        if (response.success && response.data) return response.data.zone;
        throw new Error('Failed to create zone');
    },

    async updateZone(id: string, data: UpdateZoneData): Promise<Zone> {
        const response = await apiPut<{ zone: Zone }>(`${SITES_BASE}/zones/${id}`, data);
        if (response.success && response.data) return response.data.zone;
        throw new Error('Failed to update zone');
    },

    async deleteZone(id: string): Promise<void> {
        await apiDelete(`${SITES_BASE}/zones/${id}`);
    }
};

export default sitesService;

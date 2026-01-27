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

export interface SiteQueryParams {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    status?: 'active' | 'inactive' | 'all';
}

export interface PaginationMeta {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface PaginatedSitesResponse {
    data: Site[];
    meta: PaginationMeta;
}

const SITES_BASE = '/sites';

export const sitesService = {
    async list(params: SiteQueryParams = {}): Promise<PaginatedSitesResponse> {
        const queryString = new URLSearchParams(
            Object.entries(params).reduce((acc, [key, value]) => {
                if (value !== undefined && value !== '') {
                    acc[key] = String(value);
                }
                return acc;
            }, {} as Record<string, string>)
        ).toString();

        const url = queryString ? `${SITES_BASE}?${queryString}` : SITES_BASE;
        const response = await apiGet<PaginatedSitesResponse>(url);

        if (response.success && response.data) {
            return response.data;
        }

        // Fallback for backward compatibility
        return {
            data: [],
            meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 }
        };
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

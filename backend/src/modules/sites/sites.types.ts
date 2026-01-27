export interface Site {
    id: string;
    companyId: string;
    name: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    radius: number;
    contactName?: string | null;
    contactPhone?: string | null;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface Zone {
    id: string;
    siteId: string;
    companyId: string;
    name: string;
    code?: string | null;
    description?: string | null;
    qrCode?: string | null;
    isActive: boolean;
    displayOrder?: number | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface SiteWithZones extends Site {
    zones: Zone[];
}

export interface CreateSiteInput {
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    contactName?: string;
    contactPhone?: string;
}

export interface UpdateSiteInput {
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    contactName?: string;
    contactPhone?: string;
    isActive?: boolean;
}

export interface CreateZoneInput {
    siteId: string;
    name: string;
    code?: string;
    description?: string;
    qrCode?: string;
}

export interface UpdateZoneInput {
    name?: string;
    code?: string;
    description?: string;
    qrCode?: string;
    isActive?: boolean;
    displayOrder?: number;
}

export interface ZoneOrderItem {
    id: string;
    displayOrder: number;
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
    data: SiteWithZones[];
    meta: PaginationMeta;
}

// Attendance Validation Types
export interface GeofenceValidationResult {
    isInside: boolean;
    distance: number;
    siteId: string;
    siteName: string;
}

export interface ZoneValidationResult {
    zone: Zone;
    site: {
        id: string;
        name: string;
    };
}

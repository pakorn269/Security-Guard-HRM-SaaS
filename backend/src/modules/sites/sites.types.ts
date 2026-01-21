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
}

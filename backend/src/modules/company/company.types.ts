// Company module types

export interface Company {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    email?: string;
    licenseNumber?: string;
    licenseIssuedAt?: string;
    licenseExpiresAt?: string;
    settings: CompanySettings;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CompanySettings {
    timezone: string;
    lateThresholdMinutes: number;
    earlyLeaveThresholdMinutes: number;
    clockInBeforeShiftMinutes: number;
    leaveResetMonth: number;
    defaultLanguage: 'th' | 'en';
    allowClockInOutsideGeofence?: boolean;
    geofenceRadiusMeters?: number;
}

export interface CreateCompanyRequest {
    name: string;
    slug?: string;
    address?: string;
    phone?: string;
    email?: string;
    licenseNumber?: string;
    licenseIssuedAt?: string;
    licenseExpiresAt?: string;
}

export interface UpdateCompanyRequest {
    name?: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    logoUrl?: string | null;
    licenseNumber?: string | null;
    licenseIssuedAt?: string | null;
    licenseExpiresAt?: string | null;
}

export interface UpdateCompanySettingsRequest {
    timezone?: string;
    lateThresholdMinutes?: number;
    earlyLeaveThresholdMinutes?: number;
    clockInBeforeShiftMinutes?: number;
    leaveResetMonth?: number;
    defaultLanguage?: 'th' | 'en';
    allowClockInOutsideGeofence?: boolean;
    geofenceRadiusMeters?: number;
}

// Database row type (snake_case)
export interface CompanyRow {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    address?: string;
    phone?: string;
    email?: string;
    license_number?: string;
    license_issued_at?: string;
    license_expires_at?: string;
    settings: {
        timezone: string;
        late_threshold_minutes: number;
        early_leave_threshold_minutes: number;
        clock_in_before_shift_minutes: number;
        leave_reset_month: number;
        default_language: string;
        allow_clock_in_outside_geofence?: boolean;
        geofence_radius_meters?: number;
    };
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

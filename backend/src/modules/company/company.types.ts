// Company module types

export interface Company {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    email?: string;
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
}

export interface CreateCompanyRequest {
    name: string;
    slug?: string;
    address?: string;
    phone?: string;
    email?: string;
}

export interface UpdateCompanyRequest {
    name?: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    logoUrl?: string | null;
}

export interface UpdateCompanySettingsRequest {
    timezone?: string;
    lateThresholdMinutes?: number;
    earlyLeaveThresholdMinutes?: number;
    clockInBeforeShiftMinutes?: number;
    leaveResetMonth?: number;
    defaultLanguage?: 'th' | 'en';
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
    settings: {
        timezone: string;
        late_threshold_minutes: number;
        early_leave_threshold_minutes: number;
        clock_in_before_shift_minutes: number;
        leave_reset_month: number;
        default_language: string;
    };
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

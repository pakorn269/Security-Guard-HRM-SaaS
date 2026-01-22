export interface CompanySettings {
    timezone: string;
    lateThresholdMinutes: number;
    earlyLeaveThresholdMinutes: number;
    clockInBeforeShiftMinutes: number;
    leaveResetMonth: number;
    defaultLanguage: 'th' | 'en';
}

export interface PublicCompanyInfo {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    settings: {
        defaultLanguage: 'th' | 'en';
    };
}

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

export interface UpdateCompanySettingsRequest {
    timezone?: string;
    lateThresholdMinutes?: number;
    earlyLeaveThresholdMinutes?: number;
    clockInBeforeShiftMinutes?: number;
    leaveResetMonth?: number;
    defaultLanguage?: 'th' | 'en';
}

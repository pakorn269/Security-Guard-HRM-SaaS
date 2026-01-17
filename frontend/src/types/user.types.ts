export type UserRole = 'super_admin' | 'company_admin' | 'manager' | 'guard';

export interface User {
    id: string;
    companyId: string;
    employeeId?: string;
    email: string;
    role: UserRole;
    lineUserId?: string;
    lineDisplayName?: string;
    linePictureUrl?: string;
    isActive: boolean;
    language: 'th' | 'en';
    lastLoginAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AuthState {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

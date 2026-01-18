// Auth types for frontend

export interface AuthUser {
    id: string;
    email: string;
    role: 'super_admin' | 'company_admin' | 'manager' | 'guard';
    companyId: string;
    employeeId?: string;
    lineUserId?: string;
    lineDisplayName?: string;
    linePictureUrl?: string;
    language: string;
    isActive: boolean;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    companyName: string;
    fullName: string;
    phone?: string;
}

export interface LoginResponse {
    user: AuthUser;
    tokens: TokenPair;
}

export interface RegisterResponse {
    user: AuthUser;
    company: {
        id: string;
        name: string;
        slug: string;
    };
    tokens: TokenPair;
}

export interface AuthState {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

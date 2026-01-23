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
    hasPin?: boolean;
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

export interface PhoneLoginCredentials {
    companySlug: string;
    phone: string;
    pin: string;
    turnstileToken?: string;
}

export interface SetPinData {
    currentPin?: string;
    newPin: string;
    resetToken?: string;
}

export interface ForgotPinData {
    companySlug: string;
    phone: string;
    turnstileToken?: string;
}

export interface VerifyResetCodeData {
    companySlug: string;
    phone: string;
    code: string;
}

export interface VerifyResetCodeResponse {
    user: AuthUser;
    tokens: TokenPair;
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

// First-time PIN setup (for users whose PIN was reset by admin)
export interface SetupPinData {
    companySlug: string;
    phone: string;
    newPin: string;
}


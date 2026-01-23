// Auth module types

export interface RegisterRequest {
    email: string;
    password: string;
    companyName: string;
    companySlug?: string;
    fullName: string;
    phone?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface PhoneLoginRequest {
    companySlug: string;
    phone: string;
    pin: string;
    turnstileToken?: string;
}

export interface SetPinRequest {
    currentPin?: string;
    newPin: string;
    resetToken?: string;
}

export interface ForgotPinRequest {
    companySlug: string;
    phone: string;
    turnstileToken?: string;
}

export interface VerifyResetCodeRequest {
    companySlug: string;
    phone: string;
    code: string;
}

export interface LineLoginRequest {
    idToken: string;
    liffId: string;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

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
    hasPin: boolean;
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

export interface LoginResponse {
    user: AuthUser;
    tokens: TokenPair;
}

export interface RefreshResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

// LINE ID Token payload (decoded)
export interface LineIdTokenPayload {
    iss: string;
    sub: string; // LINE user ID
    aud: string; // Channel ID
    exp: number;
    iat: number;
    name?: string;
    picture?: string;
    email?: string;
}

// ============================================================
// LIFF Account Linking Types
// ============================================================

// LINE verify request
export interface LineVerifyRequest {
    idToken: string;
    liffId: string;
}

// LINE verify response (user linked)
export interface LineVerifyLinkedResponse {
    isLinked: true;
    user: AuthUser;
    tokens: TokenPair;
}

// LINE verify response (user not linked)
export interface LineVerifyNotLinkedResponse {
    isLinked: false;
    lineProfile: {
        userId: string;
        displayName: string | null;
        pictureUrl: string | null;
    };
}

export type LineVerifyResponse = LineVerifyLinkedResponse | LineVerifyNotLinkedResponse;

// Link employee request (for guards)
export interface LinkEmployeeRequest {
    idToken: string;
    liffId: string;
    employeeCode: string;
    phone: string;
    companySlug: string;
}

// Link credentials request (for managers/admins)
export interface LinkCredentialsRequest {
    idToken: string;
    liffId: string;
    email: string;
    password: string;
}

// Link response (success)
export interface LinkResponse {
    user: AuthUser;
    tokens: TokenPair;
}

// ============================================================
// PIN Reset Request Types (Hybrid Approach)
// ============================================================

export interface RequestPinResetRequest {
    companySlug: string;
    phone: string;
}

export type PinResetRequestStatus = 'pending' | 'approved' | 'rejected';

export interface PinResetRequest {
    id: string;
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    employeePhone: string;
    companyId: string;
    status: PinResetRequestStatus;
    requestedAt: string;
    resolvedAt?: string;
    resolvedBy?: string;
    notes?: string;
}

// ============================================================
// First-Time PIN Setup Types (Public - for users whose PIN was reset by admin)
// ============================================================

export interface SetupPinRequest {
    companySlug: string;
    phone: string;
    newPin: string;
}


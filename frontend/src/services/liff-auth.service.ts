// LIFF Auth Service
// Handles LIFF-specific authentication including account linking

import api, { setTokens } from './api';
import type { ApiResponse } from './api';
import type { AuthUser, TokenPair, LoginResponse } from '../types/auth';

const AUTH_BASE = '/auth';

// LINE Profile returned when user is not linked
export interface LineProfile {
    userId: string;
    displayName: string | null;
    pictureUrl: string | null;
}

// Verify response types
export interface LineVerifyLinkedResponse {
    isLinked: true;
    user: AuthUser;
    tokens: TokenPair;
}

export interface LineVerifyNotLinkedResponse {
    isLinked: false;
    lineProfile: LineProfile;
}

export type LineVerifyResponse = LineVerifyLinkedResponse | LineVerifyNotLinkedResponse;

// Link employee request (for guards)
export interface LinkEmployeeData {
    idToken: string;
    liffId: string;
    employeeCode: string;
    phone: string;
    companySlug: string;
}

// Link credentials request (for managers/admins)
export interface LinkCredentialsData {
    idToken: string;
    liffId: string;
    email: string;
    password: string;
}

// LIFF Employee Login request (for guards without LINE)
export interface LiffEmployeeLoginData {
    employeeCode: string;
    phone: string;
    password: string;
    companySlug: string;
}

export const liffAuthService = {
    /**
     * Verify LINE token and check if user is already linked
     * Returns user data + tokens if linked, or LINE profile if not linked
     */
    async verifyLineToken(idToken: string, liffId: string): Promise<LineVerifyResponse> {
        const response = await api.post<ApiResponse<LineVerifyResponse>>(
            `${AUTH_BASE}/line/verify`,
            { idToken, liffId }
        );

        if (response.data.success && response.data.data) {
            const data = response.data.data;

            // If linked, store tokens
            if (data.isLinked && data.tokens) {
                setTokens(data.tokens.accessToken, data.tokens.refreshToken);
            }

            return data;
        }

        throw new Error(response.data.error?.message || 'Failed to verify LINE token');
    },

    /**
     * Link LINE account to employee via employee code + phone
     * Used by guards during first-time LIFF access
     */
    async linkEmployee(data: LinkEmployeeData): Promise<LoginResponse> {
        const response = await api.post<ApiResponse<LoginResponse>>(
            `${AUTH_BASE}/line/link-employee`,
            data
        );

        if (response.data.success && response.data.data) {
            const { tokens } = response.data.data;
            setTokens(tokens.accessToken, tokens.refreshToken);
            return response.data.data;
        }

        throw new Error(response.data.error?.message_th || response.data.error?.message || 'Failed to link employee');
    },

    /**
     * Link LINE account to existing user via email/password
     * Used by managers/admins during first-time LIFF access
     */
    async linkCredentials(data: LinkCredentialsData): Promise<LoginResponse> {
        const response = await api.post<ApiResponse<LoginResponse>>(
            `${AUTH_BASE}/line/link-credentials`,
            data
        );

        if (response.data.success && response.data.data) {
            const { tokens } = response.data.data;
            setTokens(tokens.accessToken, tokens.refreshToken);
            return response.data.data;
        }

        throw new Error(response.data.error?.message_th || response.data.error?.message || 'Failed to link credentials');
    },

    /**
     * Login via employee code + phone + password (without LINE)
     * Used by guards who don't use LINE
     */
    async liffEmployeeLogin(data: LiffEmployeeLoginData): Promise<LoginResponse> {
        const response = await api.post<ApiResponse<LoginResponse>>(
            `${AUTH_BASE}/liff/employee-login`,
            data
        );

        if (response.data.success && response.data.data) {
            const { tokens } = response.data.data;
            setTokens(tokens.accessToken, tokens.refreshToken);
            return response.data.data;
        }

        throw new Error(response.data.error?.message_th || response.data.error?.message || 'เข้าสู่ระบบไม่สำเร็จ');
    },

    /**
     * Unlink LINE account from current user
     * Requires authentication
     */
    async unlinkLine(): Promise<{ message: string; user: AuthUser }> {
        const response = await api.post<ApiResponse<{ message: string; user: AuthUser }>>(
            `${AUTH_BASE}/line/unlink`
        );

        if (response.data.success && response.data.data) {
            return response.data.data;
        }

        throw new Error(response.data.error?.message || 'Failed to unlink LINE account');
    },

    /**
     * Link LINE account to current user
     * Requires authentication
     */
    async linkLine(idToken: string, liffId: string): Promise<AuthUser> {
        const response = await api.post<ApiResponse<AuthUser>>(
            `${AUTH_BASE}/link-line`,
            { idToken, liffId }
        );

        if (response.data.success && response.data.data) {
            return response.data.data;
        }

        throw new Error(response.data.error?.message || 'Failed to link LINE account');
    },
};

export default liffAuthService;


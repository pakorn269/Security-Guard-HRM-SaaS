import api, { setTokens, clearTokens, getAccessToken } from './api';
import type { ApiResponse } from './api';
import type {
    LoginCredentials,
    RegisterData,
    LoginResponse,
    RegisterResponse,
    AuthUser
} from '../types/auth';

const AUTH_BASE = '/auth';

export const authService = {
    /**
     * Register a new company and admin user
     */
    async register(data: RegisterData): Promise<RegisterResponse> {
        const response = await api.post<ApiResponse<RegisterResponse>>(
            `${AUTH_BASE}/register`,
            data
        );

        if (response.data.success && response.data.data) {
            const { tokens } = response.data.data;
            setTokens(tokens.accessToken, tokens.refreshToken);
            return response.data.data;
        }

        throw new Error(response.data.error?.message || 'Registration failed');
    },

    /**
     * Login with email and password
     */
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
        const response = await api.post<ApiResponse<LoginResponse>>(
            `${AUTH_BASE}/login`,
            credentials
        );

        if (response.data.success && response.data.data) {
            const { tokens } = response.data.data;
            setTokens(tokens.accessToken, tokens.refreshToken);
            return response.data.data;
        }

        throw new Error(response.data.error?.message || 'Login failed');
    },

    /**
     * Login with LINE
     */
    async lineLogin(idToken: string, liffId: string): Promise<LoginResponse> {
        const response = await api.post<ApiResponse<LoginResponse>>(
            `${AUTH_BASE}/line`,
            { idToken, liffId }
        );

        if (response.data.success && response.data.data) {
            const { tokens } = response.data.data;
            setTokens(tokens.accessToken, tokens.refreshToken);
            return response.data.data;
        }

        throw new Error(response.data.error?.message || 'LINE login failed');
    },

    /**
     * Logout - clear tokens
     */
    async logout(): Promise<void> {
        try {
            await api.post(`${AUTH_BASE}/logout`);
        } catch {
            // Ignore logout errors
        } finally {
            clearTokens();
        }
    },

    /**
     * Get current authenticated user
     */
    async getCurrentUser(): Promise<AuthUser> {
        const response = await api.get<ApiResponse<AuthUser>>(`${AUTH_BASE}/me`);

        if (response.data.success && response.data.data) {
            return response.data.data;
        }

        throw new Error('Failed to get current user');
    },

    /**
     * Link LINE account to current user
     */
    async linkLine(idToken: string, liffId: string): Promise<AuthUser> {
        const response = await api.post<ApiResponse<AuthUser>>(
            `${AUTH_BASE}/link-line`,
            { idToken, liffId }
        );

        if (response.data.success && response.data.data) {
            return response.data.data;
        }

        throw new Error('Failed to link LINE account');
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return !!getAccessToken();
    },
};

export default authService;

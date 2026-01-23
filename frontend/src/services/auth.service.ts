import api, { setTokens, clearTokens, getAccessToken } from './api';
import type { ApiResponse } from './api';
import type {
    LoginCredentials,
    RegisterData,
    LoginResponse,
    RegisterResponse,
    AuthUser,
    PhoneLoginCredentials,
    SetPinData,
    ForgotPinData,
    VerifyResetCodeData,
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
     * Login with Phone + PIN
     */
    async phoneLogin(credentials: PhoneLoginCredentials): Promise<LoginResponse> {
        try {
            const response = await api.post<ApiResponse<LoginResponse>>(
                `${AUTH_BASE}/login-phone`,
                credentials
            );

            if (response.data.success && response.data.data) {
                const { tokens } = response.data.data;
                setTokens(tokens.accessToken, tokens.refreshToken);
                return response.data.data;
            }

            // Use Thai message if available
            const errorMessage = response.data.error?.message_th || response.data.error?.message || 'Login failed';
            throw new Error(errorMessage);
        } catch (error) {
            // Handle API error which comes as an object with message and message_th
            if (error && typeof error === 'object' && 'message' in error) {
                const apiError = error as { message: string; message_th?: string };
                throw new Error(apiError.message_th || apiError.message);
            }
            throw error;
        }
    },

    /**
     * Set or Change PIN
     */
    async setPin(data: SetPinData): Promise<void> {
        const response = await api.post<ApiResponse<void>>(
            `${AUTH_BASE}/set-pin`,
            data
        );

        if (response.data.success) {
            return;
        }

        throw new Error(response.data.error?.message || 'Failed to set PIN');
    },

    /**
     * Setup PIN (First-time setup for users whose PIN was reset by admin)
     * This is a public endpoint - no authentication required
     */
    async setupPin(data: { companySlug: string; phone: string; newPin: string }): Promise<LoginResponse> {
        try {
            const response = await api.post<ApiResponse<LoginResponse>>(
                `${AUTH_BASE}/setup-pin`,
                data
            );

            if (response.data.success && response.data.data) {
                const { tokens } = response.data.data;
                setTokens(tokens.accessToken, tokens.refreshToken);
                return response.data.data;
            }

            // Extract validation error message
            const errorDetails = response.data.error?.details;
            if (errorDetails && errorDetails.length > 0) {
                // Get the first validation error message (prefer Thai)
                const detail = errorDetails[0];
                throw new Error(detail.message_th || detail.message);
            }

            const errorMessage = response.data.error?.message_th || response.data.error?.message || 'Failed to setup PIN';
            throw new Error(errorMessage);
        } catch (error) {
            // Handle API error which comes as an object with message, message_th, and details
            if (error && typeof error === 'object') {
                const apiError = error as {
                    message: string;
                    message_th?: string;
                    details?: Array<{ field: string; message: string; message_th?: string }>;
                };

                // Check for validation details first
                if (apiError.details && apiError.details.length > 0) {
                    const detail = apiError.details[0];
                    throw new Error(detail.message_th || detail.message);
                }

                if ('message' in error) {
                    throw new Error(apiError.message_th || apiError.message);
                }
            }
            throw error;
        }
    },

    /**
     * Request PIN reset (Forgot PIN)
     */
    async forgotPin(data: ForgotPinData): Promise<string> {
        const response = await api.post<ApiResponse<{ message: string }>>(
            `${AUTH_BASE}/forgot-pin`,
            data
        );

        if (response.data.success) {
            return response.data.data?.message || 'If the phone number exists, a reset code has been sent.';
        }

        throw new Error(response.data.error?.message || 'Failed to request PIN reset');
    },

    /**
     * Verify PIN reset code
     */
    async verifyResetCode(data: VerifyResetCodeData): Promise<LoginResponse> {
        const response = await api.post<ApiResponse<LoginResponse>>(
            `${AUTH_BASE}/verify-reset-code`,
            data
        );

        if (response.data.success && response.data.data) {
            const { tokens } = response.data.data;
            setTokens(tokens.accessToken, tokens.refreshToken);
            return response.data.data;
        }

        throw new Error(response.data.error?.message || 'Verification failed');
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

    /**
     * Change password
     */
    async changePassword(password: string, newPassword: string): Promise<void> {
        const response = await api.post<ApiResponse<void>>(
            `${AUTH_BASE}/password`,
            { oldPassword: password, newPassword }
        );

        if (response.data.success) {
            return;
        }

        throw new Error(response.data.error?.message || 'Failed to change password');
    },

    /**
     * Request PIN reset (Hybrid approach - Guard submits request for admin)
     */
    async requestPinReset(companySlug: string, phone: string): Promise<string> {
        const response = await api.post<ApiResponse<{ message: string; message_th: string }>>(
            `${AUTH_BASE}/request-pin-reset`,
            { companySlug, phone }
        );

        if (response.data.success) {
            return response.data.data?.message_th || response.data.data?.message || 'Request submitted successfully';
        }

        throw new Error(response.data.error?.message || 'Failed to submit request');
    },

    /**
     * Request PIN reset (Authenticated user)
     */
    async requestPinResetMe(): Promise<string> {
        const response = await api.post<ApiResponse<{ message: string; message_th: string }>>(
            `${AUTH_BASE}/me/request-pin-reset`
        );

        if (response.data.success) {
            return response.data.data?.message_th || response.data.data?.message || 'Request submitted successfully';
        }

        throw new Error(response.data.error?.message || 'Failed to submit request');
    },

    /**
     * Get pending PIN reset requests (Admin)
     */
    async getPinResetRequests(): Promise<Array<{
        id: string;
        employeeId: string;
        employeeName: string;
        employeeCode: string;
        employeePhone: string;
        status: string;
        requestedAt: string;
    }>> {
        const response = await api.get<ApiResponse<{
            requests: Array<{
                id: string;
                employeeId: string;
                employeeName: string;
                employeeCode: string;
                employeePhone: string;
                status: string;
                requestedAt: string;
            }>
        }>>(`${AUTH_BASE}/pin-reset-requests`);

        if (response.data.success && response.data.data) {
            return response.data.data.requests;
        }

        throw new Error('Failed to fetch PIN reset requests');
    },

    /**
     * Get pending PIN reset request count (Admin)
     */
    async getPendingPinResetCount(): Promise<number> {
        const response = await api.get<ApiResponse<{ count: number }>>(
            `${AUTH_BASE}/pin-reset-requests/count`
        );

        if (response.data.success && response.data.data) {
            return response.data.data.count;
        }

        return 0;
    },
};

export default authService;


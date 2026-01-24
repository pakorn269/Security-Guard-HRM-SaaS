import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { getLiffHeaders } from '../hooks/useLiff';

// Types for API responses
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
    meta?: {
        page?: number;
        pageSize?: number;
        total?: number;
        totalPages?: number;
        pagination?: {
            page: number;
            pageSize: number;
            total: number;
            totalPages: number;
        };
    };
}

export interface ApiError {
    code: string;
    message: string;
    message_th?: string;
    details?: Array<{
        field: string;
        message: string;
        message_th?: string;
    }>;
}

// Token management
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const getAccessToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setTokens = (accessToken: string, refreshToken: string): void => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearTokens = (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// Create Axios instance
const api: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
    timeout: 60000, // Increase timeout to 60 seconds for cold starts
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - add auth token and LIFF headers
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = getAccessToken();
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add language header
        const language = localStorage.getItem('i18nextLng') || 'th';
        if (config.headers) {
            config.headers['Accept-Language'] = language;
        }

        // Add LIFF context headers if in LIFF environment
        try {
            const liffHeaders = getLiffHeaders();
            if (config.headers && liffHeaders) {
                Object.assign(config.headers, liffHeaders);
            }
        } catch (error) {
            // Ignore LIFF header errors (not in LIFF context)
        }

        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors and token refresh
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiResponse>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // List of auth endpoints that should NOT trigger token refresh on 401
        // These endpoints return 401 for invalid credentials, which is expected behavior
        const authEndpoints = [
            '/auth/login',
            '/auth/login-phone',
            '/auth/register',
            '/auth/line',
            '/auth/line/verify',
            '/auth/line/link-employee',
            '/auth/line/link-credentials',
            '/auth/liff/employee-login',
            '/auth/forgot-pin',
            '/auth/setup-pin',
            '/auth/verify-reset-code',
            '/auth/request-pin-reset',
        ];

        // Check if the request URL is an auth endpoint
        const requestUrl = originalRequest?.url || '';
        const isAuthEndpoint = authEndpoints.some(endpoint => requestUrl.includes(endpoint));

        // Handle 401 Unauthorized - try to refresh token (but NOT for auth endpoints)
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                        }
                        return api(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = getRefreshToken();
                if (!refreshToken) {
                    throw new Error('No refresh token');
                }

                const response = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
                    `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/auth/refresh`,
                    { refreshToken }
                );

                if (response.data.success && response.data.data) {
                    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
                    setTokens(accessToken, newRefreshToken);

                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    }

                    processQueue(null, accessToken);
                    return api(originalRequest);
                }
            } catch (refreshError) {
                processQueue(refreshError as AxiosError, null);
                clearTokens();

                // Check if we're on a LIFF path - redirect to LIFF login instead of web login
                const currentPath = window.location.pathname;
                if (currentPath.startsWith('/liff/')) {
                    // Extract company slug if present (e.g., /liff/security-group/login)
                    const pathParts = currentPath.split('/');
                    if (pathParts.length >= 3 && pathParts[2] !== 'link' && pathParts[2] !== 'schedule' && pathParts[2] !== 'clock' && pathParts[2] !== 'leave' && pathParts[2] !== 'profile') {
                        // This is a company-specific LIFF path, redirect to company login
                        const companySlug = pathParts[2];
                        window.location.href = `/liff/${companySlug}/login`;
                    } else {
                        // Generic LIFF path, redirect to LIFF link page
                        window.location.href = '/liff/link';
                    }
                } else {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // Extract error message
        let apiError: ApiError;

        if (error.response?.data?.error) {
            // Backend returned an error response
            apiError = error.response.data.error;
        } else if (error.code === 'ECONNABORTED') {
            // Request timeout
            apiError = {
                code: 'TIMEOUT_ERROR',
                message: 'Request timeout - server took too long to respond',
                message_th: 'หมดเวลาในการเชื่อมต่อ - เซิร์ฟเวอร์ตอบกลับช้าเกินไป',
            };
        } else if (error.code === 'ERR_NETWORK') {
            // Network error (CORS, no internet, etc.)
            apiError = {
                code: 'NETWORK_ERROR',
                message: `Network error: ${error.message}. Check your internet connection or backend URL (${import.meta.env.VITE_API_BASE_URL})`,
                message_th: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
            };
        } else {
            // Other error
            apiError = {
                code: 'UNKNOWN_ERROR',
                message: error.message || 'An unknown error occurred',
                message_th: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
            };
        }

        return Promise.reject(apiError);
    }
);

export default api;

// Convenience methods
export const apiGet = <T>(url: string, params?: Record<string, unknown>) =>
    api.get<ApiResponse<T>>(url, { params }).then((res) => res.data);

export const apiPost = <T>(url: string, data?: unknown) =>
    api.post<ApiResponse<T>>(url, data).then((res) => res.data);

export const apiPut = <T>(url: string, data?: unknown) =>
    api.put<ApiResponse<T>>(url, data).then((res) => res.data);

export const apiDelete = <T>(url: string) =>
    api.delete<ApiResponse<T>>(url).then((res) => res.data);

export const apiPatch = <T>(url: string, data?: unknown) =>
    api.patch<ApiResponse<T>>(url, data).then((res) => res.data);

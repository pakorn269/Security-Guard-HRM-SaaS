import { apiGet, apiPost } from './api';

// ============================================================
// TYPES - Link Management
// ============================================================

export type LineLinkRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
export type LineLinkRequestType = 'link' | 'unlink';
export type LineLoginStatus = 'linked' | 'pending' | 'auto_linked' | 'no_match' | 'already_linked';

export interface LineLinkRequest {
    id: string;
    requestType: LineLinkRequestType;
    lineUserId: string;
    lineDisplayName: string | null;
    linePictureUrl: string | null;
    employeeId: string;
    employeeName: string | null;
    employeeCode: string | null;
    companyId: string;
    companyName: string | null;
    enteredPhone: string | null;
    enteredEmployeeCode: string | null;
    phoneMatched: boolean;
    codeMatched: boolean;
    autoApproved: boolean;
    unlinkReason: string | null;
    status: LineLinkRequestStatus;
    reviewedBy: string | null;
    reviewedByName: string | null;
    reviewedAt: string | null;
    reviewNotes: string | null;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface LineSessionToken {
    id: string;
    userId: string;
    companyId: string;
    lineUserId: string;
    liffSessionId: string | null;
    userAgent: string | null;
    ipAddress: string | null;
    issuedAt: string;
    expiresAt: string;
    revokedAt: string | null;
    revokedBy: string | null;
    revokedByName: string | null;
    revokeReason: string | null;
    isActive: boolean;
    createdAt: string;
}

export type LineAuditAction =
    | 'link_request_created'
    | 'link_request_approved'
    | 'link_request_rejected'
    | 'link_request_expired'
    | 'unlink_request_created'
    | 'unlink_request_approved'
    | 'unlink_request_rejected'
    | 'force_unlink_executed'
    | 'session_revoked'
    | 'auto_link_matched'
    | 'manual_relink';

export interface LineAuditLog {
    id: string;
    companyId: string;
    actorUserId: string | null;
    actorRole: string | null;
    actorName: string | null;
    targetUserId: string | null;
    targetUserName: string | null;
    targetEmployeeId: string | null;
    targetEmployeeName: string | null;
    targetLineUserId: string | null;
    action: LineAuditAction;
    requestId: string | null;
    metadata: Record<string, unknown>;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
}

// ============================================================
// REQUEST/RESPONSE TYPES
// ============================================================

export interface LineLoginRequest {
    lineUserId: string;
    lineDisplayName: string;
    linePictureUrl?: string;
    lineEmail?: string;
    enteredPhone: string;
    enteredEmployeeCode: string;
}

export interface LineLoginResponse {
    status: LineLoginStatus;
    requestId?: string;
    companyName?: string;
    message?: string;
    userId?: string;
    companyId?: string;
    accessToken?: string;
    refreshToken?: string;
}

export interface ReviewLinkRequestRequest {
    reviewNotes?: string;
}

export interface CreateUnlinkRequestRequest {
    reason: string;
}

export interface ForceUnlinkRequest {
    targetUserId: string;
    reason: string;
}

export interface RevokeSessionRequest {
    sessionId: string;
    reason: string;
}

export interface ListLinkRequestsQuery {
    status?: LineLinkRequestStatus;
    requestType?: LineLinkRequestType;
    employeeId?: string;
    page?: number;
    pageSize?: number;
}

export interface ListSessionsQuery {
    userId?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
}

export interface ListAuditLogsQuery {
    userId?: string;
    employeeId?: string;
    action?: LineAuditAction;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

// ============================================================
// LINE LINK SERVICE
// ============================================================

class LineLinkService {
    // ============================================================
    // LINE LOGIN & AUTO-DISCOVERY
    // ============================================================

    async handleLineLogin(request: LineLoginRequest): Promise<LineLoginResponse> {
        const response = await apiPost<LineLoginResponse>('/line/login', request);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to process LINE login');
    }

    // ============================================================
    // LINK REQUEST MANAGEMENT
    // ============================================================

    async listLinkRequests(
        query?: ListLinkRequestsQuery
    ): Promise<PaginatedResponse<LineLinkRequest>> {
        const response = await apiGet<LineLinkRequest[]>('/line/link-requests', query as Record<string, unknown>);
        if (response.success && response.data) {
            // Extract pagination from meta.pagination or meta directly
            const metaPagination = response.meta?.pagination;
            const metaDirect = response.meta;

            const pagination = metaPagination || (metaDirect && 'page' in metaDirect ? metaDirect : null);

            return {
                data: response.data,
                pagination: pagination ? {
                    page: pagination.page ?? 1,
                    pageSize: pagination.pageSize ?? 20,
                    total: pagination.total ?? response.data.length,
                    totalPages: pagination.totalPages ?? 1,
                } : {
                    page: 1,
                    pageSize: 20,
                    total: response.data.length,
                    totalPages: 1,
                },
            };
        }
        throw new Error(response.error?.message || 'Failed to fetch link requests');
    }

    async getLinkRequest(requestId: string): Promise<LineLinkRequest> {
        const response = await apiGet<LineLinkRequest>(`/line/link-requests/${requestId}`);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to fetch link request');
    }

    async approveLinkRequest(
        requestId: string,
        data: ReviewLinkRequestRequest
    ): Promise<{ success: boolean; userId: string; requestId: string; auditId: string }> {
        const response = await apiPost<{
            success: boolean;
            userId: string;
            requestId: string;
            auditId: string;
        }>(`/line/link-requests/${requestId}/approve`, data);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to approve link request');
    }

    async rejectLinkRequest(
        requestId: string,
        data: ReviewLinkRequestRequest
    ): Promise<{ success: boolean; requestId: string; auditId: string }> {
        const response = await apiPost<{
            success: boolean;
            requestId: string;
            auditId: string;
        }>(`/line/link-requests/${requestId}/reject`, data);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to reject link request');
    }

    // ============================================================
    // UNLINK OPERATIONS
    // ============================================================

    async createUnlinkRequest(data: CreateUnlinkRequestRequest): Promise<LineLinkRequest> {
        const response = await apiPost<LineLinkRequest>('/line/unlink-request', data);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to create unlink request');
    }

    async approveUnlinkRequest(
        requestId: string,
        data: ReviewLinkRequestRequest
    ): Promise<{ success: boolean; requestId: string; revokedSessions: number; auditId: string }> {
        const response = await apiPost<{
            success: boolean;
            requestId: string;
            revokedSessions: number;
            auditId: string;
        }>(`/line/link-requests/${requestId}/approve-unlink`, data);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to approve unlink request');
    }

    async forceUnlink(
        data: ForceUnlinkRequest
    ): Promise<{ success: boolean; revokedSessions: number; auditId: string }> {
        const response = await apiPost<{
            success: boolean;
            revokedSessions: number;
            auditId: string;
        }>('/line/force-unlink', data);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to force unlink');
    }

    // ============================================================
    // SESSION MANAGEMENT
    // ============================================================

    async listSessions(query?: ListSessionsQuery): Promise<PaginatedResponse<LineSessionToken>> {
        const response = await apiGet<LineSessionToken[]>('/line/sessions', query as Record<string, unknown>);
        if (response.success && response.data) {
            // Extract pagination from meta.pagination or meta directly
            const metaPagination = response.meta?.pagination;
            const metaDirect = response.meta;

            const pagination = metaPagination || (metaDirect && 'page' in metaDirect ? metaDirect : null);

            return {
                data: response.data,
                pagination: pagination ? {
                    page: pagination.page ?? 1,
                    pageSize: pagination.pageSize ?? 20,
                    total: pagination.total ?? response.data.length,
                    totalPages: pagination.totalPages ?? 1,
                } : {
                    page: 1,
                    pageSize: 20,
                    total: response.data.length,
                    totalPages: 1,
                },
            };
        }
        throw new Error(response.error?.message || 'Failed to fetch sessions');
    }

    async revokeSession(
        sessionId: string,
        reason: string
    ): Promise<{ success: boolean; sessionId: string; auditId: string }> {
        const response = await apiPost<{
            success: boolean;
            sessionId: string;
            auditId: string;
        }>(`/line/sessions/${sessionId}/revoke`, { reason });
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to revoke session');
    }

    // ============================================================
    // AUDIT LOGS
    // ============================================================

    async listAuditLogs(query?: ListAuditLogsQuery): Promise<PaginatedResponse<LineAuditLog>> {
        const response = await apiGet<LineAuditLog[]>('/line/audit-logs', query as Record<string, unknown>);
        if (response.success && response.data) {
            // Extract pagination from meta.pagination or meta directly
            const metaPagination = response.meta?.pagination;
            const metaDirect = response.meta;

            const pagination = metaPagination || (metaDirect && 'page' in metaDirect ? metaDirect : null);

            return {
                data: response.data,
                pagination: pagination ? {
                    page: pagination.page ?? 1,
                    pageSize: pagination.pageSize ?? 20,
                    total: pagination.total ?? response.data.length,
                    totalPages: pagination.totalPages ?? 1,
                } : {
                    page: 1,
                    pageSize: 20,
                    total: response.data.length,
                    totalPages: 1,
                },
            };
        }
        throw new Error(response.error?.message || 'Failed to fetch audit logs');
    }
}

export const lineLinkService = new LineLinkService();
export default lineLinkService;

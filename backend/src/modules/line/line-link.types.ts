// LINE Account Link Management Types

// ============================================================
// LINK REQUEST TYPES
// ============================================================

export type LineLinkRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
export type LineLinkRequestType = 'link' | 'unlink';

// Database row type
export interface LineLinkRequestRow {
    id: string;
    request_type: LineLinkRequestType;
    line_user_id: string;
    line_display_name: string | null;
    line_picture_url: string | null;
    employee_id: string;
    company_id: string;
    entered_phone: string | null;
    entered_employee_code: string | null;
    phone_matched: boolean;
    code_matched: boolean;
    auto_approved: boolean;
    unlink_reason: string | null;
    status: LineLinkRequestStatus;
    reviewed_by: string | null;
    reviewed_at: string | null;
    review_notes: string | null;
    expires_at: string;
    created_at: string;
    updated_at: string;
}

// API response type with joined data
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

// ============================================================
// SESSION TOKEN TYPES
// ============================================================

// Database row type
export interface LineSessionTokenRow {
    id: string;
    user_id: string;
    company_id: string;
    line_user_id: string;
    access_token_hash: string;
    refresh_token_hash: string | null;
    liff_session_id: string | null;
    user_agent: string | null;
    ip_address: string | null;
    issued_at: string;
    expires_at: string;
    revoked_at: string | null;
    revoked_by: string | null;
    revoke_reason: string | null;
    is_active: boolean;
    created_at: string;
}

// API response type
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

// ============================================================
// AUDIT LOG TYPES
// ============================================================

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

// Database row type
export interface LineAuditLogRow {
    id: string;
    company_id: string;
    actor_user_id: string | null;
    actor_role: string | null;
    actor_name: string | null;
    target_user_id: string | null;
    target_employee_id: string | null;
    target_line_user_id: string | null;
    action: LineAuditAction;
    request_id: string | null;
    metadata: Record<string, unknown>;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
}

// API response type
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

// LINE Login Request
export interface LineLoginRequest {
    lineUserId: string;
    lineDisplayName: string;
    linePictureUrl?: string;
    lineEmail?: string;
    enteredPhone: string;
    enteredEmployeeCode: string;
}

// LINE Login Response
export type LineLoginStatus =
    | 'linked'
    | 'pending'
    | 'auto_linked'
    | 'no_match'
    | 'already_linked';

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

// Create Link Request
export interface CreateLinkRequestRequest {
    lineUserId: string;
    lineDisplayName: string;
    linePictureUrl?: string;
    enteredPhone: string;
    enteredEmployeeCode: string;
}

// Approve/Reject Link Request
export interface ReviewLinkRequestRequest {
    reviewNotes?: string;
}

// Create Unlink Request
export interface CreateUnlinkRequestRequest {
    reason: string;
}

// Force Unlink Request
export interface ForceUnlinkRequest {
    targetUserId: string;
    reason: string;
}

// Revoke Session Request
export interface RevokeSessionRequest {
    sessionId: string;
    reason: string;
}

// List Link Requests Query
export interface ListLinkRequestsQuery {
    status?: LineLinkRequestStatus;
    requestType?: LineLinkRequestType;
    employeeId?: string;
    page?: number;
    pageSize?: number;
}

// List Sessions Query
export interface ListSessionsQuery {
    userId?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
}

// List Audit Logs Query
export interface ListAuditLogsQuery {
    userId?: string;
    employeeId?: string;
    action?: LineAuditAction;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
}

// ============================================================
// FUNCTION RESULT TYPES
// ============================================================

export interface ApproveLinkResult {
    success: boolean;
    userId: string;
    requestId: string;
    auditId: string;
}

export interface RejectLinkResult {
    success: boolean;
    requestId: string;
    auditId: string;
}

export interface ForceUnlinkResult {
    success: boolean;
    revokedSessions: number;
    auditId: string;
}

export interface ApproveUnlinkResult {
    success: boolean;
    requestId: string;
    revokedSessions: number;
    auditId: string;
}

export interface RevokeSessionResult {
    success: boolean;
    sessionId: string;
    auditId: string;
}

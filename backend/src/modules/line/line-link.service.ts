import { supabaseAdmin as supabase } from '@/config/supabase.js';
import type {
    LineLinkRequest,
    LineLinkRequestRow,
    LineSessionToken,
    LineSessionTokenRow,
    LineAuditLog,
    LineAuditLogRow,
    LineLoginRequest,
    LineLoginResponse,
    CreateLinkRequestRequest,
    ReviewLinkRequestRequest,
    CreateUnlinkRequestRequest,
    ForceUnlinkRequest,
    RevokeSessionRequest,
    ListLinkRequestsQuery,
    ListSessionsQuery,
    ListAuditLogsQuery,
    ApproveLinkResult,
    RejectLinkResult,
    ForceUnlinkResult,
    ApproveUnlinkResult,
    RevokeSessionResult,
} from './line-link.types.js';
import { toCamelCase, toSnakeCase } from '@/utils/caseConversion.js';
import { createHash } from 'crypto';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Hash token using SHA256
 */
function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

/**
 * Convert link request row to API format
 */
function convertLinkRequestRow(row: LineLinkRequestRow & {
    employee?: { full_name: string; employee_code: string };
    company?: { name: string };
    reviewer?: { email: string };
}): LineLinkRequest {
    return {
        id: row.id,
        requestType: row.request_type,
        lineUserId: row.line_user_id,
        lineDisplayName: row.line_display_name,
        linePictureUrl: row.line_picture_url,
        employeeId: row.employee_id,
        employeeName: row.employee?.full_name ?? null,
        employeeCode: row.employee?.employee_code ?? null,
        companyId: row.company_id,
        companyName: row.company?.name ?? null,
        enteredPhone: row.entered_phone,
        enteredEmployeeCode: row.entered_employee_code,
        phoneMatched: row.phone_matched,
        codeMatched: row.code_matched,
        autoApproved: row.auto_approved,
        unlinkReason: row.unlink_reason,
        status: row.status,
        reviewedBy: row.reviewed_by,
        reviewedByName: row.reviewer?.email ?? null,
        reviewedAt: row.reviewed_at,
        reviewNotes: row.review_notes,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * Convert session token row to API format
 */
function convertSessionTokenRow(row: LineSessionTokenRow & {
    revoker?: { email: string };
}): LineSessionToken {
    return {
        id: row.id,
        userId: row.user_id,
        companyId: row.company_id,
        lineUserId: row.line_user_id,
        liffSessionId: row.liff_session_id,
        userAgent: row.user_agent,
        ipAddress: row.ip_address,
        issuedAt: row.issued_at,
        expiresAt: row.expires_at,
        revokedAt: row.revoked_at,
        revokedBy: row.revoked_by,
        revokedByName: row.revoker?.email ?? null,
        revokeReason: row.revoke_reason,
        isActive: row.is_active,
        createdAt: row.created_at,
    };
}

/**
 * Convert audit log row to API format
 */
function convertAuditLogRow(row: LineAuditLogRow & {
    target_user?: { email: string };
    target_employee?: { full_name: string };
}): LineAuditLog {
    return {
        id: row.id,
        companyId: row.company_id,
        actorUserId: row.actor_user_id,
        actorRole: row.actor_role,
        actorName: row.actor_name,
        targetUserId: row.target_user_id,
        targetUserName: row.target_user?.email ?? null,
        targetEmployeeId: row.target_employee_id,
        targetEmployeeName: row.target_employee?.full_name ?? null,
        targetLineUserId: row.target_line_user_id,
        action: row.action,
        requestId: row.request_id,
        metadata: row.metadata,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
    };
}

// ============================================================
// LINE LINK SERVICE
// ============================================================

export class LineLinkService {
    /**
     * Handle LINE login and auto-discovery
     */
    async handleLineLogin(request: LineLoginRequest): Promise<LineLoginResponse> {
        const {
            lineUserId,
            lineDisplayName,
            linePictureUrl,
            enteredPhone,
            enteredEmployeeCode,
        } = request;

        // STEP 1: Check if LINE user is already linked
        const { data: existingUser } = await supabase
            .from('users')
            .select('id, company_id, line_link_status, employee_id')
            .eq('line_user_id', lineUserId)
            .eq('is_active', true)
            .single();

        if (existingUser && existingUser.line_link_status === 'linked') {
            return {
                status: 'linked',
                userId: existingUser.id,
                companyId: existingUser.company_id,
                message: 'Already linked',
            };
        }

        // STEP 2: Check for pending request
        const { data: pendingRequest } = await supabase
            .from('line_link_requests')
            .select('id, company_id, companies!inner(name)')
            .eq('line_user_id', lineUserId)
            .eq('status', 'pending')
            .single();

        if (pendingRequest) {
            return {
                status: 'pending',
                requestId: pendingRequest.id,
                companyName: (pendingRequest as any).companies?.name ?? 'Unknown',
                message: 'Your link request is awaiting admin approval',
            };
        }

        // STEP 3: Auto-discovery - find matching employee
        const { data: matchedEmployee } = await supabase
            .from('employees')
            .select('id, company_id, full_name, email, phone, user_id, employee_code, companies!inner(name)')
            .eq('employee_code', enteredEmployeeCode)
            .eq('phone', enteredPhone)
            .eq('status', 'active')
            .single();

        if (!matchedEmployee) {
            return {
                status: 'no_match',
                message: 'Employee code and phone number do not match',
            };
        }

        // STEP 4: Check if employee already has a user account with different LINE
        if (matchedEmployee.user_id) {
            const { data: existingUserAccount } = await supabase
                .from('users')
                .select('line_user_id, line_link_status')
                .eq('id', matchedEmployee.user_id)
                .single();

            if (
                existingUserAccount?.line_user_id &&
                existingUserAccount.line_user_id !== lineUserId
            ) {
                return {
                    status: 'already_linked',
                    message: 'This employee is already linked to another LINE account',
                };
            }
        }

        // STEP 5: Auto-approve if both phone AND code match
        const phoneMatched = matchedEmployee.phone === enteredPhone;
        const codeMatched = matchedEmployee.employee_code === enteredEmployeeCode;
        const autoApprove = phoneMatched && codeMatched;

        // STEP 6: Create link request
        const { data: linkRequest, error: requestError } = await supabase
            .from('line_link_requests')
            .insert({
                request_type: 'link',
                line_user_id: lineUserId,
                line_display_name: lineDisplayName,
                line_picture_url: linePictureUrl,
                employee_id: matchedEmployee.id,
                company_id: matchedEmployee.company_id,
                entered_phone: enteredPhone,
                entered_employee_code: enteredEmployeeCode,
                phone_matched: phoneMatched,
                code_matched: codeMatched,
                auto_approved: autoApprove,
                status: autoApprove ? 'approved' : 'pending',
                reviewed_at: autoApprove ? new Date().toISOString() : null,
            })
            .select()
            .single();

        if (requestError) throw requestError;

        // STEP 7: If auto-approved, call approve function
        if (autoApprove) {
            const { data: approveResult } = await supabase.rpc('approve_line_link_request', {
                p_request_id: linkRequest.id,
                p_admin_user_id: null, // System auto-approval
                p_review_notes: 'Auto-approved based on matching phone and employee code',
            });

            if (approveResult) {
                return {
                    status: 'auto_linked',
                    message: 'Account automatically linked',
                    userId: approveResult.user_id,
                    companyId: matchedEmployee.company_id,
                };
            }
        }

        // STEP 8: Manual approval needed
        return {
            status: 'pending',
            requestId: linkRequest.id,
            companyName: (matchedEmployee as any).companies?.name ?? 'Unknown',
            message: 'Link request submitted. Please wait for admin approval.',
        };
    }

    /**
     * List link requests with pagination
     */
    async listLinkRequests(
        companyId: string,
        query: ListLinkRequestsQuery = {}
    ): Promise<{ data: LineLinkRequest[]; total: number }> {
        const { status, requestType, employeeId, page = 1, pageSize = 20 } = query;

        let queryBuilder = supabase
            .from('line_link_requests')
            .select(
                `
                *,
                employees!inner(full_name, employee_code),
                companies!inner(name),
                reviewer:users!line_link_requests_reviewed_by_fkey(email)
            `,
                { count: 'exact' }
            )
            .eq('company_id', companyId);

        if (status) queryBuilder = queryBuilder.eq('status', status);
        if (requestType) queryBuilder = queryBuilder.eq('request_type', requestType);
        if (employeeId) queryBuilder = queryBuilder.eq('employee_id', employeeId);

        queryBuilder = queryBuilder
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        const { data, error, count } = await queryBuilder;

        if (error) throw error;

        return {
            data: (data || []).map(convertLinkRequestRow),
            total: count || 0,
        };
    }

    /**
     * Get link request by ID
     */
    async getLinkRequestById(requestId: string, companyId: string): Promise<LineLinkRequest> {
        const { data, error } = await supabase
            .from('line_link_requests')
            .select(
                `
                *,
                employees!inner(full_name, employee_code),
                companies!inner(name),
                reviewer:users!line_link_requests_reviewed_by_fkey(email)
            `
            )
            .eq('id', requestId)
            .eq('company_id', companyId)
            .single();

        if (error) throw error;
        if (!data) throw new Error('Link request not found');

        return convertLinkRequestRow(data);
    }

    /**
     * Approve link request
     */
    async approveLinkRequest(
        requestId: string,
        adminUserId: string,
        request: ReviewLinkRequestRequest
    ): Promise<ApproveLinkResult> {
        const { data, error } = await supabase.rpc('approve_line_link_request', {
            p_request_id: requestId,
            p_admin_user_id: adminUserId,
            p_review_notes: request.reviewNotes || null,
        });

        if (error) throw error;
        if (!data) throw new Error('Failed to approve link request');

        return data as ApproveLinkResult;
    }

    /**
     * Reject link request
     */
    async rejectLinkRequest(
        requestId: string,
        adminUserId: string,
        request: ReviewLinkRequestRequest
    ): Promise<RejectLinkResult> {
        const { data, error } = await supabase.rpc('reject_line_link_request', {
            p_request_id: requestId,
            p_admin_user_id: adminUserId,
            p_review_notes: request.reviewNotes || 'Rejected by admin',
        });

        if (error) throw error;
        if (!data) throw new Error('Failed to reject link request');

        return data as RejectLinkResult;
    }

    /**
     * Create unlink request (guard-initiated)
     */
    async createUnlinkRequest(
        userId: string,
        companyId: string,
        request: CreateUnlinkRequestRequest
    ): Promise<LineLinkRequest> {
        // Get user details
        const { data: user } = await supabase
            .from('users')
            .select('employee_id, line_user_id, line_display_name, line_picture_url, role')
            .eq('id', userId)
            .eq('line_link_status', 'linked')
            .single();

        if (!user) throw new Error('User not linked or not found');
        if (user.role !== 'guard') throw new Error('Only guards can request unlink');

        // Create unlink request
        const { data, error } = await supabase
            .from('line_link_requests')
            .insert({
                request_type: 'unlink',
                line_user_id: user.line_user_id,
                line_display_name: user.line_display_name,
                line_picture_url: user.line_picture_url,
                employee_id: user.employee_id,
                company_id: companyId,
                unlink_reason: request.reason,
                status: 'pending',
            })
            .select(
                `
                *,
                employees!inner(full_name, employee_code),
                companies!inner(name)
            `
            )
            .single();

        if (error) throw error;
        if (!data) throw new Error('Failed to create unlink request');

        return convertLinkRequestRow(data);
    }

    /**
     * Approve unlink request
     */
    async approveUnlinkRequest(
        requestId: string,
        adminUserId: string,
        request: ReviewLinkRequestRequest,
        ipAddress?: string,
        userAgent?: string
    ): Promise<ApproveUnlinkResult> {
        const { data, error } = await supabase.rpc('approve_unlink_request', {
            p_request_id: requestId,
            p_admin_user_id: adminUserId,
            p_review_notes: request.reviewNotes || null,
            p_ip_address: ipAddress || null,
            p_user_agent: userAgent || null,
        });

        if (error) throw error;
        if (!data) throw new Error('Failed to approve unlink request');

        return data as ApproveUnlinkResult;
    }

    /**
     * Force unlink LINE account (admin only)
     */
    async forceUnlink(
        adminUserId: string,
        request: ForceUnlinkRequest,
        ipAddress?: string,
        userAgent?: string
    ): Promise<ForceUnlinkResult> {
        const { data, error } = await supabase.rpc('force_unlink_line_account', {
            p_target_user_id: request.targetUserId,
            p_admin_user_id: adminUserId,
            p_reason: request.reason,
            p_ip_address: ipAddress || null,
            p_user_agent: userAgent || null,
        });

        if (error) throw error;
        if (!data) throw new Error('Failed to force unlink');

        return data as ForceUnlinkResult;
    }

    /**
     * List sessions with pagination
     */
    async listSessions(
        companyId: string,
        query: ListSessionsQuery = {}
    ): Promise<{ data: LineSessionToken[]; total: number }> {
        const { userId, isActive, page = 1, pageSize = 20 } = query;

        let queryBuilder = supabase
            .from('line_session_tokens')
            .select(
                `
                *,
                revoker:users!line_session_tokens_revoked_by_fkey(email)
            `,
                { count: 'exact' }
            )
            .eq('company_id', companyId);

        if (userId) queryBuilder = queryBuilder.eq('user_id', userId);
        if (isActive !== undefined) queryBuilder = queryBuilder.eq('is_active', isActive);

        queryBuilder = queryBuilder
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        const { data, error, count } = await queryBuilder;

        if (error) throw error;

        return {
            data: (data || []).map(convertSessionTokenRow),
            total: count || 0,
        };
    }

    /**
     * Revoke session
     */
    async revokeSession(
        adminUserId: string,
        request: RevokeSessionRequest
    ): Promise<RevokeSessionResult> {
        const { data, error } = await supabase.rpc('revoke_line_session', {
            p_session_id: request.sessionId,
            p_admin_user_id: adminUserId,
            p_reason: request.reason,
        });

        if (error) throw error;
        if (!data) throw new Error('Failed to revoke session');

        return data as RevokeSessionResult;
    }

    /**
     * List audit logs with pagination
     */
    async listAuditLogs(
        companyId: string,
        query: ListAuditLogsQuery = {}
    ): Promise<{ data: LineAuditLog[]; total: number }> {
        const { userId, employeeId, action, startDate, endDate, page = 1, pageSize = 50 } = query;

        let queryBuilder = supabase
            .from('line_audit_log')
            .select(
                `
                *,
                target_user:users!line_audit_log_target_user_id_fkey(email),
                target_employee:employees!line_audit_log_target_employee_id_fkey(full_name)
            `,
                { count: 'exact' }
            )
            .eq('company_id', companyId);

        if (userId) queryBuilder = queryBuilder.eq('target_user_id', userId);
        if (employeeId) queryBuilder = queryBuilder.eq('target_employee_id', employeeId);
        if (action) queryBuilder = queryBuilder.eq('action', action);
        if (startDate) queryBuilder = queryBuilder.gte('created_at', startDate);
        if (endDate) queryBuilder = queryBuilder.lte('created_at', endDate);

        queryBuilder = queryBuilder
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        const { data, error, count } = await queryBuilder;

        if (error) throw error;

        return {
            data: (data || []).map(convertAuditLogRow),
            total: count || 0,
        };
    }
}

export const lineLinkService = new LineLinkService();

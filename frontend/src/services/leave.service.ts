import api from './api';
import type {
    LeaveType,
    LeaveRequest,
    LeaveBalance,
    LeaveRequestPayload,
    LeaveRequestStatus,
    ReplacementConflict,
    AvailableReplacement,
    ApproveWithReplacements,
    ConflictResolutionResult,
    BalanceAdjustment,
    AdjustBalanceRequest,
    LeaveRequestTemplate,
    CreateTemplateRequest,
    UpdateTemplateRequest,
    TemplateDraft,
} from '../types/leave.types';

// ============================================================================
// TYPES
// ============================================================================

// Partial leave type returned in API responses (subset of full LeaveType)
interface PartialLeaveType {
    id: string;
    name: string;
    nameTh: string | null;
    isPaid: boolean;
}

export interface LeaveBalanceWithType extends Omit<LeaveBalance, 'leaveType'> {
    leaveType?: PartialLeaveType;
}

export interface LeaveRequestWithDetails extends Omit<LeaveRequest, 'leaveType' | 'employee' | 'reviewer'> {
    employee?: {
        id: string;
        fullName: string;
        employeeCode: string;
    };
    leaveType?: PartialLeaveType;
    reviewer?: {
        id: string;
        email: string;
    } | null;
}

export interface MyLeaveDataResponse {
    balances: LeaveBalanceWithType[];
    pendingRequests: LeaveRequestWithDetails[];
    recentRequests: LeaveRequestWithDetails[];
}

export interface LeaveSummary {
    pendingRequests: number;
    approvedThisMonth: number;
    employeesOnLeaveToday: number;
    upcomingLeaves: number;
}

export interface LeaveCalendarEntry {
    date: string;
    employees: Array<{
        id: string;
        fullName: string;
        employeeCode: string;
        leaveType: {
            id: string;
            name: string;
            nameTh: string | null;
        };
    }>;
}

export interface ListLeaveRequestsQuery {
    page?: number;
    pageSize?: number;
    employeeId?: string;
    status?: LeaveRequestStatus;
    startDate?: string;
    endDate?: string;
}

export interface ListLeaveBalancesQuery {
    page?: number;
    pageSize?: number;
    year?: number;
    employeeId?: string;
    leaveTypeId?: string;
}

export interface CreateLeaveTypeRequest {
    name: string;
    nameTh?: string;
    description?: string;
    isPaid?: boolean;
    maxDaysPerYear?: number;
    requiresApproval?: boolean;
    requiresDocument?: boolean;
    isActive?: boolean;
    sortOrder?: number;
}

export interface UpdateLeaveTypeRequest {
    name?: string;
    nameTh?: string | null;
    description?: string | null;
    isPaid?: boolean;
    maxDaysPerYear?: number | null;
    requiresApproval?: boolean;
    requiresDocument?: boolean;
    isActive?: boolean;
    sortOrder?: number;
}

// Response types
interface ApiResponse<T> {
    success: boolean;
    message: string;
    message_th?: string;
    data: T;
    meta?: {
        pagination?: {
            page: number;
            pageSize: number;
            total: number;
            totalPages: number;
        };
    };
}

// ============================================================================
// LEAVE TYPE API
// ============================================================================

export async function listLeaveTypes(includeInactive = false): Promise<LeaveType[]> {
    const response = await api.get<ApiResponse<LeaveType[]>>('/leave-types', {
        params: { includeInactive },
    });
    return response.data.data;
}

export async function getLeaveTypeById(id: string): Promise<LeaveType> {
    const response = await api.get<ApiResponse<LeaveType>>(`/leave-types/${id}`);
    return response.data.data;
}

export async function createLeaveType(data: CreateLeaveTypeRequest): Promise<LeaveType> {
    const response = await api.post<ApiResponse<LeaveType>>('/leave-types', data);
    return response.data.data;
}

export async function updateLeaveType(id: string, data: UpdateLeaveTypeRequest): Promise<LeaveType> {
    const response = await api.put<ApiResponse<LeaveType>>(`/leave-types/${id}`, data);
    return response.data.data;
}

export async function deleteLeaveType(id: string): Promise<void> {
    await api.delete(`/leave-types/${id}`);
}

// ============================================================================
// GUARD API (for LIFF)
// ============================================================================

export async function getMyLeaveData(year?: number): Promise<MyLeaveDataResponse> {
    const response = await api.get<ApiResponse<MyLeaveDataResponse>>('/leave/my', {
        params: year ? { year } : undefined,
    });
    return response.data.data;
}

export async function getMyLeaveRequests(): Promise<LeaveRequestWithDetails[]> {
    const response = await api.get<ApiResponse<LeaveRequestWithDetails[]>>('/leave-requests/my');
    return response.data.data;
}

export async function getMyLeaveBalances(year?: number): Promise<LeaveBalanceWithType[]> {
    const response = await api.get<ApiResponse<LeaveBalanceWithType[]>>('/leave-balances/my', {
        params: year ? { year } : undefined,
    });
    return response.data.data;
}

export async function createLeaveRequest(data: LeaveRequestPayload): Promise<LeaveRequestWithDetails> {
    const response = await api.post<ApiResponse<LeaveRequestWithDetails>>('/leave-requests', data);
    return response.data.data;
}

export async function cancelLeaveRequest(id: string): Promise<LeaveRequestWithDetails> {
    const response = await api.post<ApiResponse<LeaveRequestWithDetails>>(`/leave-requests/${id}/cancel`);
    return response.data.data;
}

// ============================================================================
// MANAGER API
// ============================================================================

export async function listLeaveRequests(
    query: ListLeaveRequestsQuery = {}
): Promise<{ requests: LeaveRequestWithDetails[]; total: number; pagination?: ApiResponse<unknown>['meta'] }> {
    const response = await api.get<ApiResponse<LeaveRequestWithDetails[]>>('/leave-requests', {
        params: query,
    });
    return {
        requests: response.data.data,
        total: response.data.meta?.pagination?.total ?? 0,
        pagination: response.data.meta,
    };
}

export async function getLeaveRequestById(id: string): Promise<LeaveRequestWithDetails> {
    const response = await api.get<ApiResponse<LeaveRequestWithDetails>>(`/leave-requests/${id}`);
    return response.data.data;
}

export async function approveLeaveRequest(id: string, reviewNotes?: string): Promise<LeaveRequestWithDetails> {
    const response = await api.post<ApiResponse<LeaveRequestWithDetails>>(
        `/leave-requests/${id}/approve`,
        { reviewNotes }
    );
    return response.data.data;
}

export async function rejectLeaveRequest(id: string, reviewNotes: string): Promise<LeaveRequestWithDetails> {
    const response = await api.post<ApiResponse<LeaveRequestWithDetails>>(
        `/leave-requests/${id}/reject`,
        { reviewNotes }
    );
    return response.data.data;
}

export async function getLeaveSummary(): Promise<LeaveSummary> {
    const response = await api.get<ApiResponse<LeaveSummary>>('/leave/summary');
    return response.data.data;
}

export async function getPendingCount(): Promise<number> {
    const response = await api.get<ApiResponse<{ count: number }>>('/leave/pending-count');
    return response.data.data.count;
}

export async function getLeaveCalendar(
    startDate: string,
    endDate: string
): Promise<LeaveCalendarEntry[]> {
    const response = await api.get<ApiResponse<LeaveCalendarEntry[]>>('/leave/calendar', {
        params: { startDate, endDate },
    });
    return response.data.data;
}

// ============================================================================
// BALANCE MANAGEMENT API
// ============================================================================

export async function updateLeaveBalance(
    employeeId: string,
    leaveTypeId: string,
    entitledDays: number
): Promise<LeaveBalance> {
    const response = await api.put<ApiResponse<LeaveBalance>>(
        `/leave-balances/${employeeId}/${leaveTypeId}`,
        { entitledDays }
    );
    return response.data.data;
}

export async function initializeBalances(
    year: number,
    employeeIds?: string[]
): Promise<{ created: number }> {
    const response = await api.post<ApiResponse<{ created: number }>>(
        '/leave-balances/initialize',
        { year, employeeIds }
    );
    return response.data.data;
}

// Re-export types
export type { LeaveType, LeaveRequest, LeaveBalance, LeaveRequestPayload, LeaveRequestStatus };

export default {
    // Leave types
    listLeaveTypes,
    getLeaveTypeById,
    createLeaveType,
    updateLeaveType,
    deleteLeaveType,
    // Guard API
    getMyLeaveData,
    getMyLeaveRequests,
    getMyLeaveBalances,
    createLeaveRequest,
    cancelLeaveRequest,
    // Manager API
    listLeaveRequests,
    getLeaveRequestById,
    approveLeaveRequest,
    rejectLeaveRequest,
    getLeaveSummary,
    getPendingCount,
    getLeaveCalendar,
    // Balance management
    listBalances: async (
        query: ListLeaveBalancesQuery = {}
    ): Promise<{ balances: LeaveBalance[]; total: number; pagination?: any }> => {
        const response = await api.get<ApiResponse<LeaveBalance[]>>('/leave-balances', {
            params: query,
        });
        return {
            balances: response.data.data,
            total: response.data.meta?.pagination?.total ?? 0,
            pagination: response.data.meta,
        };
    },
    updateLeaveBalance,
    initializeBalances,
    // Document management
    uploadLeaveDocument: async (requestId: string, file: File): Promise<{ documentUrl: string }> => {
        const formData = new FormData();
        formData.append('document', file);

        const response = await api.post<ApiResponse<{ documentUrl: string }>>(
            `/leave-requests/${requestId}/document`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data.data;
    },
    getLeaveDocumentUrl: async (requestId: string): Promise<{ url: string }> => {
        const response = await api.get<ApiResponse<{ url: string }>>(
            `/leave-requests/${requestId}/document`
        );
        return response.data.data;
    },
    deleteLeaveDocument: async (requestId: string): Promise<void> => {
        await api.delete(`/leave-requests/${requestId}/document`);
    },

    // ========================================================================
    // REPLACEMENT GUARD WORKFLOW
    // ========================================================================

    /**
     * Get shift conflicts for a leave request
     * @param requestId Leave request ID
     * @returns Array of conflicting shifts
     */
    getLeaveRequestConflicts: async (requestId: string): Promise<ReplacementConflict[]> => {
        const response = await api.get<ApiResponse<ReplacementConflict[]>>(
            `/leave-requests/${requestId}/conflicts`
        );
        return response.data.data;
    },

    /**
     * Get available replacement guards for a shift
     * @param shiftId Shift ID
     * @returns Array of available replacement employees
     */
    getAvailableReplacements: async (shiftId: string): Promise<AvailableReplacement[]> => {
        const response = await api.get<ApiResponse<AvailableReplacement[]>>(
            `/shifts/${shiftId}/available-replacements`
        );
        return response.data.data;
    },

    /**
     * Approve leave request with replacement assignments
     * @param requestId Leave request ID
     * @param data Approval data with replacements
     * @returns Approved leave request and replacement result
     */
    approveWithReplacements: async (
        requestId: string,
        data: ApproveWithReplacements
    ): Promise<{
        leaveRequest: LeaveRequestWithDetails;
        replacementResult?: ConflictResolutionResult;
    }> => {
        const response = await api.post<
            ApiResponse<{
                leaveRequest: LeaveRequestWithDetails;
                replacementResult?: ConflictResolutionResult;
            }>
        >(`/leave-requests/${requestId}/approve-with-replacements`, data);
        return response.data.data;
    },

    // ========================================================================
    // EXPORT
    // ========================================================================

    /**
     * Export leave calendar as iCal file
     * @param filters Export filters (startDate, endDate, teamId, employeeId, status)
     * @returns Triggers file download
     */
    exportICalendar: async (filters: {
        startDate?: string;
        endDate?: string;
        teamId?: string;
        employeeId?: string;
        status?: string;
    } = {}): Promise<void> => {
        const params = new URLSearchParams();

        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.teamId) params.append('teamId', filters.teamId);
        if (filters.employeeId) params.append('employeeId', filters.employeeId);
        if (filters.status) params.append('status', filters.status);

        const response = await api.get('/leave/export/ical', {
            params,
            responseType: 'blob',
        });

        // Create blob and download
        const blob = new Blob([response.data], { type: 'text/calendar' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Generate filename
        const timestamp = new Date().toISOString().split('T')[0];
        const filename =
            filters.startDate && filters.endDate
                ? `leave-calendar_${filters.startDate}-to-${filters.endDate}.ics`
                : `leave-calendar_${timestamp}.ics`;

        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    // ========================================================================
    // BALANCE ADJUSTMENTS
    // ========================================================================

    /**
     * Adjust a leave balance with audit trail
     * @param balanceId Balance ID
     * @param data Adjustment data
     * @returns Adjustment record with details
     */
    adjustLeaveBalance: async (
        balanceId: string,
        data: AdjustBalanceRequest
    ): Promise<BalanceAdjustment> => {
        const response = await api.post<ApiResponse<BalanceAdjustment>>(
            `/leave-balances/${balanceId}/adjust`,
            data
        );
        return response.data.data;
    },

    /**
     * Get adjustment history for a balance
     * @param balanceId Balance ID
     * @returns Array of adjustments
     */
    getBalanceAdjustments: async (balanceId: string): Promise<BalanceAdjustment[]> => {
        const response = await api.get<ApiResponse<BalanceAdjustment[]>>(
            `/leave-balances/${balanceId}/adjustments`
        );
        return response.data.data;
    },

    /**
     * Get adjustment history for an employee
     * @param employeeId Employee ID
     * @param year Optional year filter
     * @returns Array of adjustments
     */
    getEmployeeAdjustments: async (
        employeeId: string,
        year?: number
    ): Promise<BalanceAdjustment[]> => {
        const response = await api.get<ApiResponse<BalanceAdjustment[]>>(
            `/employees/${employeeId}/adjustments`,
            { params: year ? { year } : undefined }
        );
        return response.data.data;
    },

    // ========================================================================
    // LEAVE REQUEST TEMPLATES
    // ========================================================================

    /**
     * List all leave request templates
     * @param includeInactive Include inactive templates (managers only)
     * @returns Array of templates
     */
    listTemplates: async (includeInactive = false): Promise<LeaveRequestTemplate[]> => {
        const response = await api.get<ApiResponse<LeaveRequestTemplate[]>>('/leave-templates', {
            params: includeInactive ? { includeInactive: true } : undefined,
        });
        return response.data.data;
    },

    /**
     * Get a single template by ID
     * @param templateId Template ID
     * @returns Template details
     */
    getTemplate: async (templateId: string): Promise<LeaveRequestTemplate> => {
        const response = await api.get<ApiResponse<LeaveRequestTemplate>>(
            `/leave-templates/${templateId}`
        );
        return response.data.data;
    },

    /**
     * Create a new leave request template
     * @param data Template data
     * @returns Created template
     */
    createTemplate: async (data: CreateTemplateRequest): Promise<LeaveRequestTemplate> => {
        const response = await api.post<ApiResponse<LeaveRequestTemplate>>(
            '/leave-templates',
            data
        );
        return response.data.data;
    },

    /**
     * Update a leave request template
     * @param templateId Template ID
     * @param data Updated template data
     * @returns Updated template
     */
    updateTemplate: async (
        templateId: string,
        data: UpdateTemplateRequest
    ): Promise<LeaveRequestTemplate> => {
        const response = await api.put<ApiResponse<LeaveRequestTemplate>>(
            `/leave-templates/${templateId}`,
            data
        );
        return response.data.data;
    },

    /**
     * Delete a leave request template
     * @param templateId Template ID
     */
    deleteTemplate: async (templateId: string): Promise<void> => {
        await api.delete(`/leave-templates/${templateId}`);
    },

    /**
     * Apply a template to get pre-filled draft data
     * @param templateId Template ID
     * @param startDate Optional start date (YYYY-MM-DD)
     * @returns Pre-filled draft data
     */
    applyTemplate: async (templateId: string, startDate?: string): Promise<TemplateDraft> => {
        const response = await api.post<ApiResponse<TemplateDraft>>(
            `/leave-templates/${templateId}/apply`,
            startDate ? { startDate } : {}
        );
        return response.data.data;
    },
};

import api from './api';
import type {
    LeaveType,
    LeaveRequest,
    LeaveBalance,
    LeaveRequestPayload,
    LeaveRequestStatus,
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
};

// Leave module types

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

// ============================================================================
// DATABASE ROW TYPES
// ============================================================================

// Database row type for leave_types
export interface LeaveTypeRow {
    id: string;
    company_id: string;
    name: string;
    name_th: string | null;
    description: string | null;
    is_paid: boolean;
    max_days_per_year: number | null;
    requires_approval: boolean;
    requires_document: boolean;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

// Database row type for leave_requests
export interface LeaveRequestRow {
    id: string;
    company_id: string;
    employee_id: string;
    leave_type_id: string;
    start_date: string;
    end_date: string;
    total_days: number;
    reason: string | null;
    document_url: string | null;
    status: LeaveRequestStatus;
    reviewed_by: string | null;
    reviewed_at: string | null;
    review_notes: string | null;
    created_at: string;
    updated_at: string;
}

// Leave request with related data (joined)
export interface LeaveRequestRowWithDetails extends LeaveRequestRow {
    employees: {
        id: string;
        full_name: string;
        employee_code: string;
    };
    leave_types: {
        id: string;
        name: string;
        name_th: string | null;
        is_paid: boolean;
    };
    reviewer?: {
        id: string;
        email: string;
    } | null;
}

// Database row type for leave_balances
export interface LeaveBalanceRow {
    id: string;
    company_id: string;
    employee_id: string;
    leave_type_id: string;
    year: number;
    entitled_days: number;
    used_days: number;
    pending_days: number;
    created_at: string;
    updated_at: string;
}

// Leave balance with leave type (joined)
export interface LeaveBalanceRowWithType extends LeaveBalanceRow {
    leave_types: {
        id: string;
        name: string;
        name_th: string | null;
        is_paid: boolean;
    };
}

// Leave balance with employee and leave type (joined)
export interface LeaveBalanceRowWithDetails extends LeaveBalanceRow {
    leave_types: {
        id: string;
        name: string;
        name_th: string | null;
        is_paid: boolean;
    };
    employees: {
        id: string;
        full_name: string;
        employee_code: string;
    };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

// API response type for leave_types
export interface LeaveType {
    id: string;
    companyId: string;
    name: string;
    nameTh: string | null;
    description: string | null;
    isPaid: boolean;
    maxDaysPerYear: number | null;
    requiresApproval: boolean;
    requiresDocument: boolean;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

// API response type for leave_requests
export interface LeaveRequest {
    id: string;
    companyId: string;
    employeeId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string | null;
    documentUrl: string | null;
    status: LeaveRequestStatus;
    reviewedBy: string | null;
    reviewedAt: string | null;
    reviewNotes: string | null;
    createdAt: string;
    updatedAt: string;
}

// Extended leave request with details
export interface LeaveRequestWithDetails extends LeaveRequest {
    employee?: {
        id: string;
        fullName: string;
        employeeCode: string;
    };
    leaveType?: {
        id: string;
        name: string;
        nameTh: string | null;
        isPaid: boolean;
    };
    reviewer?: {
        id: string;
        email: string;
    } | null;
}

// API response type for leave_balances
export interface LeaveBalance {
    id: string;
    companyId: string;
    employeeId: string;
    leaveTypeId: string;
    year: number;
    entitledDays: number;
    usedDays: number;
    pendingDays: number;
    remainingDays: number; // computed
    createdAt: string;
    updatedAt: string;
}

// Extended leave balance with leave type
export interface LeaveBalanceWithType extends LeaveBalance {
    leaveType?: {
        id: string;
        name: string;
        nameTh: string | null;
        isPaid: boolean;
    };
}

// Extended leave balance with details (employee + leave type)
export interface LeaveBalanceWithDetails extends LeaveBalance {
    leaveType?: {
        id: string;
        name: string;
        nameTh: string | null;
        isPaid: boolean;
    };
    employee?: {
        id: string;
        fullName: string;
        employeeCode: string;
    };
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

// Create leave type request
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

// Update leave type request
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

// Create leave request
export interface CreateLeaveRequestPayload {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
    documentUrl?: string;
}

// Approve leave request
export interface ApproveLeaveRequest {
    reviewNotes?: string;
}

// Reject leave request
export interface RejectLeaveRequest {
    reviewNotes: string;
}

// ============================================================================
// QUERY TYPES
// ============================================================================

// List leave types query
export interface ListLeaveTypesQuery {
    includeInactive?: boolean;
}

// List leave requests query
export interface ListLeaveRequestsQuery {
    page?: number;
    pageSize?: number;
    employeeId?: string;
    status?: LeaveRequestStatus;
    startDate?: string;
    endDate?: string;
}

// List leave balances query
export interface ListLeaveBalancesQuery {
    page?: number;
    pageSize?: number;
    year?: number;
    employeeId?: string;
    leaveTypeId?: string;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

// My leave data response
export interface MyLeaveDataResponse {
    balances: LeaveBalanceWithType[];
    pendingRequests: LeaveRequestWithDetails[];
    recentRequests: LeaveRequestWithDetails[];
}

// Leave calendar data (who's off when)
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

// Pending leave requests count
export interface PendingLeaveCountResponse {
    count: number;
}

// Leave summary for dashboard
export interface LeaveSummary {
    pendingRequests: number;
    approvedThisMonth: number;
    employeesOnLeaveToday: number;
    upcomingLeaves: number;
}

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
        user_id: string;
    };
    leave_types: {
        id: string;
        name: string;
        name_th: string | null;
        is_paid: boolean;
        max_days_per_year: number | null;
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
        user_id: string;
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
        userId: string;
    };
    leaveType?: {
        id: string;
        name: string;
        nameTh: string | null;
        isPaid: boolean;
        maxDaysPerYear: number | null;
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
        userId: string;
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

// ============================================================================
// REPLACEMENT GUARD WORKFLOW TYPES
// ============================================================================

// Shift conflict information
export interface ReplacementConflict {
    shiftId: string;
    date: string;
    siteId: string;
    siteName: string;
    siteZone: string | null;
    startTime: string;
    endTime: string;
    requiresReplacement: boolean;
    originalEmployeeId: string;
    originalEmployeeName: string;
    status: string;
}

// Available replacement employee
export interface AvailableReplacement {
    id: string;
    fullName: string;
    employeeCode: string;
    position: string | null;
    shiftCount: number; // Number of shifts in selected period
}

// Single replacement assignment
export interface ReplacementAssignment {
    shiftId: string;
    replacementEmployeeId: string;
    reason?: string;
}

// Leave approval with replacements
export interface LeaveApprovalWithReplacements extends ApproveLeaveRequest {
    replacements?: ReplacementAssignment[];
}

// Shift with replacement details
export interface ShiftWithReplacement {
    id: string;
    companyId: string;
    employeeId: string;
    date: string;
    startTime: string;
    endTime: string;
    siteId: string;
    status: string;
    replacedByEmployeeId: string | null;
    isReplacement: boolean;
    originalEmployeeId: string | null;
    replacementReason: string | null;
    // Joined data
    employee?: {
        id: string;
        fullName: string;
        employeeCode: string;
    };
    replacementEmployee?: {
        id: string;
        fullName: string;
        employeeCode: string;
    };
    originalEmployee?: {
        id: string;
        fullName: string;
        employeeCode: string;
    };
    site?: {
        id: string;
        name: string;
        zone: string | null;
    };
}

// Conflict resolution result
export interface ConflictResolutionResult {
    leaveRequestId: string;
    totalConflicts: number;
    resolvedConflicts: number;
    unresolvedConflicts: number;
    assignedReplacements: ReplacementAssignment[];
}

// ============================================================================
// BALANCE ADJUSTMENT TYPES
// ============================================================================

export type AdjustmentFieldName = 'entitled_days' | 'used_days' | 'pending_days';
export type AdjustmentType = 'pro_rated' | 'correction' | 'special_allowance' | 'carry_forward' | 'manual';

// Database row type for leave_balance_adjustments
export interface LeaveBalanceAdjustmentRow {
    id: string;
    company_id: string;
    balance_id: string;
    employee_id: string;
    leave_type_id: string;
    year: number;
    adjusted_by: string;
    field_name: AdjustmentFieldName;
    previous_value: number;
    new_value: number;
    adjustment_amount: number; // Generated column
    reason: string;
    adjustment_type: AdjustmentType | null;
    created_at: string;
}

// Balance adjustment with user details
export interface LeaveBalanceAdjustmentWithDetails extends LeaveBalanceAdjustmentRow {
    adjuster?: {
        id: string;
        email: string;
    };
    employee?: {
        id: string;
        full_name: string;
        employee_code: string;
    };
    leave_type?: {
        id: string;
        name: string;
        name_th: string | null;
    };
}

// API response type for balance adjustments
export interface BalanceAdjustment {
    id: string;
    companyId: string;
    balanceId: string;
    employeeId: string;
    leaveTypeId: string;
    year: number;
    adjustedBy: string;
    fieldName: AdjustmentFieldName;
    previousValue: number;
    newValue: number;
    adjustmentAmount: number;
    reason: string;
    adjustmentType: AdjustmentType | null;
    createdAt: string;
}

// Balance adjustment with details
export interface BalanceAdjustmentWithDetails extends BalanceAdjustment {
    adjuster?: {
        id: string;
        email: string;
    };
    employee?: {
        id: string;
        fullName: string;
        employeeCode: string;
    };
    leaveType?: {
        id: string;
        name: string;
        nameTh: string | null;
    };
}

// Request types
export interface AdjustBalanceRequest {
    fieldName: AdjustmentFieldName;
    newValue: number;
    reason: string;
    adjustmentType?: AdjustmentType;
}

export interface BulkAdjustmentItem {
    balanceId: string;
    fieldName: AdjustmentFieldName;
    newValue: number;
    reason: string;
    adjustmentType?: AdjustmentType;
}

// ============================================================================
// LEAVE REQUEST TEMPLATE TYPES
// ============================================================================

// Database row type for leave_request_templates
export interface LeaveRequestTemplateRow {
    id: string;
    company_id: string;
    name: string;
    name_th: string | null;
    description: string | null;
    leave_type_id: string;
    default_days_count: number | null;
    default_reason: string | null;
    is_active: boolean;
    sort_order: number;
    created_by: string;
    created_at: string;
    updated_at: string;
}

// Template with leave type details
export interface LeaveRequestTemplateWithDetails extends LeaveRequestTemplateRow {
    leave_type?: {
        id: string;
        name: string;
        name_th: string | null;
        is_paid: boolean;
    };
    creator?: {
        id: string;
        email: string;
    };
}

// API response type for templates
export interface LeaveRequestTemplate {
    id: string;
    companyId: string;
    name: string;
    nameTh: string | null;
    description: string | null;
    leaveTypeId: string;
    defaultDaysCount: number | null;
    defaultReason: string | null;
    isActive: boolean;
    sortOrder: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    leaveType?: {
        id: string;
        name: string;
        nameTh: string | null;
        isPaid: boolean;
    };
    creator?: {
        id: string;
        email: string;
    };
}

// Create template request
export interface CreateTemplateRequest {
    name: string;
    nameTh?: string;
    description?: string;
    leaveTypeId: string;
    defaultDaysCount?: number;
    defaultReason?: string;
    isActive?: boolean;
    sortOrder?: number;
}

// Update template request
export interface UpdateTemplateRequest {
    name?: string;
    nameTh?: string | null;
    description?: string | null;
    leaveTypeId?: string;
    defaultDaysCount?: number | null;
    defaultReason?: string | null;
    isActive?: boolean;
    sortOrder?: number;
}

// Template draft result (for applyTemplate)
export interface TemplateDraft {
    leaveTypeId: string;
    startDate: string | null;
    endDate: string | null;
    totalDays: number | null;
    reason: string | null;
}

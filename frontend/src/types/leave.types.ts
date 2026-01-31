export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveType {
    id: string;
    companyId: string;
    name: string;
    nameTh?: string;
    description?: string;
    isPaid: boolean;
    maxDaysPerYear?: number;
    requiresApproval: boolean;
    requiresDocument: boolean;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

export interface LeaveRequest {
    id: string;
    companyId: string;
    employeeId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason?: string;
    documentUrl?: string;
    status: LeaveRequestStatus;
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNotes?: string;
    createdAt: string;
    updatedAt: string;

    // Populated fields
    employee?: {
        id: string;
        fullName: string;
        employeeCode: string;
    };
    leaveType?: LeaveType;
    reviewer?: {
        id: string;
        email: string;
    };
}

export interface LeaveBalance {
    id: string;
    companyId: string;
    employeeId: string;
    leaveTypeId: string;
    year: number;
    entitledDays: number;
    usedDays: number;
    pendingDays: number;
    createdAt: string;
    updatedAt: string;

    // Computed
    remainingDays: number;

    // Populated
    leaveType?: LeaveType;
    employee?: {
        id: string;
        fullName: string;
        employeeCode: string;
    };
}

export interface LeaveRequestPayload {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
}

// ============================================================================
// REPLACEMENT GUARD WORKFLOW TYPES
// ============================================================================

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

export interface AvailableReplacement {
    id: string;
    fullName: string;
    employeeCode: string;
    position: string | null;
    shiftCount: number;
}

export interface ReplacementAssignment {
    shiftId: string;
    replacementEmployeeId: string;
    reason?: string;
}

export interface ApproveWithReplacements {
    reviewNotes?: string;
    replacements?: ReplacementAssignment[];
}

export interface ConflictResolutionResult {
    leaveRequestId: string;
    totalConflicts: number;
    resolvedConflicts: number;
    unresolvedConflicts: number;
    assignedReplacements: ReplacementAssignment[];
}

// Balance Adjustment Types
export type AdjustmentFieldName = 'entitled_days' | 'used_days' | 'pending_days';
export type AdjustmentType = 'pro_rated' | 'correction' | 'special_allowance' | 'carry_forward' | 'manual';

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

export interface AdjustBalanceRequest {
    fieldName: AdjustmentFieldName;
    newValue: number;
    reason: string;
    adjustmentType?: AdjustmentType;
}

// ============================================================================
// LEAVE REQUEST TEMPLATE TYPES
// ============================================================================

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

export interface TemplateDraft {
    leaveTypeId: string;
    startDate: string | null;
    endDate: string | null;
    totalDays: number | null;
    reason: string | null;
}

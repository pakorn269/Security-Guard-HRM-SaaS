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
}

export interface LeaveRequestPayload {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
}

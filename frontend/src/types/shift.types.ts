export type ShiftStatus = 'draft' | 'published' | 'cancelled';

export interface ShiftTemplate {
    id: string;
    companyId: string;
    name: string;
    nameTh?: string | null;
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
    breakMinutes: number;
    color: string;
    isOvernight: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Shift {
    id: string;
    companyId: string;
    employeeId: string;
    templateId?: string | null;
    siteId?: string | null;
    zoneId?: string | null;
    date: string; // YYYY-MM-DD format
    startTime: string;
    endTime: string;
    location?: string | null;
    status: ShiftStatus;
    notes?: string | null;
    publishedAt?: string | null;
    createdBy?: string | null;
    createdAt: string;
    updatedAt: string;
    hasAttendance?: boolean; // Flag indicating if attendance logs exist for this shift
}

// Extended shift with employee and template info
export interface ShiftWithDetails extends Shift {
    employee?: {
        id: string;
        fullName: string;
        employeeCode: string;
    };
    template?: {
        id: string;
        name: string;
        nameTh: string | null;
        color: string;
    } | null;
    site?: {
        id: string;
        name: string;
        address?: string | null;
    } | null;
    zone?: {
        id: string;
        name: string;
        code?: string | null;
    } | null;
}

// Calendar types
export interface CalendarDay {
    date: string;
    shifts: ShiftWithDetails[];
    isToday: boolean;
    isCurrentMonth: boolean;
}

export interface CalendarDayData {
    date: string;
    shifts: ShiftWithDetails[];
}

export interface CalendarResponse {
    days: CalendarDayData[];
    meta: {
        startDate: string;
        endDate: string;
        totalShifts: number;
    };
}

// My shifts response (for guards)
export interface MyShiftsResponse {
    upcoming: ShiftWithDetails[];
    today: ShiftWithDetails | null;
    past: ShiftWithDetails[];
}

// Bulk create result
export interface ShiftConflict {
    existingShiftId: string;
    employeeId: string;
    employeeName: string;
    date: string;
    conflictType: 'overlap' | 'exact';
    existingTimeRange: string;
    newTimeRange: string;
}

export interface BulkCreateResult {
    created: Shift[];
    skipped: Array<{
        index: number;
        reason: string;
        conflict?: ShiftConflict;
    }>;
}

// Bulk publish result
export interface BulkPublishResult {
    successCount: number;
    notificationSentCount: number;
    skippedPastCount: number;
}

// Bulk delete result
export interface BulkDeleteResult {
    deletedCount: number;
    skippedCount: number;
    skippedIds: string[];
    skippedReasons: Array<{
        id: string;
        reason: string;
        reason_th: string;
    }>;
}

// Request types
export interface CreateShiftTemplateRequest {
    name: string;
    nameTh?: string;
    startTime: string;
    endTime: string;
    breakMinutes?: number;
    color?: string;
    isOvernight?: boolean;
}

export interface UpdateShiftTemplateRequest {
    name?: string;
    nameTh?: string | null;
    startTime?: string;
    endTime?: string;
    breakMinutes?: number;
    color?: string;
    isOvernight?: boolean;
    isActive?: boolean;
}

export interface CreateShiftRequest {
    employeeId: string;
    templateId?: string;
    siteId?: string;
    zoneId?: string;
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
    notes?: string;
}

export interface UpdateShiftRequest {
    employeeId?: string;
    templateId?: string | null;
    siteId?: string | null;
    zoneId?: string | null;
    date?: string;
    startTime?: string;
    endTime?: string;
    location?: string | null;
    notes?: string | null;
    status?: ShiftStatus;
}

export interface PublishShiftsRequest {
    shiftIds?: string[];
    startDate?: string;
    endDate?: string;
}

export interface CopyShiftsRequest {
    sourceStartDate: string;
    targetStartDate: string;
    employeeIds?: string[];
}


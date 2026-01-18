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
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
    notes?: string;
}

export interface UpdateShiftRequest {
    employeeId?: string;
    templateId?: string | null;
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


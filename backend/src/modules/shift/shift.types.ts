// Shift module types

export type ShiftStatus = 'draft' | 'published' | 'cancelled';

// ============================================================================
// SHIFT TEMPLATE TYPES
// ============================================================================

// Database row type for shift_templates
export interface ShiftTemplateRow {
    id: string;
    company_id: string;
    name: string;
    name_th: string | null;
    start_time: string; // TIME format: "HH:mm:ss"
    end_time: string;
    break_minutes: number;
    color: string;
    is_overnight: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// API response type for shift_templates
export interface ShiftTemplate {
    id: string;
    companyId: string;
    name: string;
    nameTh: string | null;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    color: string;
    isOvernight: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

// Create shift template request
export interface CreateShiftTemplateRequest {
    name: string;
    nameTh?: string;
    startTime: string; // HH:mm format
    endTime: string;
    breakMinutes?: number;
    color?: string;
    isOvernight?: boolean;
}

// Update shift template request
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

// List shift templates query
export interface ListShiftTemplatesQuery {
    includeInactive?: boolean;
}

// ============================================================================
// SHIFT TYPES
// ============================================================================

// Database row type for shifts
export interface ShiftRow {
    id: string;
    company_id: string;
    employee_id: string;
    template_id: string | null;
    date: string; // DATE format: "YYYY-MM-DD"
    start_time: string;
    end_time: string;
    location: string | null;
    status: ShiftStatus;
    notes: string | null;
    published_at: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

// Shift with employee info (joined)
export interface ShiftRowWithEmployee extends ShiftRow {
    employees: {
        id: string;
        full_name: string;
        employee_code: string;
    };
    shift_templates?: {
        id: string;
        name: string;
        name_th: string | null;
        color: string;
    } | null;
}

// API response type for shifts
export interface Shift {
    id: string;
    companyId: string;
    employeeId: string;
    templateId: string | null;
    date: string;
    startTime: string;
    endTime: string;
    location: string | null;
    status: ShiftStatus;
    notes: string | null;
    publishedAt: string | null;
    createdBy: string | null;
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
}

// Create shift request
export interface CreateShiftRequest {
    employeeId: string;
    templateId?: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string;
    location?: string;
    notes?: string;
}

// Bulk create shifts request
export interface BulkCreateShiftsRequest {
    shifts: CreateShiftRequest[];
}

// Update shift request
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

// List shifts query
export interface ListShiftsQuery {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    status?: ShiftStatus;
}

// Publish shifts request
export interface PublishShiftsRequest {
    shiftIds?: string[]; // If empty, publish all draft shifts in date range
    startDate?: string;
    endDate?: string;
}

// Copy shifts request (copy from one week to another)
export interface CopyShiftsRequest {
    sourceStartDate: string; // Monday of source week
    targetStartDate: string; // Monday of target week
    employeeIds?: string[];  // If empty, copy all employee shifts
}

// Calendar data response
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

// Shift conflict info
export interface ShiftConflict {
    existingShiftId: string;
    employeeId: string;
    employeeName: string;
    date: string;
    conflictType: 'overlap' | 'exact';
    existingTimeRange: string;
    newTimeRange: string;
}

// Bulk create response
export interface BulkCreateResult {
    created: Shift[];
    skipped: Array<{
        index: number;
        reason: string;
        reason_th?: string;
        conflict?: ShiftConflict;
    }>;
}

// Bulk publish request
export interface BulkPublishRequest {
    shiftIds: string[];
}

// Bulk publish response
export interface BulkPublishResult {
    successCount: number;
    notificationSentCount: number;
    skippedPastCount: number;
}

// Bulk delete request
export interface BulkDeleteRequest {
    shiftIds: string[];
}

// Bulk delete response
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

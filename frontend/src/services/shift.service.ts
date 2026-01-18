import api from './api';
import type {
    ShiftTemplate,
    Shift,
    ShiftWithDetails,
    CalendarResponse,
    MyShiftsResponse,
    BulkCreateResult,
    CreateShiftTemplateRequest,
    UpdateShiftTemplateRequest,
    CreateShiftRequest,
    UpdateShiftRequest,
    PublishShiftsRequest,
    CopyShiftsRequest,
} from '../types/shift.types';

// Query types
export interface ListShiftsQuery {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    status?: 'draft' | 'published' | 'cancelled';
}

export interface CalendarQuery {
    startDate: string;
    endDate: string;
    employeeId?: string;
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
// SHIFT TEMPLATE API
// ============================================================================

export async function listShiftTemplates(includeInactive = false): Promise<ShiftTemplate[]> {
    const response = await api.get<ApiResponse<ShiftTemplate[]>>('/shifts/templates', {
        params: { includeInactive },
    });
    return response.data.data;
}

export async function getShiftTemplate(id: string): Promise<ShiftTemplate> {
    const response = await api.get<ApiResponse<ShiftTemplate>>(`/shifts/templates/${id}`);
    return response.data.data;
}

export async function createShiftTemplate(data: CreateShiftTemplateRequest): Promise<ShiftTemplate> {
    const response = await api.post<ApiResponse<ShiftTemplate>>('/shifts/templates', data);
    return response.data.data;
}

export async function updateShiftTemplate(
    id: string,
    data: UpdateShiftTemplateRequest
): Promise<ShiftTemplate> {
    const response = await api.put<ApiResponse<ShiftTemplate>>(`/shifts/templates/${id}`, data);
    return response.data.data;
}

export async function deleteShiftTemplate(id: string): Promise<void> {
    await api.delete(`/shifts/templates/${id}`);
}

// ============================================================================
// SHIFT API
// ============================================================================

export async function listShifts(
    query: ListShiftsQuery = {}
): Promise<{ shifts: ShiftWithDetails[]; total: number; pagination: ApiResponse<unknown>['meta'] }> {
    const response = await api.get<ApiResponse<ShiftWithDetails[]>>('/shifts', {
        params: query,
    });
    return {
        shifts: response.data.data,
        total: response.data.meta?.pagination?.total ?? 0,
        pagination: response.data.meta,
    };
}

export async function getShift(id: string): Promise<ShiftWithDetails> {
    const response = await api.get<ApiResponse<ShiftWithDetails>>(`/shifts/${id}`);
    return response.data.data;
}

export async function createShift(data: CreateShiftRequest): Promise<Shift> {
    const response = await api.post<ApiResponse<Shift>>('/shifts', data);
    return response.data.data;
}

export async function bulkCreateShifts(shifts: CreateShiftRequest[]): Promise<BulkCreateResult> {
    const response = await api.post<ApiResponse<BulkCreateResult>>('/shifts/bulk', { shifts });
    return response.data.data;
}

export async function updateShift(id: string, data: UpdateShiftRequest): Promise<Shift> {
    const response = await api.put<ApiResponse<Shift>>(`/shifts/${id}`, data);
    return response.data.data;
}

export async function deleteShift(id: string): Promise<void> {
    await api.delete(`/shifts/${id}`);
}

export async function publishShifts(data: PublishShiftsRequest): Promise<{ publishedCount: number }> {
    const response = await api.post<ApiResponse<{ publishedCount: number; shifts: Shift[] }>>(
        '/shifts/publish',
        data
    );
    return { publishedCount: response.data.data.publishedCount };
}

export async function copyShifts(data: CopyShiftsRequest): Promise<BulkCreateResult> {
    const response = await api.post<ApiResponse<BulkCreateResult>>('/shifts/copy', data);
    return response.data.data;
}

// ============================================================================
// CALENDAR API
// ============================================================================

export async function getCalendarData(query: CalendarQuery): Promise<CalendarResponse> {
    const response = await api.get<ApiResponse<CalendarResponse>>('/shifts/calendar', {
        params: query,
    });
    return response.data.data;
}

// ============================================================================
// MY SHIFTS API (for guards)
// ============================================================================

export async function getMyShifts(days = 7): Promise<MyShiftsResponse> {
    const response = await api.get<ApiResponse<MyShiftsResponse>>('/shifts/my', {
        params: { days },
    });
    return response.data.data;
}

// Re-export types for convenience
export type {
    ShiftTemplate,
    Shift,
    ShiftWithDetails,
    CalendarResponse,
    MyShiftsResponse,
    BulkCreateResult,
    CreateShiftTemplateRequest,
    UpdateShiftTemplateRequest,
    CreateShiftRequest,
    UpdateShiftRequest,
    PublishShiftsRequest,
    CopyShiftsRequest,
};

export default {
    // Templates
    listShiftTemplates,
    getShiftTemplate,
    createShiftTemplate,
    updateShiftTemplate,
    deleteShiftTemplate,
    // Shifts
    listShifts,
    getShift,
    createShift,
    bulkCreateShifts,
    updateShift,
    deleteShift,
    publishShifts,
    copyShifts,
    // Calendar
    getCalendarData,
    // My shifts
    getMyShifts,
};

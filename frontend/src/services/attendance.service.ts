import api from './api';
import type {
    AttendanceLog,
    AttendanceStatus,
    ClockInRequest,
    ClockOutRequest,
} from '../types/attendance.types';

// ============================================================================
// TYPES
// ============================================================================

export interface TodayAttendanceResponse {
    hasShiftToday: boolean;
    shift: {
        id: string;
        date: string;
        startTime: string;
        endTime: string;
        location: string | null;
    } | null;
    attendance: AttendanceLogWithDetails | null;
    canClockIn: boolean;
    canClockOut: boolean;
    currentStatus: 'not_clocked_in' | 'clocked_in' | 'clocked_out' | 'no_shift';
    // Time debugging info
    serverTime: string; // ISO format server time
    companyTimezone: string; // IANA timezone (e.g., 'Asia/Bangkok')
}

export interface AttendanceLogWithDetails {
    id: string;
    companyId: string;
    employeeId: string;
    shiftId?: string;
    clockInTime?: string;
    clockInLatitude?: number;
    clockInLongitude?: number;
    clockInAccuracy?: number;
    clockOutTime?: string;
    clockOutLatitude?: number;
    clockOutLongitude?: number;
    clockOutAccuracy?: number;
    status: AttendanceStatus;
    totalHours?: number;
    overtimeHours?: number;
    notes?: string;
    adjustedBy?: string;
    adjustmentReason?: string;
    createdAt: string;
    updatedAt: string;
    employee?: {
        id: string;
        fullName: string;
        employeeCode: string;
    };
    shift?: {
        id: string;
        date: string;
        startTime: string;
        endTime: string;
        location: string | null;
    } | null;
}

export interface MyAttendanceResponse {
    today: TodayAttendanceResponse;
    recent: AttendanceLogWithDetails[];
}

export interface ClockInResponse {
    attendance: AttendanceLogWithDetails;
    totalHours?: number;
}

export interface ClockOutResponse {
    attendance: AttendanceLogWithDetails;
    totalHours: number;
}

export interface AttendanceSummary {
    date: string;
    totalEmployees: number;
    expectedToWork: number;
    clockedIn: number;
    onTime: number;
    late: number;
    noShow: number;
    completed: number;
}

export interface DailyAttendanceReport {
    summary: AttendanceSummary;
    records: AttendanceLogWithDetails[];
}

export interface ListAttendanceQuery {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    status?: AttendanceStatus;
}

export interface AdjustAttendanceRequest {
    clockInTime?: string;
    clockOutTime?: string;
    status?: AttendanceStatus;
    notes?: string;
    adjustmentReason: string;
}

export interface CreateAttendanceRequest {
    employeeId: string;
    shiftId?: string;
    clockInTime: string;
    clockInLatitude?: number;
    clockInLongitude?: number;
    clockOutTime?: string;
    clockOutLatitude?: number;
    clockOutLongitude?: number;
    status?: AttendanceStatus;
    notes?: string;
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
// GUARD API (for LIFF)
// ============================================================================

export async function clockIn(data: ClockInRequest): Promise<ClockInResponse> {
    const response = await api.post<ApiResponse<AttendanceLogWithDetails>>('/attendance/clock-in', data);
    return {
        attendance: response.data.data,
    };
}

export async function clockOut(data: ClockOutRequest): Promise<ClockOutResponse> {
    const response = await api.post<ApiResponse<{ attendance: AttendanceLogWithDetails; totalHours: number }>>(
        '/attendance/clock-out',
        data
    );
    return response.data.data;
}

export async function getTodayAttendance(date?: string): Promise<TodayAttendanceResponse> {
    const response = await api.get<ApiResponse<TodayAttendanceResponse>>('/attendance/today', {
        params: date ? { date } : undefined,
    });
    return response.data.data;
}

export async function getMyAttendance(days = 14): Promise<MyAttendanceResponse> {
    const response = await api.get<ApiResponse<MyAttendanceResponse>>('/attendance/my', {
        params: { days },
    });
    return response.data.data;
}

// ============================================================================
// MANAGER API
// ============================================================================

export async function listAttendance(
    query: ListAttendanceQuery = {}
): Promise<{ records: AttendanceLogWithDetails[]; total: number; pagination: ApiResponse<unknown>['meta'] }> {
    const response = await api.get<ApiResponse<AttendanceLogWithDetails[]>>('/attendance', {
        params: query,
    });
    return {
        records: response.data.data,
        total: response.data.meta?.pagination?.total ?? 0,
        pagination: response.data.meta,
    };
}

export async function getAttendanceById(id: string): Promise<AttendanceLogWithDetails> {
    const response = await api.get<ApiResponse<AttendanceLogWithDetails>>(`/attendance/${id}`);
    return response.data.data;
}

export async function getDailyReport(date: string): Promise<DailyAttendanceReport> {
    const response = await api.get<ApiResponse<DailyAttendanceReport>>('/attendance/report', {
        params: { date },
    });
    return response.data.data;
}

export async function adjustAttendance(
    id: string,
    data: AdjustAttendanceRequest
): Promise<AttendanceLogWithDetails> {
    const response = await api.put<ApiResponse<AttendanceLogWithDetails>>(`/attendance/${id}`, data);
    return response.data.data;
}

export async function createAttendance(data: CreateAttendanceRequest): Promise<AttendanceLogWithDetails> {
    const response = await api.post<ApiResponse<AttendanceLogWithDetails>>('/attendance', data);
    return response.data.data;
}

// Re-export types for convenience
export type { AttendanceLog, AttendanceStatus, ClockInRequest, ClockOutRequest };

export default {
    // Guard API
    clockIn,
    clockOut,
    getTodayAttendance,
    getMyAttendance,
    // Manager API
    listAttendance,
    getAttendanceById,
    getDailyReport,
    adjustAttendance,
    createAttendance,
};

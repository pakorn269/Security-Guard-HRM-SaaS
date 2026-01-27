// Attendance module types

export type AttendanceStatus =
    | 'pending'
    | 'on_time'
    | 'late'
    | 'early_leave'
    | 'no_show'
    | 'completed';

// ============================================================================
// DATABASE ROW TYPES
// ============================================================================

// Database row type for attendance_logs
export interface AttendanceLogRow {
    id: string;
    company_id: string;
    employee_id: string;
    shift_id: string | null;
    site_id: string | null;
    zone_id: string | null;

    clock_in_time: string | null;
    clock_in_latitude: number | null;
    clock_in_longitude: number | null;
    clock_in_accuracy: number | null;
    check_in_method: 'GPS' | 'QR' | null;

    clock_out_time: string | null;
    clock_out_latitude: number | null;
    clock_out_longitude: number | null;
    clock_out_accuracy: number | null;

    status: AttendanceStatus;
    total_hours: number | null;
    overtime_hours: number | null;

    notes: string | null;
    adjusted_by: string | null;
    adjustment_reason: string | null;

    created_at: string;
    updated_at: string;
}

// Attendance log with employee info (joined)
export interface AttendanceLogRowWithEmployee extends AttendanceLogRow {
    employees: {
        id: string;
        full_name: string;
        employee_code: string;
    };
    shifts?: {
        id: string;
        date: string;
        start_time: string;
        end_time: string;
        location: string | null;
    } | null;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

// API response type for attendance_logs
export interface AttendanceLog {
    id: string;
    companyId: string;
    employeeId: string;
    shiftId: string | null;
    siteId: string | null;
    zoneId: string | null;

    clockInTime: string | null;
    clockInLatitude: number | null;
    clockInLongitude: number | null;
    clockInAccuracy: number | null;
    checkInMethod: 'GPS' | 'QR' | null;

    clockOutTime: string | null;
    clockOutLatitude: number | null;
    clockOutLongitude: number | null;
    clockOutAccuracy: number | null;

    status: AttendanceStatus;
    totalHours: number | null;
    overtimeHours: number | null;

    notes: string | null;
    adjustedBy: string | null;
    adjustmentReason: string | null;

    createdAt: string;
    updatedAt: string;
}

// Extended attendance log with employee and shift info
export interface AttendanceLogWithDetails extends AttendanceLog {
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

// ============================================================================
// REQUEST TYPES
// ============================================================================

// Clock-in request
export interface ClockInRequest {
    shiftId?: string; // optional, auto-detect if not provided
    latitude: number;
    longitude: number;
    accuracy: number;
    siteId: string; // Site ID for geofence validation
    zoneQrCode?: string; // Optional QR code for zone-based check-in
}

// Clock-out request
export interface ClockOutRequest {
    latitude: number;
    longitude: number;
    accuracy: number;
}

// Attendance adjustment request
export interface AdjustAttendanceRequest {
    clockInTime?: string;
    clockOutTime?: string;
    status?: AttendanceStatus;
    notes?: string;
    adjustmentReason: string;
}

// Create attendance record manually (admin)
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

// ============================================================================
// QUERY TYPES
// ============================================================================

// List attendance query
export interface ListAttendanceQuery {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    status?: AttendanceStatus;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

// Clock-in response
export interface ClockInResponse {
    attendance: AttendanceLogWithDetails;
    message: string;
}

// Clock-out response
export interface ClockOutResponse {
    attendance: AttendanceLogWithDetails;
    totalHours: number;
    message: string;
}

// Today's attendance status
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

// My attendance response (for guards)
export interface MyAttendanceResponse {
    today: TodayAttendanceResponse;
    recent: AttendanceLogWithDetails[];
}

// Attendance summary for dashboard
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

// Daily attendance report
export interface DailyAttendanceReport {
    summary: AttendanceSummary;
    records: AttendanceLogWithDetails[];
}

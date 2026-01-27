export type AttendanceStatus =
    | 'pending'
    | 'on_time'
    | 'late'
    | 'early_leave'
    | 'no_show'
    | 'completed';

export interface AttendanceLog {
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

    // Populated fields
    employee?: {
        id: string;
        fullName: string;
        employeeCode: string;
    };
    shift?: {
        id: string;
        startTime: string;
        endTime: string;
        location?: string;
    };
}

export interface ClockInRequest {
    shiftId?: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    siteId?: string; // Optional: will use shift's siteId if not provided
    zoneQrCode?: string;
}

export interface ClockOutRequest {
    latitude: number;
    longitude: number;
    accuracy: number;
}

export interface AttendanceSummary {
    date: string;
    totalEmployees: number;
    clockedIn: number;
    onTime: number;
    late: number;
    noShow: number;
    completed: number;
}

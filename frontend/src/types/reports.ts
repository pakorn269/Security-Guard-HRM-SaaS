/**
 * Reports Types
 * Types for frontend reports module
 */

export interface AttendanceSummaryRow {
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    totalShifts: number;
    onTimeCount: number;
    lateCount: number;
    earlyDepartureCount: number;
    absentCount: number;
    totalHoursWorked: number;
    overtimeHours: number;
    averageClockInTime: string | null;
    averageClockOutTime: string | null;
    attendanceRate: number;
}

export interface AttendanceSummaryReport {
    period: {
        startDate: string;
        endDate: string;
    };
    summary: {
        totalEmployees: number;
        totalShifts: number;
        totalOnTime: number;
        totalLate: number;
        totalAbsent: number;
        averageAttendanceRate: number;
        averageOnTimeRate: number;
    };
    employees: AttendanceSummaryRow[];
    generatedAt: string;
}

export interface LeaveUsageRow {
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    leaveTypeId: string;
    leaveTypeName: string;
    leaveTypeNameTh: string;
    entitledDays: number;
    usedDays: number;
    pendingDays: number;
    remainingDays: number;
    usageRate: number;
}

export interface LeaveUsageReport {
    year: number;
    summary: {
        totalEmployees: number;
        totalLeaveTypes: number;
        totalEntitledDays: number;
        totalUsedDays: number;
        totalPendingDays: number;
        averageUsageRate: number;
    };
    byLeaveType: {
        leaveTypeId: string;
        leaveTypeName: string;
        leaveTypeNameTh: string;
        totalEntitled: number;
        totalUsed: number;
        totalPending: number;
        usageRate: number;
    }[];
    employees: LeaveUsageRow[];
    generatedAt: string;
}

export interface AttendanceTrendData {
    date: string;
    onTimeCount: number;
    lateCount: number;
    absentCount: number;
    totalCount: number;
}

export interface AttendanceTrendReport {
    period: {
        startDate: string;
        endDate: string;
    };
    trend: AttendanceTrendData[];
    generatedAt: string;
}

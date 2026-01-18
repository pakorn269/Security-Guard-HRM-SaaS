/**
 * Reports Service
 * Business logic for generating attendance and leave reports
 */

import { supabaseAdmin } from '../../config/supabase.js';
import logger from '../../utils/logger.js';
import type {
    AttendanceSummaryReportQuery,
    AttendanceSummaryReport,
    AttendanceSummaryRow,
    LeaveUsageReportQuery,
    LeaveUsageReport,
    LeaveUsageRow,
    AttendanceTrendReport,
    AttendanceTrendData,
} from './reports.types.js';

export class ReportsService {
    /**
     * Generate Attendance Summary Report
     */
    async getAttendanceSummary(
        companyId: string,
        query: AttendanceSummaryReportQuery
    ): Promise<AttendanceSummaryReport> {
        const { startDate, endDate, employeeId, status } = query;

        logger.info(`Generating attendance summary report for company ${companyId}`, {
            startDate,
            endDate,
            employeeId,
            status,
        });

        // Get all employees
        let employeeQuery = supabaseAdmin
            .from('employees')
            .select('id, employee_code, full_name')
            .eq('company_id', companyId)
            .eq('status', 'active');

        if (employeeId) {
            employeeQuery = employeeQuery.eq('id', employeeId);
        }

        const { data: employees, error: empError } = await employeeQuery;

        if (empError) {
            logger.error('Error fetching employees for report', empError);
            throw new Error('Failed to fetch employees');
        }

        // Get all attendance records for the period
        // Note: attendance_logs uses clock_in_time (TIMESTAMPTZ), not date
        let attendanceQuery = supabaseAdmin
            .from('attendance_logs')
            .select('*')
            .eq('company_id', companyId)
            .gte('clock_in_time', startDate)
            .lte('clock_in_time', endDate + 'T23:59:59');

        if (employeeId) {
            attendanceQuery = attendanceQuery.eq('employee_id', employeeId);
        }

        if (status) {
            attendanceQuery = attendanceQuery.eq('status', status);
        }

        const { data: attendanceRecords, error: attError } = await attendanceQuery;

        if (attError) {
            logger.error('Error fetching attendance records for report', attError);
            throw new Error('Failed to fetch attendance records');
        }

        // Get all shifts for the period
        const { data: shifts, error: shiftError } = await supabaseAdmin
            .from('shifts')
            .select('*')
            .eq('company_id', companyId)
            .gte('date', startDate)
            .lte('date', endDate)
            .eq('status', 'published');

        if (shiftError) {
            logger.error('Error fetching shifts for report', shiftError);
            throw new Error('Failed to fetch shifts');
        }

        // Calculate summary for each employee
        const employeeRows: AttendanceSummaryRow[] = [];
        let totalOnTime = 0;
        let totalLate = 0;
        let totalAbsent = 0;
        let totalShiftsAll = 0;

        for (const emp of employees || []) {
            const empShifts = (shifts || []).filter((s: any) => s.employee_id === emp.id);
            const empAttendance = (attendanceRecords || []).filter((a: any) => a.employee_id === emp.id);

            const onTimeCount = empAttendance.filter((a: any) => a.status === 'on_time').length;
            const lateCount = empAttendance.filter((a: any) => a.status === 'late').length;
            const earlyDepartureCount = empAttendance.filter((a: any) => a.status === 'early_departure').length;
            const presentCount = empAttendance.filter((a: any) => a.clock_in_time).length;
            const absentCount = empShifts.length - presentCount;

            // Calculate total hours worked
            let totalHoursWorked = 0;
            let overtimeHours = 0;
            for (const att of empAttendance) {
                if (att.total_hours) {
                    totalHoursWorked += att.total_hours;
                }
                if (att.overtime_hours) {
                    overtimeHours += att.overtime_hours;
                }
            }

            // Calculate average clock times
            let avgClockIn: string | null = null;
            let avgClockOut: string | null = null;
            const clockInTimes = empAttendance
                .filter((a: any) => a.clock_in_time)
                .map((a: any) => {
                    const time = new Date(`2000-01-01T${a.clock_in_time}`);
                    return time.getHours() * 60 + time.getMinutes();
                });
            const clockOutTimes = empAttendance
                .filter((a: any) => a.clock_out_time)
                .map((a: any) => {
                    const time = new Date(`2000-01-01T${a.clock_out_time}`);
                    return time.getHours() * 60 + time.getMinutes();
                });

            if (clockInTimes.length > 0) {
                const avgMinutes = Math.round(
                    clockInTimes.reduce((a: number, b: number) => a + b, 0) / clockInTimes.length
                );
                const hours = Math.floor(avgMinutes / 60);
                const minutes = avgMinutes % 60;
                avgClockIn = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }

            if (clockOutTimes.length > 0) {
                const avgMinutes = Math.round(
                    clockOutTimes.reduce((a: number, b: number) => a + b, 0) / clockOutTimes.length
                );
                const hours = Math.floor(avgMinutes / 60);
                const minutes = avgMinutes % 60;
                avgClockOut = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }

            const attendanceRate = empShifts.length > 0
                ? Math.round((presentCount / empShifts.length) * 100)
                : 0;

            employeeRows.push({
                employeeId: emp.id,
                employeeCode: emp.employee_code || '',
                employeeName: (emp as any).full_name || 'Unknown',
                totalShifts: empShifts.length,
                onTimeCount,
                lateCount,
                earlyDepartureCount,
                absentCount: absentCount > 0 ? absentCount : 0,
                totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
                overtimeHours: Math.round(overtimeHours * 100) / 100,
                averageClockInTime: avgClockIn,
                averageClockOutTime: avgClockOut,
                attendanceRate,
            });

            totalOnTime += onTimeCount;
            totalLate += lateCount;
            totalAbsent += absentCount > 0 ? absentCount : 0;
            totalShiftsAll += empShifts.length;
        }

        const avgAttendanceRate = employeeRows.length > 0
            ? Math.round(employeeRows.reduce((acc, row) => acc + row.attendanceRate, 0) / employeeRows.length)
            : 0;

        const avgOnTimeRate = totalShiftsAll > 0
            ? Math.round((totalOnTime / (totalOnTime + totalLate)) * 100) || 0
            : 0;

        return {
            period: {
                startDate,
                endDate,
            },
            summary: {
                totalEmployees: employeeRows.length,
                totalShifts: totalShiftsAll,
                totalOnTime,
                totalLate,
                totalAbsent,
                averageAttendanceRate: avgAttendanceRate,
                averageOnTimeRate: avgOnTimeRate,
            },
            employees: employeeRows,
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * Generate Leave Usage Report
     */
    async getLeaveUsage(
        companyId: string,
        query: LeaveUsageReportQuery
    ): Promise<LeaveUsageReport> {
        const { year, leaveTypeId, employeeId } = query;

        logger.info(`Generating leave usage report for company ${companyId}`, {
            year,
            leaveTypeId,
            employeeId,
        });

        // Get all leave types
        let leaveTypeQuery = supabaseAdmin
            .from('leave_types')
            .select('*')
            .eq('company_id', companyId)
            .eq('is_active', true);

        if (leaveTypeId) {
            leaveTypeQuery = leaveTypeQuery.eq('id', leaveTypeId);
        }

        const { data: leaveTypes, error: ltError } = await leaveTypeQuery;

        if (ltError) {
            logger.error('Error fetching leave types for report', ltError);
            throw new Error('Failed to fetch leave types');
        }

        // Get all employees
        let empQuery = supabaseAdmin
            .from('employees')
            .select('id, employee_code, full_name')
            .eq('company_id', companyId)
            .eq('status', 'active');

        if (employeeId) {
            empQuery = empQuery.eq('id', employeeId);
        }

        const { data: employees, error: empError } = await empQuery;

        if (empError) {
            logger.error('Error fetching employees for leave report', empError);
            throw new Error('Failed to fetch employees');
        }

        // Get all leave balances for the year
        let balanceQuery = supabaseAdmin
            .from('leave_balances')
            .select('*')
            .eq('company_id', companyId)
            .eq('year', year);

        if (employeeId) {
            balanceQuery = balanceQuery.eq('employee_id', employeeId);
        }

        if (leaveTypeId) {
            balanceQuery = balanceQuery.eq('leave_type_id', leaveTypeId);
        }

        const { data: balances, error: balError } = await balanceQuery;

        if (balError) {
            logger.error('Error fetching leave balances for report', balError);
            throw new Error('Failed to fetch leave balances');
        }

        // Get pending leave requests
        const startOfYear = `${year}-01-01`;
        const endOfYear = `${year}-12-31`;

        let requestQuery = supabaseAdmin
            .from('leave_requests')
            .select('*')
            .eq('company_id', companyId)
            .eq('status', 'pending')
            .gte('start_date', startOfYear)
            .lte('start_date', endOfYear);

        if (employeeId) {
            requestQuery = requestQuery.eq('employee_id', employeeId);
        }

        if (leaveTypeId) {
            requestQuery = requestQuery.eq('leave_type_id', leaveTypeId);
        }

        const { data: pendingRequests, error: reqError } = await requestQuery;

        if (reqError) {
            logger.error('Error fetching pending requests for report', reqError);
            throw new Error('Failed to fetch pending requests');
        }

        // Build employee rows
        const employeeRows: LeaveUsageRow[] = [];
        const byLeaveType: Map<string, {
            leaveTypeId: string;
            leaveTypeName: string;
            leaveTypeNameTh: string;
            totalEntitled: number;
            totalUsed: number;
            totalPending: number;
        }> = new Map();

        for (const emp of employees || []) {
            for (const lt of leaveTypes || []) {
                const balance = (balances || []).find(
                    (b: any) => b.employee_id === emp.id && b.leave_type_id === lt.id
                );

                const empPending = (pendingRequests || []).filter(
                    (r: any) => r.employee_id === emp.id && r.leave_type_id === lt.id
                );
                const pendingDays = empPending.reduce((acc: number, r: any) => acc + (r.total_days || 0), 0);

                const entitledDays = balance?.entitled_days || lt.default_days || 0;
                const usedDays = balance?.used_days || 0;
                const remainingDays = entitledDays - usedDays - pendingDays;
                const usageRate = entitledDays > 0 ? Math.round((usedDays / entitledDays) * 100) : 0;

                employeeRows.push({
                    employeeId: emp.id,
                    employeeCode: emp.employee_code || '',
                    employeeName: (emp as any).full_name || 'Unknown',
                    leaveTypeId: lt.id,
                    leaveTypeName: lt.name,
                    leaveTypeNameTh: lt.name_th,
                    entitledDays,
                    usedDays,
                    pendingDays,
                    remainingDays: remainingDays > 0 ? remainingDays : 0,
                    usageRate,
                });

                // Aggregate by leave type
                if (!byLeaveType.has(lt.id)) {
                    byLeaveType.set(lt.id, {
                        leaveTypeId: lt.id,
                        leaveTypeName: lt.name,
                        leaveTypeNameTh: lt.name_th,
                        totalEntitled: 0,
                        totalUsed: 0,
                        totalPending: 0,
                    });
                }

                const ltData = byLeaveType.get(lt.id)!;
                ltData.totalEntitled += entitledDays;
                ltData.totalUsed += usedDays;
                ltData.totalPending += pendingDays;
            }
        }

        // Calculate summary
        const totalEntitled = employeeRows.reduce((acc, row) => acc + row.entitledDays, 0);
        const totalUsed = employeeRows.reduce((acc, row) => acc + row.usedDays, 0);
        const totalPending = employeeRows.reduce((acc, row) => acc + row.pendingDays, 0);
        const avgUsageRate = totalEntitled > 0 ? Math.round((totalUsed / totalEntitled) * 100) : 0;

        const byLeaveTypeResult = Array.from(byLeaveType.values()).map(lt => ({
            ...lt,
            usageRate: lt.totalEntitled > 0 ? Math.round((lt.totalUsed / lt.totalEntitled) * 100) : 0,
        }));

        return {
            year,
            summary: {
                totalEmployees: (employees || []).length,
                totalLeaveTypes: (leaveTypes || []).length,
                totalEntitledDays: totalEntitled,
                totalUsedDays: totalUsed,
                totalPendingDays: totalPending,
                averageUsageRate: avgUsageRate,
            },
            byLeaveType: byLeaveTypeResult,
            employees: employeeRows,
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * Generate Attendance Trend Report
     */
    async getAttendanceTrend(
        companyId: string,
        startDate: string,
        endDate: string
    ): Promise<AttendanceTrendReport> {
        logger.info(`Generating attendance trend report for company ${companyId}`, {
            startDate,
            endDate,
        });

        // Get all attendance records for the period
        // Note: attendance_logs uses clock_in_time (TIMESTAMPTZ), not date
        const { data: attendanceRecords, error: attError } = await supabaseAdmin
            .from('attendance_logs')
            .select('clock_in_time, status')
            .eq('company_id', companyId)
            .gte('clock_in_time', startDate)
            .lte('clock_in_time', endDate + 'T23:59:59')
            .order('clock_in_time', { ascending: true });

        if (attError) {
            logger.error('Error fetching attendance for trend', attError);
            throw new Error('Failed to fetch attendance records');
        }

        // Get all shifts for the period
        const { data: shifts, error: shiftError } = await supabaseAdmin
            .from('shifts')
            .select('date, employee_id')
            .eq('company_id', companyId)
            .gte('date', startDate)
            .lte('date', endDate)
            .eq('status', 'published');

        if (shiftError) {
            logger.error('Error fetching shifts for trend', shiftError);
            throw new Error('Failed to fetch shifts');
        }

        // Group by date
        const dateMap: Map<string, AttendanceTrendData> = new Map();

        // Initialize with dates from shifts
        for (const shift of shifts || []) {
            if (!dateMap.has(shift.date)) {
                dateMap.set(shift.date, {
                    date: shift.date,
                    onTimeCount: 0,
                    lateCount: 0,
                    absentCount: 0,
                    totalCount: 0,
                });
            }
            dateMap.get(shift.date)!.totalCount++;
        }

        // Count attendance status
        for (const att of attendanceRecords || []) {
            // Extract date from clock_in_time (TIMESTAMPTZ)
            const attDate = att.clock_in_time ? att.clock_in_time.split('T')[0] : null;
            if (attDate && dateMap.has(attDate)) {
                if (att.status === 'on_time') {
                    dateMap.get(attDate)!.onTimeCount++;
                } else if (att.status === 'late') {
                    dateMap.get(attDate)!.lateCount++;
                }
            }
        }

        // Calculate absences
        for (const [, data] of dateMap) {
            data.absentCount = data.totalCount - data.onTimeCount - data.lateCount;
            if (data.absentCount < 0) data.absentCount = 0;
        }

        // Sort by date
        const trend = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

        return {
            period: {
                startDate,
                endDate,
            },
            trend,
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * Export report to CSV format
     */
    generateCSV(data: Record<string, any>[], headers: string[]): string {
        const csv: string[] = [];

        // Add header row
        csv.push(headers.join(','));

        // Add data rows
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                if (value === null || value === undefined) return '';
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return String(value);
            });
            csv.push(values.join(','));
        }

        return csv.join('\n');
    }
}

export const reportsService = new ReportsService();
export default reportsService;

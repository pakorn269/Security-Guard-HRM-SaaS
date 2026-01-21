import { supabaseAdmin } from '../../config/supabase.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';
import type {
    AttendanceLog,
    AttendanceLogRow,
    AttendanceLogRowWithEmployee,
    AttendanceLogWithDetails,
    AttendanceStatus,
    ClockInRequest,
    ClockOutRequest,
    AdjustAttendanceRequest,
    CreateAttendanceRequest,
    ListAttendanceQuery,
    ClockInResponse,
    ClockOutResponse,
    TodayAttendanceResponse,
    MyAttendanceResponse,
    AttendanceSummary,
    DailyAttendanceReport,
} from './attendance.types.js';

class AttendanceService {
    // ========================================================================
    // MAPPING FUNCTIONS
    // ========================================================================

    // Map database row to AttendanceLog
    private mapToAttendanceLog(row: AttendanceLogRow): AttendanceLog {
        return {
            id: row.id,
            companyId: row.company_id,
            employeeId: row.employee_id,
            shiftId: row.shift_id,
            clockInTime: row.clock_in_time,
            clockInLatitude: row.clock_in_latitude,
            clockInLongitude: row.clock_in_longitude,
            clockInAccuracy: row.clock_in_accuracy,
            clockOutTime: row.clock_out_time,
            clockOutLatitude: row.clock_out_latitude,
            clockOutLongitude: row.clock_out_longitude,
            clockOutAccuracy: row.clock_out_accuracy,
            status: row.status as AttendanceStatus,
            totalHours: row.total_hours,
            overtimeHours: row.overtime_hours,
            notes: row.notes,
            adjustedBy: row.adjusted_by,
            adjustmentReason: row.adjustment_reason,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    // Map database row with relations to AttendanceLogWithDetails
    private mapToAttendanceLogWithDetails(row: AttendanceLogRowWithEmployee): AttendanceLogWithDetails {
        const base = this.mapToAttendanceLog(row);
        return {
            ...base,
            employee: row.employees
                ? {
                    id: row.employees.id,
                    fullName: row.employees.full_name,
                    employeeCode: row.employees.employee_code,
                }
                : undefined,
            shift: row.shifts
                ? {
                    id: row.shifts.id,
                    date: row.shifts.date,
                    startTime: row.shifts.start_time,
                    endTime: row.shifts.end_time,
                    location: row.shifts.location,
                }
                : null,
        };
    }

    // ========================================================================
    // CLOCK IN/OUT FUNCTIONS
    // ========================================================================

    // Clock in - auto-detect shift for today
    async clockIn(
        companyId: string,
        employeeId: string,
        data: ClockInRequest
    ): Promise<ClockInResponse> {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // Check if already clocked in today
        const { data: existingAttendance } = await supabaseAdmin
            .from('attendance_logs')
            .select('id, clock_in_time, clock_out_time')
            .eq('company_id', companyId)
            .eq('employee_id', employeeId)
            .gte('clock_in_time', `${today}T00:00:00`)
            .lte('clock_in_time', `${today}T23:59:59`)
            .is('clock_out_time', null)
            .maybeSingle();

        if (existingAttendance) {
            throw new BadRequestError(
                'Already clocked in. Please clock out first.',
                'คุณได้ลงเวลาเข้าแล้ว กรุณาลงเวลาออกก่อน'
            );
        }

        // Find today's shift for this employee
        let shiftId = data.shiftId;
        let shiftStartTime: string | null = null;
        let shiftData: {
            id: string;
            date: string;
            start_time: string;
            end_time: string;
            location: string | null;
        } | null = null;

        if (!shiftId) {
            // Auto-detect shift for today
            const { data: shifts } = await supabaseAdmin
                .from('shifts')
                .select('id, date, start_time, end_time, location')
                .eq('company_id', companyId)
                .eq('employee_id', employeeId)
                .eq('date', today)
                .eq('status', 'published')
                .limit(1);

            if (shifts && shifts.length > 0) {
                shiftId = shifts[0].id;
                shiftData = shifts[0];
                shiftStartTime = shifts[0].start_time;
            }
        } else {
            // Verify the provided shift
            const { data: shift } = await supabaseAdmin
                .from('shifts')
                .select('id, date, start_time, end_time, location')
                .eq('id', shiftId)
                .eq('company_id', companyId)
                .eq('employee_id', employeeId)
                .single();

            if (!shift) {
                throw new NotFoundError('Shift not found or does not belong to you');
            }
            shiftData = shift;
            shiftStartTime = shift.start_time;
        }

        // Determine status (on_time or late)

        // Fetch company settings once
        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('settings')
            .eq('id', companyId)
            .single();

        // Determine status (on_time or late) and validate geofence
        let status: AttendanceStatus = 'on_time';

        if (shiftData) {
            // Geofence Validation
            const allowOutside = company?.settings?.allow_clock_in_outside_geofence;
            const radius = company?.settings?.geofence_radius_meters || 500;
            // NOTE: Skipping Strict Geofence Check for now as discussed.

            if (shiftStartTime) {
                const [hours, minutes] = shiftStartTime.split(':').map(Number);
                const shiftStart = new Date(now);
                shiftStart.setHours(hours, minutes, 0, 0);

                const lateThreshold = company?.settings?.late_threshold_minutes ?? 15;

                // Calculate minutes late
                const diffMs = now.getTime() - shiftStart.getTime();
                const minutesLate = Math.floor(diffMs / 60000);

                if (minutesLate > lateThreshold) {
                    status = 'late';
                }
            }
        }

        // Create attendance record
        const { data: attendance, error } = await supabaseAdmin
            .from('attendance_logs')
            .insert({
                company_id: companyId,
                employee_id: employeeId,
                shift_id: shiftId || null,
                clock_in_time: now.toISOString(),
                clock_in_latitude: data.latitude,
                clock_in_longitude: data.longitude,
                clock_in_accuracy: data.accuracy,
                status,
            })
            .select(`
                *,
                employees (id, full_name, employee_code)
            `)
            .single();

        if (error) {
            logger.error('Failed to create attendance record', { error });
            throw new BadRequestError('Failed to clock in', 'ไม่สามารถลงเวลาเข้าได้');
        }

        const result = this.mapToAttendanceLogWithDetails(attendance as AttendanceLogRowWithEmployee);
        if (shiftData) {
            result.shift = {
                id: shiftData.id,
                date: shiftData.date,
                startTime: shiftData.start_time,
                endTime: shiftData.end_time,
                location: shiftData.location,
            };
        }

        return {
            attendance: result,
            message: status === 'on_time'
                ? 'Clocked in on time!'
                : 'Clocked in (late)',
        };
    }

    // Clock out
    async clockOut(
        companyId: string,
        employeeId: string,
        data: ClockOutRequest
    ): Promise<ClockOutResponse> {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // Fetch company settings
        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('settings')
            .eq('id', companyId)
            .single();

        // Find active attendance record (clocked in but not out)
        const { data: activeAttendance, error: findError } = await supabaseAdmin
            .from('attendance_logs')
            .select(`
                *,
                employees (id, full_name, employee_code),
                shifts (id, date, start_time, end_time, location)
            `)
            .eq('company_id', companyId)
            .eq('employee_id', employeeId)
            .is('clock_out_time', null)
            .not('clock_in_time', 'is', null)
            .order('clock_in_time', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (findError) {
            logger.error('Failed to find active attendance', { error: findError });
            throw new BadRequestError('Failed to find active attendance', 'ไม่พบบันทึกการลงเวลาเข้า');
        }

        if (!activeAttendance) {
            throw new BadRequestError(
                'No active clock-in found. Please clock in first.',
                'ไม่พบการลงเวลาเข้า กรุณาลงเวลาเข้าก่อน'
            );
        }

        // Geofence Validation (Placeholder)
        if (activeAttendance.shifts) {
            const allowOutside = company?.settings?.allow_clock_in_outside_geofence;
            const radius = company?.settings?.geofence_radius_meters || 500;
            // NOTE: Skipping Strict Geofence Check for now.
        }

        // Calculate total hours
        const clockInTime = new Date(activeAttendance.clock_in_time);
        const totalMs = now.getTime() - clockInTime.getTime();
        const totalHours = Math.round((totalMs / 3600000) * 100) / 100; // Round to 2 decimals

        // Determine status
        let status: AttendanceStatus = 'completed';
        let overtimeHours = 0;

        // Check for early leave if there's a shift
        if (activeAttendance.shifts) {
            const [endHours, endMinutes] = activeAttendance.shifts.end_time.split(':').map(Number);
            const shiftEnd = new Date(now);
            shiftEnd.setHours(endHours, endMinutes, 0, 0);

            // Use fetched company settings
            const earlyLeaveThreshold = company?.settings?.early_leave_threshold_minutes ?? 15;

            // Calculate minutes early
            const diffMs = shiftEnd.getTime() - now.getTime();
            const minutesEarly = Math.floor(diffMs / 60000);

            if (minutesEarly > earlyLeaveThreshold) {
                status = 'early_leave';
            } else if (minutesEarly < 0) {
                // Overtime calculation
                overtimeHours = Math.abs(Math.round((diffMs / 3600000) * 100) / 100);
            }
        }

        // Update attendance record
        const { data: updatedAttendance, error: updateError } = await supabaseAdmin
            .from('attendance_logs')
            .update({
                clock_out_time: now.toISOString(),
                clock_out_latitude: data.latitude,
                clock_out_longitude: data.longitude,
                clock_out_accuracy: data.accuracy,
                status,
                total_hours: totalHours,
                overtime_hours: overtimeHours,
            })
            .eq('id', activeAttendance.id)
            .select(`
                *,
                employees (id, full_name, employee_code),
                shifts (id, date, start_time, end_time, location)
            `)
            .single();

        if (updateError) {
            logger.error('Failed to update attendance record', { error: updateError });
            throw new BadRequestError('Failed to clock out', 'ไม่สามารถลงเวลาออกได้');
        }

        return {
            attendance: this.mapToAttendanceLogWithDetails(updatedAttendance as AttendanceLogRowWithEmployee),
            totalHours,
            message: status === 'completed'
                ? 'Clocked out successfully!'
                : 'Clocked out (early leave)',
        };
    }

    // ========================================================================
    // TODAY'S ATTENDANCE STATUS
    // ========================================================================

    async getTodayAttendance(
        companyId: string,
        employeeId: string,
        date?: string
    ): Promise<TodayAttendanceResponse> {
        const targetDate = date || new Date().toISOString().split('T')[0];

        // Get today's shift
        const { data: shifts } = await supabaseAdmin
            .from('shifts')
            .select('id, date, start_time, end_time, location')
            .eq('company_id', companyId)
            .eq('employee_id', employeeId)
            .eq('date', targetDate)
            .eq('status', 'published');

        const shift = shifts && shifts.length > 0 ? shifts[0] : null;

        // Get today's attendance
        const { data: attendanceLogs } = await supabaseAdmin
            .from('attendance_logs')
            .select(`
                *,
                employees (id, full_name, employee_code),
                shifts (id, date, start_time, end_time, location)
            `)
            .eq('company_id', companyId)
            .eq('employee_id', employeeId)
            .gte('clock_in_time', `${targetDate}T00:00:00`)
            .lte('clock_in_time', `${targetDate}T23:59:59`)
            .order('clock_in_time', { ascending: false })
            .limit(1);

        const attendance = attendanceLogs && attendanceLogs.length > 0
            ? this.mapToAttendanceLogWithDetails(attendanceLogs[0] as AttendanceLogRowWithEmployee)
            : null;

        // Determine status
        let currentStatus: TodayAttendanceResponse['currentStatus'];
        let canClockIn = false;
        let canClockOut = false;

        if (!shift) {
            currentStatus = 'no_shift';
        } else if (!attendance) {
            currentStatus = 'not_clocked_in';
            canClockIn = true;
        } else if (!attendance.clockOutTime) {
            currentStatus = 'clocked_in';
            canClockOut = true;
        } else {
            currentStatus = 'clocked_out';
        }

        return {
            hasShiftToday: !!shift,
            shift: shift
                ? {
                    id: shift.id,
                    date: shift.date,
                    startTime: shift.start_time,
                    endTime: shift.end_time,
                    location: shift.location,
                }
                : null,
            attendance,
            canClockIn,
            canClockOut,
            currentStatus,
        };
    }

    // ========================================================================
    // MY ATTENDANCE (for guards)
    // ========================================================================

    async getMyAttendance(
        companyId: string,
        employeeId: string,
        days: number = 14
    ): Promise<MyAttendanceResponse> {
        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - days);

        // Get today's status
        const todayStatus = await this.getTodayAttendance(companyId, employeeId);

        // Get recent attendance
        const { data: recentLogs, error } = await supabaseAdmin
            .from('attendance_logs')
            .select(`
                *,
                employees (id, full_name, employee_code),
                shifts (id, date, start_time, end_time, location)
            `)
            .eq('company_id', companyId)
            .eq('employee_id', employeeId)
            .gte('created_at', startDate.toISOString())
            .order('clock_in_time', { ascending: false })
            .limit(50);

        if (error) {
            logger.error('Failed to get my attendance', { error });
            throw new BadRequestError('Failed to get attendance records', 'ไม่สามารถดึงข้อมูลการลงเวลาได้');
        }

        return {
            today: todayStatus,
            recent: (recentLogs || []).map((log) =>
                this.mapToAttendanceLogWithDetails(log as AttendanceLogRowWithEmployee)
            ),
        };
    }

    // ========================================================================
    // LIST ATTENDANCE (for managers)
    // ========================================================================

    async list(
        companyId: string,
        query: ListAttendanceQuery
    ): Promise<{ records: AttendanceLogWithDetails[]; total: number }> {
        const { page = 1, pageSize = 50, startDate, endDate, employeeId, status } = query;

        let dbQuery = supabaseAdmin
            .from('attendance_logs')
            .select(
                `
                *,
                employees (id, full_name, employee_code),
                shifts (id, date, start_time, end_time, location)
            `,
                { count: 'exact' }
            )
            .eq('company_id', companyId);

        if (startDate) {
            dbQuery = dbQuery.gte('clock_in_time', `${startDate}T00:00:00`);
        }
        if (endDate) {
            dbQuery = dbQuery.lte('clock_in_time', `${endDate}T23:59:59`);
        }
        if (employeeId) {
            dbQuery = dbQuery.eq('employee_id', employeeId);
        }
        if (status) {
            dbQuery = dbQuery.eq('status', status);
        }

        dbQuery = dbQuery
            .order('clock_in_time', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        const { data, error, count } = await dbQuery;

        if (error) {
            logger.error('Failed to list attendance', { error });
            throw new BadRequestError('Failed to list attendance', 'ไม่สามารถดึงข้อมูลการลงเวลาได้');
        }

        return {
            records: (data || []).map((log) =>
                this.mapToAttendanceLogWithDetails(log as AttendanceLogRowWithEmployee)
            ),
            total: count || 0,
        };
    }

    // ========================================================================
    // GET BY ID
    // ========================================================================

    async getById(
        attendanceId: string,
        companyId: string
    ): Promise<AttendanceLogWithDetails> {
        const { data, error } = await supabaseAdmin
            .from('attendance_logs')
            .select(`
                *,
                employees (id, full_name, employee_code),
                shifts (id, date, start_time, end_time, location)
            `)
            .eq('id', attendanceId)
            .eq('company_id', companyId)
            .single();

        if (error || !data) {
            throw new NotFoundError('Attendance record not found');
        }

        return this.mapToAttendanceLogWithDetails(data as AttendanceLogRowWithEmployee);
    }

    // ========================================================================
    // ADJUST ATTENDANCE (for managers)
    // ========================================================================

    async adjust(
        attendanceId: string,
        companyId: string,
        adjustedBy: string,
        data: AdjustAttendanceRequest
    ): Promise<AttendanceLogWithDetails> {
        // Verify the record exists
        const existing = await this.getById(attendanceId, companyId);

        // Build update object
        const updateData: Partial<AttendanceLogRow> = {
            adjusted_by: adjustedBy,
            adjustment_reason: data.adjustmentReason,
        };

        if (data.clockInTime) {
            updateData.clock_in_time = data.clockInTime;
        }
        if (data.clockOutTime) {
            updateData.clock_out_time = data.clockOutTime;

            // Recalculate total hours if both times are available
            const clockInTime = new Date(data.clockInTime || existing.clockInTime!);
            const clockOutTime = new Date(data.clockOutTime);
            const totalMs = clockOutTime.getTime() - clockInTime.getTime();
            updateData.total_hours = Math.round((totalMs / 3600000) * 100) / 100;
        }
        if (data.status) {
            updateData.status = data.status;
        }
        if (data.notes !== undefined) {
            updateData.notes = data.notes;
        }

        const { data: updated, error } = await supabaseAdmin
            .from('attendance_logs')
            .update(updateData)
            .eq('id', attendanceId)
            .select(`
                *,
                employees (id, full_name, employee_code),
                shifts (id, date, start_time, end_time, location)
            `)
            .single();

        if (error) {
            logger.error('Failed to adjust attendance', { error });
            throw new BadRequestError('Failed to adjust attendance', 'ไม่สามารถแก้ไขการลงเวลาได้');
        }

        return this.mapToAttendanceLogWithDetails(updated as AttendanceLogRowWithEmployee);
    }

    // ========================================================================
    // CREATE ATTENDANCE (manual entry by manager)
    // ========================================================================

    async create(
        companyId: string,
        data: CreateAttendanceRequest
    ): Promise<AttendanceLogWithDetails> {
        // Verify employee exists
        const { data: employee } = await supabaseAdmin
            .from('employees')
            .select('id')
            .eq('id', data.employeeId)
            .eq('company_id', companyId)
            .single();

        if (!employee) {
            throw new NotFoundError('Employee not found');
        }

        // Calculate total hours if clock out time is provided
        let totalHours = null;
        if (data.clockInTime && data.clockOutTime) {
            const clockInTime = new Date(data.clockInTime);
            const clockOutTime = new Date(data.clockOutTime);
            const totalMs = clockOutTime.getTime() - clockInTime.getTime();
            totalHours = Math.round((totalMs / 3600000) * 100) / 100;
        }

        const { data: attendance, error } = await supabaseAdmin
            .from('attendance_logs')
            .insert({
                company_id: companyId,
                employee_id: data.employeeId,
                shift_id: data.shiftId || null,
                clock_in_time: data.clockInTime,
                clock_in_latitude: data.clockInLatitude,
                clock_in_longitude: data.clockInLongitude,
                clock_out_time: data.clockOutTime,
                clock_out_latitude: data.clockOutLatitude,
                clock_out_longitude: data.clockOutLongitude,
                status: data.status || (data.clockOutTime ? 'completed' : 'on_time'),
                total_hours: totalHours,
                notes: data.notes,
            })
            .select(`
                *,
                employees (id, full_name, employee_code),
                shifts (id, date, start_time, end_time, location)
            `)
            .single();

        if (error) {
            logger.error('Failed to create attendance', { error });
            throw new BadRequestError('Failed to create attendance', 'ไม่สามารถสร้างบันทึกการลงเวลาได้');
        }

        return this.mapToAttendanceLogWithDetails(attendance as AttendanceLogRowWithEmployee);
    }

    // ========================================================================
    // DAILY REPORT
    // ========================================================================

    async getDailyReport(
        companyId: string,
        date: string
    ): Promise<DailyAttendanceReport> {
        // Get all employees expected to work (those with shifts)
        const { data: shiftsData, error: shiftsError } = await supabaseAdmin
            .from('shifts')
            .select('id, employee_id')
            .eq('company_id', companyId)
            .eq('date', date)
            .eq('status', 'published');

        if (shiftsError) {
            logger.error('Failed to get shifts for report', { error: shiftsError });
            throw new BadRequestError('Failed to generate report', 'ไม่สามารถสร้างรายงานได้');
        }

        const expectedToWork = new Set((shiftsData || []).map((s) => s.employee_id));

        // Get all attendance for the day
        const { data: attendanceData, error: attendanceError } = await supabaseAdmin
            .from('attendance_logs')
            .select(`
                *,
                employees (id, full_name, employee_code),
                shifts (id, date, start_time, end_time, location)
            `)
            .eq('company_id', companyId)
            .gte('clock_in_time', `${date}T00:00:00`)
            .lte('clock_in_time', `${date}T23:59:59`)
            .order('clock_in_time', { ascending: true });

        if (attendanceError) {
            logger.error('Failed to get attendance for report', { error: attendanceError });
            throw new BadRequestError('Failed to generate report', 'ไม่สามารถสร้างรายงานได้');
        }

        // Get total employees
        const { count: totalEmployees } = await supabaseAdmin
            .from('employees')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('status', 'active');

        // Calculate summary
        const records = (attendanceData || []).map((log) =>
            this.mapToAttendanceLogWithDetails(log as AttendanceLogRowWithEmployee)
        );

        const clockedInEmployees = new Set(records.map((r) => r.employeeId));
        const onTime = records.filter((r) => r.status === 'on_time').length;
        const late = records.filter((r) => r.status === 'late').length;
        const completed = records.filter((r) => r.status === 'completed').length;

        // Calculate no-shows (expected to work but didn't clock in)
        let noShowCount = 0;
        for (const employeeId of expectedToWork) {
            if (!clockedInEmployees.has(employeeId)) {
                noShowCount++;
            }
        }

        const summary: AttendanceSummary = {
            date,
            totalEmployees: totalEmployees || 0,
            expectedToWork: expectedToWork.size,
            clockedIn: clockedInEmployees.size,
            onTime,
            late,
            noShow: noShowCount,
            completed,
        };

        return {
            summary,
            records,
        };
    }
}

export const attendanceService = new AttendanceService();
export default attendanceService;

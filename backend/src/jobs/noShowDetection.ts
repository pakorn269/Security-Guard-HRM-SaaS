import { supabaseAdmin } from '../config/supabase.js';
import logger from '../utils/logger.js';
import { sendAttendanceAlert } from './lineNotifications.js';

// ============================================================
// TYPES
// ============================================================

interface ShiftWithEmployee {
    id: string;
    company_id: string;
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    location: string | null;
    status: string;
    employees: {
        id: string;
        full_name: string;
        employee_code: string;
        user_id: string | null;
    };
    companies: {
        id: string;
        name: string;
        timezone: string | null;
    };
}

interface NoShowResult {
    detected: number;
    marked: number;
    notified: number;
    errors: number;
}

// ============================================================
// NO-SHOW DETECTION
// ============================================================

/**
 * Detect and mark no-shows for shifts that started but have no attendance record
 *
 * Logic:
 * 1. Find all shifts that started X minutes ago (grace period)
 * 2. Check if there's an attendance record for each shift
 * 3. If no attendance record exists, create one with status 'no_show'
 * 4. Send LINE notification to manager/admin
 *
 * @param gracePeriodMinutes - Minutes after shift start to wait before marking as no-show (default: 30)
 */
export async function detectNoShows(gracePeriodMinutes: number = 30): Promise<NoShowResult> {
    const result: NoShowResult = {
        detected: 0,
        marked: 0,
        notified: 0,
        errors: 0,
    };

    try {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().slice(0, 5); // HH:mm format

        // Calculate grace period time
        const gracePeriodTime = new Date(now.getTime() - gracePeriodMinutes * 60 * 1000);
        const gracePeriodTimeStr = gracePeriodTime.toTimeString().slice(0, 5);

        logger.info('Starting no-show detection job', {
            currentDate,
            currentTime,
            gracePeriodMinutes,
            gracePeriodTimeStr,
        });

        // Query 1: Find all shifts that started within the grace period window
        // We need shifts where:
        // - Date is today
        // - Start time is before current time minus grace period
        // - Status is 'confirmed' or 'pending'
        const { data: shifts, error: shiftsError } = await supabaseAdmin
            .from('shifts')
            .select(`
                id,
                company_id,
                employee_id,
                date,
                start_time,
                end_time,
                location,
                status,
                employees!inner (
                    id,
                    full_name,
                    employee_code,
                    user_id
                ),
                companies!inner (
                    id,
                    name,
                    timezone
                )
            `)
            .eq('date', currentDate)
            .lte('start_time', gracePeriodTimeStr)
            .in('status', ['confirmed', 'pending']);

        if (shiftsError) {
            logger.error('Failed to fetch shifts for no-show detection', { error: shiftsError });
            result.errors++;
            return result;
        }

        if (!shifts || shifts.length === 0) {
            logger.info('No shifts found requiring no-show check');
            return result;
        }

        logger.info(`Found ${shifts.length} shifts to check for no-shows`);

        // Process each shift
        for (const shift of shifts as unknown as ShiftWithEmployee[]) {
            try {
                // Query 2: Check if attendance record exists for this shift
                const { data: attendance, error: attendanceError } = await supabaseAdmin
                    .from('attendance_logs')
                    .select('id, status')
                    .eq('employee_id', shift.employee_id)
                    .eq('shift_id', shift.id)
                    .maybeSingle(); // Use maybeSingle to avoid error when no record exists

                if (attendanceError) {
                    logger.error('Failed to check attendance record', {
                        shiftId: shift.id,
                        employeeId: shift.employee_id,
                        error: attendanceError,
                    });
                    result.errors++;
                    continue;
                }

                // If attendance record exists, skip this shift
                if (attendance) {
                    logger.debug('Attendance record already exists, skipping', {
                        shiftId: shift.id,
                        employeeId: shift.employee_id,
                        attendanceId: attendance.id,
                        status: attendance.status,
                    });
                    continue;
                }

                // No attendance record found - mark as no-show
                result.detected++;

                logger.info('No-show detected', {
                    shiftId: shift.id,
                    employeeId: shift.employee_id,
                    employeeName: shift.employees.full_name,
                    shiftStartTime: shift.start_time,
                    location: shift.location,
                });

                // Create attendance record with no_show status
                const { data: newAttendance, error: createError } = await supabaseAdmin
                    .from('attendance_logs')
                    .insert({
                        company_id: shift.company_id,
                        employee_id: shift.employee_id,
                        shift_id: shift.id,
                        status: 'no_show',
                        notes: `Auto-marked as no-show by system. Shift start: ${shift.start_time}, grace period: ${gracePeriodMinutes} minutes.`,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .select()
                    .single();

                if (createError) {
                    logger.error('Failed to create no-show attendance record', {
                        shiftId: shift.id,
                        employeeId: shift.employee_id,
                        error: createError,
                    });
                    result.errors++;
                    continue;
                }

                result.marked++;

                logger.info('Created no-show attendance record', {
                    attendanceId: newAttendance.id,
                    shiftId: shift.id,
                    employeeId: shift.employee_id,
                });

                // Send LINE notification to managers/admins
                try {
                    // Get managers/admins for this company
                    const { data: managers, error: managersError } = await supabaseAdmin
                        .from('employees')
                        .select('id, full_name, user_id, users!inner(line_user_id)')
                        .eq('company_id', shift.company_id)
                        .in('role', ['company_admin', 'manager'])
                        .not('users.line_user_id', 'is', null);

                    if (managersError) {
                        logger.error('Failed to fetch managers for notification', {
                            companyId: shift.company_id,
                            error: managersError,
                        });
                    } else if (managers && managers.length > 0) {
                        // Send notification to each manager
                        for (const manager of managers) {
                            try {
                                await sendAttendanceAlert(
                                    shift.company_id,
                                    shift.employee_id,
                                    'no_show',
                                    {
                                        employeeName: shift.employees.full_name,
                                        employeeCode: shift.employees.employee_code,
                                        shiftDate: shift.date,
                                        shiftTime: `${shift.start_time} - ${shift.end_time}`,
                                        location: shift.location || '-',
                                    }
                                );
                                result.notified++;
                            } catch (notifyError) {
                                logger.error('Failed to send no-show notification to manager', {
                                    managerId: manager.id,
                                    error: notifyError,
                                });
                            }
                        }
                    }
                } catch (notifyError) {
                    logger.error('Error during notification process', { error: notifyError });
                }

            } catch (shiftError) {
                logger.error('Error processing shift for no-show detection', {
                    shiftId: shift.id,
                    error: shiftError,
                });
                result.errors++;
            }
        }

        logger.info('No-show detection job completed', {
            totalShiftsChecked: shifts.length,
            detected: result.detected,
            marked: result.marked,
            notified: result.notified,
            errors: result.errors,
        });

        return result;

    } catch (error) {
        logger.error('Fatal error in no-show detection job', { error });
        result.errors++;
        return result;
    }
}

/**
 * Alternative approach: Mark no-shows based on shift end time
 * Use this for end-of-day processing to catch shifts that ended without clock-out
 *
 * @param hoursAfterEnd - Hours after shift end to check (default: 1)
 */
export async function detectMissedClockOuts(hoursAfterEnd: number = 1): Promise<NoShowResult> {
    const result: NoShowResult = {
        detected: 0,
        marked: 0,
        notified: 0,
        errors: 0,
    };

    try {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const checkTime = new Date(now.getTime() - hoursAfterEnd * 60 * 60 * 1000);
        const checkTimeStr = checkTime.toTimeString().slice(0, 5);

        logger.info('Starting missed clock-out detection', {
            currentDate,
            currentTime: now.toTimeString().slice(0, 5),
            checkTimeStr,
            hoursAfterEnd,
        });

        // Find attendance records where:
        // - Clock-in exists (not null)
        // - Clock-out is null
        // - Shift ended X hours ago
        const { data: attendanceRecords, error: queryError } = await supabaseAdmin
            .from('attendance_logs')
            .select(`
                id,
                company_id,
                employee_id,
                shift_id,
                clock_in_time,
                clock_out_time,
                status,
                shifts!inner (
                    date,
                    end_time,
                    location
                ),
                employees!inner (
                    full_name,
                    employee_code
                )
            `)
            .not('clock_in_time', 'is', null)
            .is('clock_out_time', null)
            .eq('shifts.date', currentDate)
            .lte('shifts.end_time', checkTimeStr);

        if (queryError) {
            logger.error('Failed to fetch attendance records for missed clock-out detection', {
                error: queryError,
            });
            result.errors++;
            return result;
        }

        if (!attendanceRecords || attendanceRecords.length === 0) {
            logger.info('No missed clock-outs detected');
            return result;
        }

        logger.info(`Found ${attendanceRecords.length} potential missed clock-outs`);

        for (const record of attendanceRecords as any[]) {
            try {
                result.detected++;

                // Update attendance record to mark as early_leave or incomplete
                const { error: updateError } = await supabaseAdmin
                    .from('attendance_logs')
                    .update({
                        status: 'early_leave',
                        notes: record.notes
                            ? `${record.notes}\n\nAuto-marked: No clock-out detected ${hoursAfterEnd}h after shift end.`
                            : `Auto-marked: No clock-out detected ${hoursAfterEnd}h after shift end.`,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', record.id);

                if (updateError) {
                    logger.error('Failed to update attendance record for missed clock-out', {
                        attendanceId: record.id,
                        error: updateError,
                    });
                    result.errors++;
                    continue;
                }

                result.marked++;

                logger.info('Marked missed clock-out', {
                    attendanceId: record.id,
                    employeeId: record.employee_id,
                    shiftDate: record.shifts?.date,
                    shiftEndTime: record.shifts?.end_time,
                });

            } catch (recordError) {
                logger.error('Error processing attendance record for missed clock-out', {
                    attendanceId: record.id,
                    error: recordError,
                });
                result.errors++;
            }
        }

        logger.info('Missed clock-out detection completed', result);
        return result;

    } catch (error) {
        logger.error('Fatal error in missed clock-out detection', { error });
        result.errors++;
        return result;
    }
}

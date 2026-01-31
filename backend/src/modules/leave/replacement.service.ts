/**
 * Replacement Guard Service
 * Handles shift replacement workflow when employees take leave
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';
import type {
    ReplacementConflict,
    AvailableReplacement,
    ReplacementAssignment,
    ShiftWithReplacement,
    ConflictResolutionResult,
} from './leave.types.js';

class ReplacementService {
    // ========================================================================
    // CONFLICT DETECTION
    // ========================================================================

    /**
     * Find shifts that conflict with an approved leave request
     * @param companyId Company ID
     * @param employeeId Employee taking leave
     * @param startDate Leave start date (YYYY-MM-DD)
     * @param endDate Leave end date (YYYY-MM-DD)
     * @returns Array of conflicting shifts
     */
    async findConflictingShifts(
        companyId: string,
        employeeId: string,
        startDate: string,
        endDate: string
    ): Promise<ReplacementConflict[]> {
        const { data: shifts, error } = await supabaseAdmin
            .from('shifts')
            .select(`
                id,
                date,
                start_time,
                end_time,
                employee_id,
                site_id,
                status,
                sites:site_id (
                    id,
                    name,
                    zone
                ),
                employees:employee_id (
                    id,
                    full_name
                )
            `)
            .eq('company_id', companyId)
            .eq('employee_id', employeeId)
            .in('status', ['scheduled', 'published'])
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) {
            logger.error('Error finding conflicting shifts:', error);
            throw error;
        }

        return (shifts || []).map((shift: any) => ({
            shiftId: shift.id,
            date: shift.date,
            siteId: shift.site_id,
            siteName: shift.sites?.name || 'Unknown Site',
            siteZone: shift.sites?.zone || null,
            startTime: shift.start_time,
            endTime: shift.end_time,
            requiresReplacement: true,
            originalEmployeeId: shift.employee_id,
            originalEmployeeName: shift.employees?.full_name || 'Unknown',
            status: shift.status,
        }));
    }

    /**
     * Get conflicting shifts for a specific leave request
     * @param leaveRequestId Leave request ID
     * @param companyId Company ID
     * @returns Array of conflicting shifts
     */
    async getConflictsForLeaveRequest(
        leaveRequestId: string,
        companyId: string
    ): Promise<ReplacementConflict[]> {
        // Get leave request details
        const { data: leaveRequest, error } = await supabaseAdmin
            .from('leave_requests')
            .select('employee_id, start_date, end_date')
            .eq('id', leaveRequestId)
            .eq('company_id', companyId)
            .single();

        if (error || !leaveRequest) {
            throw new NotFoundError('Leave request not found');
        }

        return this.findConflictingShifts(
            companyId,
            leaveRequest.employee_id,
            leaveRequest.start_date,
            leaveRequest.end_date
        );
    }

    // ========================================================================
    // AVAILABLE REPLACEMENTS
    // ========================================================================

    /**
     * Get available employees who can replace for a specific shift
     * @param shiftId Shift ID
     * @param companyId Company ID
     * @returns Array of available replacement employees
     */
    async getAvailableReplacements(
        shiftId: string,
        companyId: string
    ): Promise<AvailableReplacement[]> {
        // Get shift details
        const { data: shift, error: shiftError } = await supabaseAdmin
            .from('shifts')
            .select('date, employee_id, site_id')
            .eq('id', shiftId)
            .eq('company_id', companyId)
            .single();

        if (shiftError || !shift) {
            throw new NotFoundError('Shift not found');
        }

        const shiftDate = shift.date;

        // Get all active employees in the company, excluding the original employee
        const { data: employees, error: employeesError } = await supabaseAdmin
            .from('employees')
            .select('id, full_name, employee_code, position')
            .eq('company_id', companyId)
            .eq('status', 'active')
            .neq('id', shift.employee_id);

        if (employeesError) {
            logger.error('Error fetching employees:', employeesError);
            throw employeesError;
        }

        if (!employees || employees.length === 0) {
            return [];
        }

        const employeeIds = employees.map((e: any) => e.id);

        // Check which employees are already on leave for this date
        const { data: leavesOnDate, error: leavesError } = await supabaseAdmin
            .from('leave_requests')
            .select('employee_id')
            .eq('company_id', companyId)
            .eq('status', 'approved')
            .lte('start_date', shiftDate)
            .gte('end_date', shiftDate)
            .in('employee_id', employeeIds);

        if (leavesError) {
            logger.error('Error fetching leaves:', leavesError);
            throw leavesError;
        }

        const employeesOnLeave = new Set((leavesOnDate || []).map((l: any) => l.employee_id));

        // Check which employees already have a shift on this date
        const { data: shiftsOnDate, error: shiftsError } = await supabaseAdmin
            .from('shifts')
            .select('employee_id')
            .eq('company_id', companyId)
            .eq('date', shiftDate)
            .in('status', ['scheduled', 'published'])
            .in('employee_id', employeeIds);

        if (shiftsError) {
            logger.error('Error fetching shifts:', shiftsError);
            throw shiftsError;
        }

        const employeesWithShift = new Set((shiftsOnDate || []).map((s: any) => s.employee_id));

        // Get shift counts for each employee (for the next 7 days)
        const weekStart = shiftDate;
        const weekEnd = new Date(shiftDate);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const weekEndStr = weekEnd.toISOString().split('T')[0];

        const { data: upcomingShifts, error: upcomingError } = await supabaseAdmin
            .from('shifts')
            .select('employee_id')
            .eq('company_id', companyId)
            .gte('date', weekStart)
            .lte('date', weekEndStr)
            .in('status', ['scheduled', 'published'])
            .in('employee_id', employeeIds);

        if (upcomingError) {
            logger.error('Error fetching upcoming shifts:', upcomingError);
        }

        const shiftCounts = new Map<string, number>();
        (upcomingShifts || []).forEach((s: any) => {
            shiftCounts.set(s.employee_id, (shiftCounts.get(s.employee_id) || 0) + 1);
        });

        // Filter available employees
        const availableEmployees = employees
            .filter((emp: any) => {
                return (
                    !employeesOnLeave.has(emp.id) && // Not on leave
                    !employeesWithShift.has(emp.id) // Not already assigned a shift on this date
                );
            })
            .map((emp: any) => ({
                id: emp.id,
                fullName: emp.full_name,
                employeeCode: emp.employee_code,
                position: emp.position,
                shiftCount: shiftCounts.get(emp.id) || 0,
            }))
            .sort((a, b) => a.shiftCount - b.shiftCount); // Sort by shift count (least busy first)

        return availableEmployees;
    }

    // ========================================================================
    // REPLACEMENT ASSIGNMENT
    // ========================================================================

    /**
     * Assign a replacement guard to a specific shift
     * @param shiftId Shift ID
     * @param replacementEmployeeId Replacement employee ID
     * @param companyId Company ID
     * @param reason Replacement reason (e.g., leave request ID)
     * @returns Updated shift with replacement details
     */
    async assignReplacement(
        shiftId: string,
        replacementEmployeeId: string,
        companyId: string,
        reason: string
    ): Promise<ShiftWithReplacement> {
        // Get the original shift
        const { data: originalShift, error: fetchError } = await supabaseAdmin
            .from('shifts')
            .select('*, employee_id, site_id')
            .eq('id', shiftId)
            .eq('company_id', companyId)
            .single();

        if (fetchError || !originalShift) {
            throw new NotFoundError('Shift not found');
        }

        // Validate replacement employee exists and is active
        const { data: replacement, error: empError } = await supabaseAdmin
            .from('employees')
            .select('id, status')
            .eq('id', replacementEmployeeId)
            .eq('company_id', companyId)
            .single();

        if (empError || !replacement || replacement.status !== 'active') {
            throw new BadRequestError('Replacement employee not found or inactive');
        }

        // Update shift with replacement information
        const { data: updatedShift, error: updateError } = await supabaseAdmin
            .from('shifts')
            .update({
                replaced_by_employee_id: replacementEmployeeId,
                is_replacement: true,
                original_employee_id: originalShift.employee_id,
                replacement_reason: reason,
                updated_at: new Date().toISOString(),
            })
            .eq('id', shiftId)
            .eq('company_id', companyId)
            .select(`
                *,
                employee:employee_id (id, full_name, employee_code),
                replacementEmployee:replaced_by_employee_id (id, full_name, employee_code),
                originalEmployee:original_employee_id (id, full_name, employee_code),
                site:site_id (id, name, zone)
            `)
            .single();

        if (updateError || !updatedShift) {
            logger.error('Error updating shift with replacement:', updateError);
            throw new Error('Failed to assign replacement');
        }

        logger.info('Replacement assigned successfully', {
            shiftId,
            originalEmployeeId: originalShift.employee_id,
            replacementEmployeeId,
            reason,
        });

        return this.mapToShiftWithReplacement(updatedShift);
    }

    /**
     * Assign replacements for multiple shifts (bulk operation)
     * @param replacements Array of replacement assignments
     * @param companyId Company ID
     * @param leaveRequestId Optional leave request ID to link
     * @returns Result with count of successful assignments
     */
    async assignReplacementsForLeave(
        replacements: ReplacementAssignment[],
        companyId: string,
        leaveRequestId?: string
    ): Promise<ConflictResolutionResult> {
        const results = {
            leaveRequestId: leaveRequestId || '',
            totalConflicts: replacements.length,
            resolvedConflicts: 0,
            unresolvedConflicts: 0,
            assignedReplacements: [] as ReplacementAssignment[],
        };

        const reason = leaveRequestId
            ? `Leave Request: ${leaveRequestId}`
            : 'Manual Replacement Assignment';

        for (const assignment of replacements) {
            try {
                await this.assignReplacement(
                    assignment.shiftId,
                    assignment.replacementEmployeeId,
                    companyId,
                    assignment.reason || reason
                );
                results.resolvedConflicts++;
                results.assignedReplacements.push(assignment);
            } catch (error) {
                logger.error('Error assigning replacement:', {
                    shiftId: assignment.shiftId,
                    error,
                });
                results.unresolvedConflicts++;
            }
        }

        // If this is for a leave request, update the leave request with affected shifts
        if (leaveRequestId && results.assignedReplacements.length > 0) {
            const affectedShiftIds = results.assignedReplacements.map((a) => a.shiftId);
            const allResolved = results.unresolvedConflicts === 0;

            await supabaseAdmin
                .from('leave_requests')
                .update({
                    affected_shift_ids: affectedShiftIds,
                    replacements_assigned: allResolved,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', leaveRequestId)
                .eq('company_id', companyId);

            logger.info('Leave request updated with shift replacements', {
                leaveRequestId,
                affectedShiftCount: affectedShiftIds.length,
                allResolved,
            });
        }

        return results;
    }

    /**
     * Remove replacement assignment from a shift (restore original employee)
     * @param shiftId Shift ID
     * @param companyId Company ID
     */
    async removeReplacement(shiftId: string, companyId: string): Promise<void> {
        const { error } = await supabaseAdmin
            .from('shifts')
            .update({
                replaced_by_employee_id: null,
                is_replacement: false,
                original_employee_id: null,
                replacement_reason: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', shiftId)
            .eq('company_id', companyId);

        if (error) {
            logger.error('Error removing replacement:', error);
            throw error;
        }

        logger.info('Replacement removed from shift', { shiftId });
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    private mapToShiftWithReplacement(row: any): ShiftWithReplacement {
        return {
            id: row.id,
            companyId: row.company_id,
            employeeId: row.employee_id,
            date: row.date,
            startTime: row.start_time,
            endTime: row.end_time,
            siteId: row.site_id,
            status: row.status,
            replacedByEmployeeId: row.replaced_by_employee_id,
            isReplacement: row.is_replacement,
            originalEmployeeId: row.original_employee_id,
            replacementReason: row.replacement_reason,
            employee: row.employee ? {
                id: row.employee.id,
                fullName: row.employee.full_name,
                employeeCode: row.employee.employee_code,
            } : undefined,
            replacementEmployee: row.replacementEmployee ? {
                id: row.replacementEmployee.id,
                fullName: row.replacementEmployee.full_name,
                employeeCode: row.replacementEmployee.employee_code,
            } : undefined,
            originalEmployee: row.originalEmployee ? {
                id: row.originalEmployee.id,
                fullName: row.originalEmployee.full_name,
                employeeCode: row.originalEmployee.employee_code,
            } : undefined,
            site: row.site ? {
                id: row.site.id,
                name: row.site.name,
                zone: row.site.zone,
            } : undefined,
        };
    }
}

export const replacementService = new ReplacementService();
export default replacementService;

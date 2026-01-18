import { supabaseAdmin } from '../../config/supabase.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';
import type {
    ShiftTemplate,
    ShiftTemplateRow,
    CreateShiftTemplateRequest,
    UpdateShiftTemplateRequest,
    ListShiftTemplatesQuery,
    Shift,
    ShiftRow,
    ShiftRowWithEmployee,
    ShiftWithDetails,
    CreateShiftRequest,
    BulkCreateShiftsRequest,
    UpdateShiftRequest,
    ListShiftsQuery,
    PublishShiftsRequest,
    CopyShiftsRequest,
    CalendarDayData,
    CalendarResponse,
    MyShiftsResponse,
    ShiftConflict,
    BulkCreateResult,
} from './shift.types.js';

class ShiftService {
    // ========================================================================
    // MAPPER FUNCTIONS
    // ========================================================================

    // Map database row to ShiftTemplate
    private mapToShiftTemplate(row: ShiftTemplateRow): ShiftTemplate {
        return {
            id: row.id,
            companyId: row.company_id,
            name: row.name,
            nameTh: row.name_th,
            startTime: row.start_time.substring(0, 5), // Remove seconds
            endTime: row.end_time.substring(0, 5),
            breakMinutes: row.break_minutes,
            color: row.color,
            isOvernight: row.is_overnight,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    // Map database row to Shift
    private mapToShift(row: ShiftRow): Shift {
        return {
            id: row.id,
            companyId: row.company_id,
            employeeId: row.employee_id,
            templateId: row.template_id,
            date: row.date,
            startTime: row.start_time.substring(0, 5),
            endTime: row.end_time.substring(0, 5),
            location: row.location,
            status: row.status,
            notes: row.notes,
            publishedAt: row.published_at,
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    // Map database row with relations to ShiftWithDetails
    private mapToShiftWithDetails(row: ShiftRowWithEmployee): ShiftWithDetails {
        const shift = this.mapToShift(row);
        return {
            ...shift,
            employee: row.employees ? {
                id: row.employees.id,
                fullName: row.employees.full_name,
                employeeCode: row.employees.employee_code,
            } : undefined,
            template: row.shift_templates ? {
                id: row.shift_templates.id,
                name: row.shift_templates.name,
                nameTh: row.shift_templates.name_th,
                color: row.shift_templates.color,
            } : null,
        };
    }

    // ========================================================================
    // SHIFT TEMPLATE METHODS
    // ========================================================================

    // List shift templates
    async listTemplates(companyId: string, query: ListShiftTemplatesQuery): Promise<ShiftTemplate[]> {
        let queryBuilder = supabaseAdmin
            .from('shift_templates')
            .select('*')
            .eq('company_id', companyId)
            .order('start_time', { ascending: true });

        if (!query.includeInactive) {
            queryBuilder = queryBuilder.eq('is_active', true);
        }

        const { data, error } = await queryBuilder;

        if (error) {
            logger.error('Error listing shift templates', { error, companyId });
            throw error;
        }

        return (data || []).map(row => this.mapToShiftTemplate(row));
    }

    // Get shift template by ID
    async getTemplateById(templateId: string, companyId: string): Promise<ShiftTemplate> {
        const { data, error } = await supabaseAdmin
            .from('shift_templates')
            .select('*')
            .eq('id', templateId)
            .eq('company_id', companyId)
            .single();

        if (error || !data) {
            throw new NotFoundError('Shift template not found', 'ไม่พบรูปแบบกะ');
        }

        return this.mapToShiftTemplate(data);
    }

    // Create shift template
    async createTemplate(companyId: string, data: CreateShiftTemplateRequest): Promise<ShiftTemplate> {
        const { data: template, error } = await supabaseAdmin
            .from('shift_templates')
            .insert({
                company_id: companyId,
                name: data.name,
                name_th: data.nameTh || null,
                start_time: data.startTime,
                end_time: data.endTime,
                break_minutes: data.breakMinutes ?? 0,
                color: data.color ?? '#3B82F6',
                is_overnight: data.isOvernight ?? false,
            })
            .select()
            .single();

        if (error) {
            logger.error('Error creating shift template', { error, companyId });
            throw error;
        }

        logger.info('Shift template created', { templateId: template.id, companyId });
        return this.mapToShiftTemplate(template);
    }

    // Update shift template
    async updateTemplate(
        templateId: string,
        companyId: string,
        data: UpdateShiftTemplateRequest
    ): Promise<ShiftTemplate> {
        // Check if exists
        await this.getTemplateById(templateId, companyId);

        const updateData: Record<string, unknown> = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.nameTh !== undefined) updateData.name_th = data.nameTh;
        if (data.startTime !== undefined) updateData.start_time = data.startTime;
        if (data.endTime !== undefined) updateData.end_time = data.endTime;
        if (data.breakMinutes !== undefined) updateData.break_minutes = data.breakMinutes;
        if (data.color !== undefined) updateData.color = data.color;
        if (data.isOvernight !== undefined) updateData.is_overnight = data.isOvernight;
        if (data.isActive !== undefined) updateData.is_active = data.isActive;

        const { data: template, error } = await supabaseAdmin
            .from('shift_templates')
            .update(updateData)
            .eq('id', templateId)
            .eq('company_id', companyId)
            .select()
            .single();

        if (error) {
            logger.error('Error updating shift template', { error, templateId });
            throw error;
        }

        logger.info('Shift template updated', { templateId, companyId });
        return this.mapToShiftTemplate(template);
    }

    // Delete shift template (soft delete by setting is_active to false)
    async deleteTemplate(templateId: string, companyId: string): Promise<void> {
        await this.getTemplateById(templateId, companyId);

        const { error } = await supabaseAdmin
            .from('shift_templates')
            .update({ is_active: false })
            .eq('id', templateId)
            .eq('company_id', companyId);

        if (error) {
            logger.error('Error deleting shift template', { error, templateId });
            throw error;
        }

        logger.info('Shift template deactivated', { templateId, companyId });
    }

    // ========================================================================
    // SHIFT METHODS
    // ========================================================================

    // Check for shift conflicts
    async checkConflicts(
        companyId: string,
        employeeId: string,
        date: string,
        startTime: string,
        endTime: string,
        excludeShiftId?: string
    ): Promise<ShiftConflict | null> {
        // Get all shifts for this employee on this date
        let query = supabaseAdmin
            .from('shifts')
            .select(`
                id,
                start_time,
                end_time,
                employees!inner (
                    id,
                    full_name
                )
            `)
            .eq('company_id', companyId)
            .eq('employee_id', employeeId)
            .eq('date', date)
            .neq('status', 'cancelled');

        if (excludeShiftId) {
            query = query.neq('id', excludeShiftId);
        }

        const { data: existingShifts, error } = await query;

        if (error) {
            logger.error('Error checking shift conflicts', { error, employeeId, date });
            throw error;
        }

        if (!existingShifts || existingShifts.length === 0) {
            return null;
        }

        // Convert times to comparable format
        const newStart = this.timeToMinutes(startTime);
        const newEnd = this.timeToMinutes(endTime);

        for (const existing of existingShifts) {
            const existingStart = this.timeToMinutes(existing.start_time);
            const existingEnd = this.timeToMinutes(existing.end_time);

            // Check for overlap
            const hasOverlap = this.timesOverlap(newStart, newEnd, existingStart, existingEnd);

            if (hasOverlap) {
                const employeeRow = existing.employees as unknown as { id: string; full_name: string };
                return {
                    existingShiftId: existing.id,
                    employeeId: employeeId,
                    employeeName: employeeRow?.full_name || 'Unknown',
                    date: date,
                    conflictType: newStart === existingStart && newEnd === existingEnd ? 'exact' : 'overlap',
                    existingTimeRange: `${existing.start_time.substring(0, 5)}-${existing.end_time.substring(0, 5)}`,
                    newTimeRange: `${startTime}-${endTime}`,
                };
            }
        }

        return null;
    }

    // Helper: Convert time string to minutes
    private timeToMinutes(time: string): number {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    // Helper: Check if times overlap
    private timesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
        // Handle overnight shifts where end is before start
        if (end1 < start1) end1 += 24 * 60;
        if (end2 < start2) end2 += 24 * 60;

        return start1 < end2 && end1 > start2;
    }

    // Get shift by ID
    async getById(shiftId: string, companyId: string): Promise<Shift> {
        const { data, error } = await supabaseAdmin
            .from('shifts')
            .select('*')
            .eq('id', shiftId)
            .eq('company_id', companyId)
            .single();

        if (error || !data) {
            throw new NotFoundError('Shift not found', 'ไม่พบกะ');
        }

        return this.mapToShift(data);
    }

    // Get shift with details by ID
    async getByIdWithDetails(shiftId: string, companyId: string): Promise<ShiftWithDetails> {
        const { data, error } = await supabaseAdmin
            .from('shifts')
            .select(`
                *,
                employees!inner (
                    id,
                    full_name,
                    employee_code
                ),
                shift_templates (
                    id,
                    name,
                    name_th,
                    color
                )
            `)
            .eq('id', shiftId)
            .eq('company_id', companyId)
            .single();

        if (error || !data) {
            throw new NotFoundError('Shift not found', 'ไม่พบกะ');
        }

        return this.mapToShiftWithDetails(data as ShiftRowWithEmployee);
    }

    // List shifts with pagination and filters
    async list(
        companyId: string,
        query: ListShiftsQuery
    ): Promise<{ shifts: ShiftWithDetails[]; total: number }> {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 50;
        const offset = (page - 1) * pageSize;

        let queryBuilder = supabaseAdmin
            .from('shifts')
            .select(`
                *,
                employees!inner (
                    id,
                    full_name,
                    employee_code
                ),
                shift_templates (
                    id,
                    name,
                    name_th,
                    color
                )
            `, { count: 'exact' })
            .eq('company_id', companyId)
            .order('date', { ascending: true })
            .order('start_time', { ascending: true });

        if (query.startDate) {
            queryBuilder = queryBuilder.gte('date', query.startDate);
        }
        if (query.endDate) {
            queryBuilder = queryBuilder.lte('date', query.endDate);
        }
        if (query.employeeId) {
            queryBuilder = queryBuilder.eq('employee_id', query.employeeId);
        }
        if (query.status) {
            queryBuilder = queryBuilder.eq('status', query.status);
        }

        queryBuilder = queryBuilder.range(offset, offset + pageSize - 1);

        const { data, error, count } = await queryBuilder;

        if (error) {
            logger.error('Error listing shifts', { error, companyId });
            throw error;
        }

        const shifts = (data || []).map(row => this.mapToShiftWithDetails(row as ShiftRowWithEmployee));

        return {
            shifts,
            total: count ?? 0,
        };
    }

    // Create a single shift
    async create(
        companyId: string,
        data: CreateShiftRequest,
        createdBy: string
    ): Promise<Shift> {
        // Check for conflicts
        const conflict = await this.checkConflicts(
            companyId,
            data.employeeId,
            data.date,
            data.startTime,
            data.endTime
        );

        if (conflict) {
            throw new ConflictError(
                `Shift conflicts with existing shift (${conflict.existingTimeRange})`,
                `กะทับซ้อนกับกะที่มีอยู่ (${conflict.existingTimeRange})`
            );
        }

        const { data: shift, error } = await supabaseAdmin
            .from('shifts')
            .insert({
                company_id: companyId,
                employee_id: data.employeeId,
                template_id: data.templateId || null,
                date: data.date,
                start_time: data.startTime,
                end_time: data.endTime,
                location: data.location || null,
                notes: data.notes || null,
                status: 'draft',
                created_by: createdBy,
            })
            .select()
            .single();

        if (error) {
            logger.error('Error creating shift', { error, companyId });
            throw error;
        }

        logger.info('Shift created', { shiftId: shift.id, companyId, employeeId: data.employeeId });
        return this.mapToShift(shift);
    }

    // Bulk create shifts
    async bulkCreate(
        companyId: string,
        data: BulkCreateShiftsRequest,
        createdBy: string
    ): Promise<BulkCreateResult> {
        const result: BulkCreateResult = {
            created: [],
            skipped: [],
        };

        for (let i = 0; i < data.shifts.length; i++) {
            const shiftData = data.shifts[i];

            // Check for conflicts
            const conflict = await this.checkConflicts(
                companyId,
                shiftData.employeeId,
                shiftData.date,
                shiftData.startTime,
                shiftData.endTime
            );

            if (conflict) {
                result.skipped.push({
                    index: i,
                    reason: `Conflicts with existing shift (${conflict.existingTimeRange})`,
                    conflict,
                });
                continue;
            }

            try {
                const shift = await this.create(companyId, shiftData, createdBy);
                result.created.push(shift);
            } catch (err) {
                result.skipped.push({
                    index: i,
                    reason: err instanceof Error ? err.message : 'Unknown error',
                });
            }
        }

        logger.info('Bulk shift creation completed', {
            companyId,
            createdCount: result.created.length,
            skippedCount: result.skipped.length,
        });

        return result;
    }

    // Update shift
    async update(
        shiftId: string,
        companyId: string,
        data: UpdateShiftRequest
    ): Promise<Shift> {
        const existing = await this.getById(shiftId, companyId);

        // If changing date, time, or employee, check for conflicts
        if (data.date || data.startTime || data.endTime || data.employeeId) {
            const conflict = await this.checkConflicts(
                companyId,
                data.employeeId ?? existing.employeeId,
                data.date ?? existing.date,
                data.startTime ?? existing.startTime,
                data.endTime ?? existing.endTime,
                shiftId
            );

            if (conflict) {
                throw new ConflictError(
                    `Shift conflicts with existing shift (${conflict.existingTimeRange})`,
                    `กะทับซ้อนกับกะที่มีอยู่ (${conflict.existingTimeRange})`
                );
            }
        }

        const updateData: Record<string, unknown> = {};

        if (data.employeeId !== undefined) updateData.employee_id = data.employeeId;
        if (data.templateId !== undefined) updateData.template_id = data.templateId;
        if (data.date !== undefined) updateData.date = data.date;
        if (data.startTime !== undefined) updateData.start_time = data.startTime;
        if (data.endTime !== undefined) updateData.end_time = data.endTime;
        if (data.location !== undefined) updateData.location = data.location;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.status !== undefined) updateData.status = data.status;

        const { data: shift, error } = await supabaseAdmin
            .from('shifts')
            .update(updateData)
            .eq('id', shiftId)
            .eq('company_id', companyId)
            .select()
            .single();

        if (error) {
            logger.error('Error updating shift', { error, shiftId });
            throw error;
        }

        logger.info('Shift updated', { shiftId, companyId });
        return this.mapToShift(shift);
    }

    // Delete shift
    async delete(shiftId: string, companyId: string): Promise<void> {
        await this.getById(shiftId, companyId);

        const { error } = await supabaseAdmin
            .from('shifts')
            .delete()
            .eq('id', shiftId)
            .eq('company_id', companyId);

        if (error) {
            logger.error('Error deleting shift', { error, shiftId });
            throw error;
        }

        logger.info('Shift deleted', { shiftId, companyId });
    }

    // Publish shifts
    async publish(companyId: string, data: PublishShiftsRequest): Promise<Shift[]> {
        const now = new Date().toISOString();
        let query = supabaseAdmin
            .from('shifts')
            .update({ status: 'published', published_at: now })
            .eq('company_id', companyId)
            .eq('status', 'draft');

        if (data.shiftIds && data.shiftIds.length > 0) {
            query = query.in('id', data.shiftIds);
        } else if (data.startDate && data.endDate) {
            query = query.gte('date', data.startDate).lte('date', data.endDate);
        } else {
            throw new BadRequestError(
                'Either shiftIds or both startDate and endDate are required',
                'ต้องระบุ shiftIds หรือทั้ง startDate และ endDate'
            );
        }

        const { data: shifts, error } = await query.select();

        if (error) {
            logger.error('Error publishing shifts', { error, companyId });
            throw error;
        }

        logger.info('Shifts published', { companyId, count: shifts?.length ?? 0 });
        return (shifts || []).map(row => this.mapToShift(row));
    }

    // Copy shifts from one week to another
    async copyShifts(companyId: string, data: CopyShiftsRequest, createdBy: string): Promise<BulkCreateResult> {
        // Get source week shifts
        const sourceEndDate = this.addDays(data.sourceStartDate, 6);

        let query = supabaseAdmin
            .from('shifts')
            .select('*')
            .eq('company_id', companyId)
            .gte('date', data.sourceStartDate)
            .lte('date', sourceEndDate)
            .neq('status', 'cancelled');

        if (data.employeeIds && data.employeeIds.length > 0) {
            query = query.in('employee_id', data.employeeIds);
        }

        const { data: sourceShifts, error } = await query;

        if (error) {
            logger.error('Error fetching source shifts', { error, companyId });
            throw error;
        }

        if (!sourceShifts || sourceShifts.length === 0) {
            return { created: [], skipped: [] };
        }

        // Calculate day difference
        const sourceMondayDate = new Date(data.sourceStartDate);
        const targetMondayDate = new Date(data.targetStartDate);
        const daysDiff = Math.round((targetMondayDate.getTime() - sourceMondayDate.getTime()) / (1000 * 60 * 60 * 24));

        // Create new shifts
        const newShifts: CreateShiftRequest[] = sourceShifts.map(shift => {
            const sourceDate = new Date(shift.date);
            const targetDate = new Date(sourceDate.getTime() + daysDiff * 24 * 60 * 60 * 1000);

            return {
                employeeId: shift.employee_id,
                templateId: shift.template_id || undefined,
                date: targetDate.toISOString().split('T')[0],
                startTime: shift.start_time.substring(0, 5),
                endTime: shift.end_time.substring(0, 5),
                location: shift.location || undefined,
                notes: shift.notes || undefined,
            };
        });

        return this.bulkCreate(companyId, { shifts: newShifts }, createdBy);
    }

    // Helper: Add days to date string
    private addDays(dateStr: string, days: number): string {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }

    // Get calendar data
    async getCalendar(
        companyId: string,
        startDate: string,
        endDate: string,
        employeeId?: string
    ): Promise<CalendarResponse> {
        let query = supabaseAdmin
            .from('shifts')
            .select(`
                *,
                employees!inner (
                    id,
                    full_name,
                    employee_code
                ),
                shift_templates (
                    id,
                    name,
                    name_th,
                    color
                )
            `)
            .eq('company_id', companyId)
            .gte('date', startDate)
            .lte('date', endDate)
            .neq('status', 'cancelled')
            .order('date', { ascending: true })
            .order('start_time', { ascending: true });

        if (employeeId) {
            query = query.eq('employee_id', employeeId);
        }

        const { data: shifts, error } = await query;

        if (error) {
            logger.error('Error fetching calendar data', { error, companyId });
            throw error;
        }

        // Group shifts by date
        const shiftsByDate = new Map<string, ShiftWithDetails[]>();

        for (const row of shifts || []) {
            const shift = this.mapToShiftWithDetails(row as ShiftRowWithEmployee);
            const existing = shiftsByDate.get(shift.date) || [];
            existing.push(shift);
            shiftsByDate.set(shift.date, existing);
        }

        // Generate all days in range
        const days: CalendarDayData[] = [];
        let currentDate = new Date(startDate);
        const end = new Date(endDate);

        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            days.push({
                date: dateStr,
                shifts: shiftsByDate.get(dateStr) || [],
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return {
            days,
            meta: {
                startDate,
                endDate,
                totalShifts: shifts?.length ?? 0,
            },
        };
    }

    // Get my shifts (for guard view)
    async getMyShifts(companyId: string, employeeId: string, days: number = 7): Promise<MyShiftsResponse> {
        const today = new Date().toISOString().split('T')[0];
        const futureDate = this.addDays(today, days);
        const pastDate = this.addDays(today, -days);

        // Get all shifts in range
        const { data: shifts, error } = await supabaseAdmin
            .from('shifts')
            .select(`
                *,
                employees!inner (
                    id,
                    full_name,
                    employee_code
                ),
                shift_templates (
                    id,
                    name,
                    name_th,
                    color
                )
            `)
            .eq('company_id', companyId)
            .eq('employee_id', employeeId)
            .eq('status', 'published')
            .gte('date', pastDate)
            .lte('date', futureDate)
            .order('date', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) {
            logger.error('Error fetching my shifts', { error, employeeId });
            throw error;
        }

        const mappedShifts = (shifts || []).map(row => this.mapToShiftWithDetails(row as ShiftRowWithEmployee));

        const todayShifts = mappedShifts.filter(s => s.date === today);
        const upcomingShifts = mappedShifts.filter(s => s.date > today);
        const pastShifts = mappedShifts.filter(s => s.date < today);

        return {
            today: todayShifts.length > 0 ? todayShifts[0] : null,
            upcoming: upcomingShifts,
            past: pastShifts,
        };
    }
}

export const shiftService = new ShiftService();
export default shiftService;

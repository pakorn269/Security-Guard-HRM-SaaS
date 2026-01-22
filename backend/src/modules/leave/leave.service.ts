import { supabaseAdmin } from '../../config/supabase.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';
import type {
    LeaveType,
    LeaveTypeRow,
    LeaveRequest,
    LeaveRequestRow,
    LeaveRequestRowWithDetails,
    LeaveRequestWithDetails,
    LeaveBalance,
    LeaveBalanceRow,
    LeaveBalanceRowWithType,
    LeaveBalanceWithType,
    LeaveBalanceRowWithDetails,
    LeaveBalanceWithDetails,
    CreateLeaveTypeRequest,
    UpdateLeaveTypeRequest,
    CreateLeaveRequestPayload,
    ApproveLeaveRequest,
    RejectLeaveRequest,
    ListLeaveTypesQuery,
    ListLeaveRequestsQuery,
    ListLeaveBalancesQuery,
    MyLeaveDataResponse,
    LeaveCalendarEntry,
    LeaveSummary,
} from './leave.types.js';

class LeaveService {
    // ========================================================================
    // MAPPERS
    // ========================================================================

    // Map database row to LeaveType
    private mapToLeaveType(row: LeaveTypeRow): LeaveType {
        return {
            id: row.id,
            companyId: row.company_id,
            name: row.name,
            nameTh: row.name_th,
            description: row.description,
            isPaid: row.is_paid,
            maxDaysPerYear: row.max_days_per_year,
            requiresApproval: row.requires_approval,
            requiresDocument: row.requires_document,
            isActive: row.is_active,
            sortOrder: row.sort_order,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    // Map database row to LeaveRequest
    private mapToLeaveRequest(row: LeaveRequestRow): LeaveRequest {
        return {
            id: row.id,
            companyId: row.company_id,
            employeeId: row.employee_id,
            leaveTypeId: row.leave_type_id,
            startDate: row.start_date,
            endDate: row.end_date,
            totalDays: row.total_days,
            reason: row.reason,
            documentUrl: row.document_url,
            status: row.status,
            reviewedBy: row.reviewed_by,
            reviewedAt: row.reviewed_at,
            reviewNotes: row.review_notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    // Map database row with details to LeaveRequestWithDetails
    private mapToLeaveRequestWithDetails(row: LeaveRequestRowWithDetails): LeaveRequestWithDetails {
        const base = this.mapToLeaveRequest(row);
        return {
            ...base,
            employee: row.employees ? {
                id: row.employees.id,
                fullName: row.employees.full_name,
                employeeCode: row.employees.employee_code,
            } : undefined,
            leaveType: row.leave_types ? {
                id: row.leave_types.id,
                name: row.leave_types.name,
                nameTh: row.leave_types.name_th,
                isPaid: row.leave_types.is_paid,
            } : undefined,
            reviewer: row.reviewer ? {
                id: row.reviewer.id,
                email: row.reviewer.email,
            } : undefined,
        };
    }

    // Map database row to LeaveBalance
    private mapToLeaveBalance(row: LeaveBalanceRow): LeaveBalance {
        return {
            id: row.id,
            companyId: row.company_id,
            employeeId: row.employee_id,
            leaveTypeId: row.leave_type_id,
            year: row.year,
            entitledDays: row.entitled_days,
            usedDays: row.used_days,
            pendingDays: row.pending_days,
            remainingDays: row.entitled_days - row.used_days - row.pending_days,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    // Map database row with type to LeaveBalanceWithType
    private mapToLeaveBalanceWithType(row: LeaveBalanceRowWithType): LeaveBalanceWithType {
        const base = this.mapToLeaveBalance(row);
        return {
            ...base,
            leaveType: row.leave_types ? {
                id: row.leave_types.id,
                name: row.leave_types.name,
                nameTh: row.leave_types.name_th,
                isPaid: row.leave_types.is_paid,
            } : undefined,
        };
    }

    // Map database row with details to LeaveBalanceWithDetails
    private mapToLeaveBalanceWithDetails(row: LeaveBalanceRowWithDetails): LeaveBalanceWithDetails {
        const base = this.mapToLeaveBalance(row);
        return {
            ...base,
            leaveType: row.leave_types ? {
                id: row.leave_types.id,
                name: row.leave_types.name,
                nameTh: row.leave_types.name_th,
                isPaid: row.leave_types.is_paid,
            } : undefined,
            employee: row.employees ? {
                id: row.employees.id,
                fullName: row.employees.full_name,
                employeeCode: row.employees.employee_code,
            } : undefined,
        };
    }

    // Helper to ensure balances exist for an employee for a given year
    private async ensureBalancesForEmployee(
        companyId: string,
        employeeId: string,
        year: number
    ): Promise<void> {
        // Get all active leave types and existing balances in parallel
        const [leaveTypesResult, balancesResult] = await Promise.all([
            supabaseAdmin
                .from('leave_types')
                .select('id, max_days_per_year')
                .eq('company_id', companyId)
                .eq('is_active', true),
            supabaseAdmin
                .from('leave_balances')
                .select('leave_type_id')
                .eq('company_id', companyId)
                .eq('employee_id', employeeId)
                .eq('year', year)
        ]);

        const { data: leaveTypes, error: leaveTypesError } = leaveTypesResult;
        if (leaveTypesError) {
            logger.error('Error fetching leave types for balance ensuring:', leaveTypesError);
            throw leaveTypesError;
        }

        const { data: existingBalances, error: balancesError } = balancesResult;
        if (balancesError) {
            logger.error('Error fetching existing balances for balance ensuring:', balancesError);
            throw balancesError;
        }

        const existingLeaveTypeIds = new Set((existingBalances || []).map(b => b.leave_type_id));

        const missingBalances = (leaveTypes || [])
            .filter(lt => !existingLeaveTypeIds.has(lt.id))
            .map(lt => ({
                company_id: companyId,
                employee_id: employeeId,
                leave_type_id: lt.id,
                year: year,
                entitled_days: lt.max_days_per_year || 0,
                used_days: 0,
                pending_days: 0,
            }));

        if (missingBalances.length > 0) {
            const { error: insertError } = await supabaseAdmin
                .from('leave_balances')
                .insert(missingBalances);

            if (insertError) {
                logger.error('Error creating missing leave balances:', insertError);
                throw insertError;
            }
        }
    }

    // ========================================================================
    // LEAVE TYPE OPERATIONS
    // ========================================================================

    // List all leave types for a company
    async listLeaveTypes(
        companyId: string,
        query: ListLeaveTypesQuery = {}
    ): Promise<LeaveType[]> {
        let queryBuilder = supabaseAdmin
            .from('leave_types')
            .select('*')
            .eq('company_id', companyId)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true });

        if (!query.includeInactive) {
            queryBuilder = queryBuilder.eq('is_active', true);
        }

        const { data, error } = await queryBuilder;

        if (error) {
            logger.error('Error listing leave types:', error);
            throw error;
        }

        return (data as LeaveTypeRow[]).map(this.mapToLeaveType);
    }

    // Get leave type by ID
    async getLeaveTypeById(
        leaveTypeId: string,
        companyId: string
    ): Promise<LeaveType> {
        const { data, error } = await supabaseAdmin
            .from('leave_types')
            .select('*')
            .eq('id', leaveTypeId)
            .eq('company_id', companyId)
            .single();

        if (error || !data) {
            throw new NotFoundError('Leave type not found');
        }

        return this.mapToLeaveType(data as LeaveTypeRow);
    }

    // Create leave type
    async createLeaveType(
        companyId: string,
        data: CreateLeaveTypeRequest
    ): Promise<LeaveType> {
        const { data: created, error } = await supabaseAdmin
            .from('leave_types')
            .insert({
                company_id: companyId,
                name: data.name,
                name_th: data.nameTh || null,
                description: data.description || null,
                is_paid: data.isPaid ?? true,
                max_days_per_year: data.maxDaysPerYear || null,
                requires_approval: data.requiresApproval ?? true,
                requires_document: data.requiresDocument ?? false,
                is_active: data.isActive ?? true,
                sort_order: data.sortOrder ?? 0,
            })
            .select()
            .single();

        if (error) {
            logger.error('Error creating leave type:', error);
            throw error;
        }

        return this.mapToLeaveType(created as LeaveTypeRow);
    }

    // Update leave type
    async updateLeaveType(
        leaveTypeId: string,
        companyId: string,
        data: UpdateLeaveTypeRequest
    ): Promise<LeaveType> {
        // Build update object
        const updateData: Record<string, unknown> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.nameTh !== undefined) updateData.name_th = data.nameTh;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.isPaid !== undefined) updateData.is_paid = data.isPaid;
        if (data.maxDaysPerYear !== undefined) updateData.max_days_per_year = data.maxDaysPerYear;
        if (data.requiresApproval !== undefined) updateData.requires_approval = data.requiresApproval;
        if (data.requiresDocument !== undefined) updateData.requires_document = data.requiresDocument;
        if (data.isActive !== undefined) updateData.is_active = data.isActive;
        if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;
        updateData.updated_at = new Date().toISOString();

        const { data: updated, error } = await supabaseAdmin
            .from('leave_types')
            .update(updateData)
            .eq('id', leaveTypeId)
            .eq('company_id', companyId)
            .select()
            .single();

        if (error || !updated) {
            throw new NotFoundError('Leave type not found');
        }

        return this.mapToLeaveType(updated as LeaveTypeRow);
    }

    // Delete leave type (soft delete by setting is_active = false)
    async deleteLeaveType(
        leaveTypeId: string,
        companyId: string
    ): Promise<void> {
        // Check if there are any leave requests using this type
        const { count } = await supabaseAdmin
            .from('leave_requests')
            .select('*', { count: 'exact', head: true })
            .eq('leave_type_id', leaveTypeId)
            .eq('company_id', companyId);

        if (count && count > 0) {
            // Soft delete - just deactivate
            const { error } = await supabaseAdmin
                .from('leave_types')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', leaveTypeId)
                .eq('company_id', companyId);

            if (error) {
                throw error;
            }
        } else {
            // Hard delete if no requests exist
            const { error } = await supabaseAdmin
                .from('leave_types')
                .delete()
                .eq('id', leaveTypeId)
                .eq('company_id', companyId);

            if (error) {
                throw error;
            }
        }
    }

    // ========================================================================
    // LEAVE REQUEST OPERATIONS
    // ========================================================================

    // Calculate total days between two dates (inclusive)
    private calculateTotalDays(startDate: string, endDate: string): number {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    }

    // Get employee's leave balance for a leave type and year
    async getOrCreateSingleBalance(
        companyId: string,
        employeeId: string,
        leaveTypeId: string,
        year: number
    ): Promise<LeaveBalance> {
        // Try to get existing balance
        const { data: existing } = await supabaseAdmin
            .from('leave_balances')
            .select('*')
            .eq('company_id', companyId)
            .eq('employee_id', employeeId)
            .eq('leave_type_id', leaveTypeId)
            .eq('year', year)
            .single();

        if (existing) {
            return this.mapToLeaveBalance(existing as LeaveBalanceRow);
        }

        // Get leave type to determine max days
        const { data: leaveType } = await supabaseAdmin
            .from('leave_types')
            .select('max_days_per_year')
            .eq('id', leaveTypeId)
            .single();

        const entitledDays = leaveType?.max_days_per_year ?? 0;

        // Create new balance
        const { data: created, error } = await supabaseAdmin
            .from('leave_balances')
            .insert({
                company_id: companyId,
                employee_id: employeeId,
                leave_type_id: leaveTypeId,
                year: year,
                entitled_days: entitledDays,
                used_days: 0,
                pending_days: 0,
            })
            .select()
            .single();

        if (error) {
            logger.error('Error creating leave balance:', error);
            throw error;
        }

        return this.mapToLeaveBalance(created as LeaveBalanceRow);
    }

    // Create leave request
    async createLeaveRequest(
        companyId: string,
        employeeId: string,
        data: CreateLeaveRequestPayload
    ): Promise<LeaveRequestWithDetails> {
        const totalDays = this.calculateTotalDays(data.startDate, data.endDate);
        const year = new Date(data.startDate).getFullYear();

        // Get leave type
        const leaveType = await this.getLeaveTypeById(data.leaveTypeId, companyId);
        if (!leaveType.isActive) {
            throw new BadRequestError('Leave type is not active');
        }

        // Check balance if max days is defined
        if (leaveType.maxDaysPerYear !== null) {
            const balance = await this.getOrCreateSingleBalance(
                companyId,
                employeeId,
                data.leaveTypeId,
                year
            );

            const remainingDays = balance.entitledDays - balance.usedDays - balance.pendingDays;
            if (totalDays > remainingDays) {
                throw new BadRequestError(
                    `Insufficient leave balance. You have ${remainingDays} days remaining but requested ${totalDays} days.`
                );
            }
        }

        // Check for shift conflicts
        const { data: conflictingShifts } = await supabaseAdmin
            .from('shifts')
            .select('id, date')
            .eq('company_id', companyId)
            .eq('employee_id', employeeId)
            .eq('status', 'published')
            .gte('date', data.startDate)
            .lte('date', data.endDate);

        if (conflictingShifts && conflictingShifts.length > 0) {
            logger.info(`Leave request overlaps with ${conflictingShifts.length} shifts`);
            // We don't block, just log for now - manager will see when approving
        }

        // Determine initial status
        const status = leaveType.requiresApproval ? 'pending' : 'approved';

        // Create leave request
        const { data: created, error } = await supabaseAdmin
            .from('leave_requests')
            .insert({
                company_id: companyId,
                employee_id: employeeId,
                leave_type_id: data.leaveTypeId,
                start_date: data.startDate,
                end_date: data.endDate,
                total_days: totalDays,
                reason: data.reason || null,
                document_url: data.documentUrl || null,
                status: status,
                reviewed_at: !leaveType.requiresApproval ? new Date().toISOString() : null,
            })
            .select(`
                *,
                employees:employee_id (id, full_name, employee_code),
                leave_types:leave_type_id (id, name, name_th, is_paid)
            `)
            .single();

        if (error) {
            logger.error('Error creating leave request:', error);
            throw error;
        }

        // Update pending days in balance
        if (status === 'pending' && leaveType.maxDaysPerYear !== null) {
            await supabaseAdmin
                .from('leave_balances')
                .update({
                    pending_days: supabaseAdmin.rpc('increment', { value: totalDays }) as unknown as number,
                    updated_at: new Date().toISOString(),
                })
                .eq('company_id', companyId)
                .eq('employee_id', employeeId)
                .eq('leave_type_id', data.leaveTypeId)
                .eq('year', year);

            // Fallback: direct update
            const { data: currentBalance } = await supabaseAdmin
                .from('leave_balances')
                .select('pending_days')
                .eq('company_id', companyId)
                .eq('employee_id', employeeId)
                .eq('leave_type_id', data.leaveTypeId)
                .eq('year', year)
                .single();

            if (currentBalance) {
                await supabaseAdmin
                    .from('leave_balances')
                    .update({
                        pending_days: currentBalance.pending_days + totalDays,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('company_id', companyId)
                    .eq('employee_id', employeeId)
                    .eq('leave_type_id', data.leaveTypeId)
                    .eq('year', year);
            }
        } else if (status === 'approved' && leaveType.maxDaysPerYear !== null) {
            // Auto-approved - update used days directly
            const { data: currentBalance } = await supabaseAdmin
                .from('leave_balances')
                .select('used_days')
                .eq('company_id', companyId)
                .eq('employee_id', employeeId)
                .eq('leave_type_id', data.leaveTypeId)
                .eq('year', year)
                .single();

            if (currentBalance) {
                await supabaseAdmin
                    .from('leave_balances')
                    .update({
                        used_days: currentBalance.used_days + totalDays,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('company_id', companyId)
                    .eq('employee_id', employeeId)
                    .eq('leave_type_id', data.leaveTypeId)
                    .eq('year', year);
            }
        }

        return this.mapToLeaveRequestWithDetails(created as LeaveRequestRowWithDetails);
    }

    // List leave requests
    async listLeaveRequests(
        companyId: string,
        query: ListLeaveRequestsQuery = {}
    ): Promise<{ requests: LeaveRequestWithDetails[]; total: number }> {
        const page = query.page || 1;
        const pageSize = query.pageSize || 50;
        const offset = (page - 1) * pageSize;

        let queryBuilder = supabaseAdmin
            .from('leave_requests')
            .select(`
                *,
                employees:employee_id (id, full_name, employee_code),
                leave_types:leave_type_id (id, name, name_th, is_paid)
            `, { count: 'exact' })
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);

        if (query.employeeId) {
            queryBuilder = queryBuilder.eq('employee_id', query.employeeId);
        }
        if (query.status) {
            queryBuilder = queryBuilder.eq('status', query.status);
        }
        if (query.startDate) {
            queryBuilder = queryBuilder.gte('start_date', query.startDate);
        }
        if (query.endDate) {
            queryBuilder = queryBuilder.lte('end_date', query.endDate);
        }

        const { data, error, count } = await queryBuilder;

        if (error) {
            logger.error('Error listing leave requests:', error);
            throw error;
        }

        return {
            requests: (data as LeaveRequestRowWithDetails[]).map(r => this.mapToLeaveRequestWithDetails(r)),
            total: count || 0,
        };
    }

    // Get leave request by ID
    async getLeaveRequestById(
        requestId: string,
        companyId: string
    ): Promise<LeaveRequestWithDetails> {
        const { data, error } = await supabaseAdmin
            .from('leave_requests')
            .select(`
                *,
                employees:employee_id (id, full_name, employee_code),
                leave_types:leave_type_id (id, name, name_th, is_paid),
                reviewer:reviewed_by (id, email)
            `)
            .eq('id', requestId)
            .eq('company_id', companyId)
            .single();

        if (error || !data) {
            throw new NotFoundError('Leave request not found');
        }

        return this.mapToLeaveRequestWithDetails(data as LeaveRequestRowWithDetails);
    }

    // Approve leave request
    async approveLeaveRequest(
        requestId: string,
        companyId: string,
        reviewerId: string,
        data: ApproveLeaveRequest = {}
    ): Promise<LeaveRequestWithDetails> {
        // Get current request
        const request = await this.getLeaveRequestById(requestId, companyId);

        if (request.status !== 'pending') {
            throw new BadRequestError(`Cannot approve request with status: ${request.status}`);
        }

        // Update request
        const { data: updated, error } = await supabaseAdmin
            .from('leave_requests')
            .update({
                status: 'approved',
                reviewed_by: reviewerId,
                reviewed_at: new Date().toISOString(),
                review_notes: data.reviewNotes || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', requestId)
            .eq('company_id', companyId)
            .select(`
                *,
                employees:employee_id (id, full_name, employee_code),
                leave_types:leave_type_id (id, name, name_th, is_paid)
            `)
            .single();

        if (error || !updated) {
            throw error || new Error('Failed to update leave request');
        }

        // Update balance: move from pending to used
        const year = new Date(request.startDate).getFullYear();
        const { data: currentBalance } = await supabaseAdmin
            .from('leave_balances')
            .select('*')
            .eq('company_id', companyId)
            .eq('employee_id', request.employeeId)
            .eq('leave_type_id', request.leaveTypeId)
            .eq('year', year)
            .single();

        if (currentBalance) {
            await supabaseAdmin
                .from('leave_balances')
                .update({
                    pending_days: Math.max(0, currentBalance.pending_days - request.totalDays),
                    used_days: currentBalance.used_days + request.totalDays,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', currentBalance.id);
        }

        const result = this.mapToLeaveRequestWithDetails(updated as LeaveRequestRowWithDetails);
        this.sendLeaveStatusNotification(companyId, result, 'approved').catch(err =>
            logger.error('Failed to send leave notification', err)
        );
        return result;
    }

    // Reject leave request
    async rejectLeaveRequest(
        requestId: string,
        companyId: string,
        reviewerId: string,
        data: RejectLeaveRequest
    ): Promise<LeaveRequestWithDetails> {
        // Get current request
        const request = await this.getLeaveRequestById(requestId, companyId);

        if (request.status !== 'pending') {
            throw new BadRequestError(`Cannot reject request with status: ${request.status}`);
        }

        // Update request
        const { data: updated, error } = await supabaseAdmin
            .from('leave_requests')
            .update({
                status: 'rejected',
                reviewed_by: reviewerId,
                reviewed_at: new Date().toISOString(),
                review_notes: data.reviewNotes,
                updated_at: new Date().toISOString(),
            })
            .eq('id', requestId)
            .eq('company_id', companyId)
            .select(`
                *,
                employees:employee_id (id, full_name, employee_code),
                leave_types:leave_type_id (id, name, name_th, is_paid)
            `)
            .single();

        if (error || !updated) {
            throw error || new Error('Failed to update leave request');
        }

        // Update balance: remove from pending
        const year = new Date(request.startDate).getFullYear();
        const { data: currentBalance } = await supabaseAdmin
            .from('leave_balances')
            .select('*')
            .eq('company_id', companyId)
            .eq('employee_id', request.employeeId)
            .eq('leave_type_id', request.leaveTypeId)
            .eq('year', year)
            .single();

        if (currentBalance) {
            await supabaseAdmin
                .from('leave_balances')
                .update({
                    pending_days: Math.max(0, currentBalance.pending_days - request.totalDays),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', currentBalance.id);
        }

        const result = this.mapToLeaveRequestWithDetails(updated as LeaveRequestRowWithDetails);
        this.sendLeaveStatusNotification(companyId, result, 'rejected').catch(err =>
            logger.error('Failed to send leave notification', err)
        );
        return result;
    }

    // Cancel leave request (by employee)
    async cancelLeaveRequest(
        requestId: string,
        companyId: string,
        employeeId: string
    ): Promise<LeaveRequestWithDetails> {
        // Get current request
        const request = await this.getLeaveRequestById(requestId, companyId);

        // Only the owner can cancel
        if (request.employeeId !== employeeId) {
            throw new ForbiddenError('You can only cancel your own leave requests');
        }

        // Can only cancel pending or approved (if start date hasn't passed)
        const today = new Date().toISOString().slice(0, 10);
        if (request.status === 'approved' && request.startDate <= today) {
            throw new BadRequestError('Cannot cancel approved leave that has already started');
        }
        if (request.status !== 'pending' && request.status !== 'approved') {
            throw new BadRequestError(`Cannot cancel request with status: ${request.status}`);
        }

        const previousStatus = request.status;

        // Update request
        const { data: updated, error } = await supabaseAdmin
            .from('leave_requests')
            .update({
                status: 'cancelled',
                updated_at: new Date().toISOString(),
            })
            .eq('id', requestId)
            .eq('company_id', companyId)
            .select(`
                *,
                employees:employee_id (id, full_name, employee_code),
                leave_types:leave_type_id (id, name, name_th, is_paid)
            `)
            .single();

        if (error || !updated) {
            throw error || new Error('Failed to update leave request');
        }

        // Update balance
        const year = new Date(request.startDate).getFullYear();
        const { data: currentBalance } = await supabaseAdmin
            .from('leave_balances')
            .select('*')
            .eq('company_id', companyId)
            .eq('employee_id', request.employeeId)
            .eq('leave_type_id', request.leaveTypeId)
            .eq('year', year)
            .single();

        if (currentBalance) {
            if (previousStatus === 'pending') {
                // Remove from pending
                await supabaseAdmin
                    .from('leave_balances')
                    .update({
                        pending_days: Math.max(0, currentBalance.pending_days - request.totalDays),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', currentBalance.id);
            } else if (previousStatus === 'approved') {
                // Remove from used
                await supabaseAdmin
                    .from('leave_balances')
                    .update({
                        used_days: Math.max(0, currentBalance.used_days - request.totalDays),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', currentBalance.id);
            }
        }

        return this.mapToLeaveRequestWithDetails(updated as LeaveRequestRowWithDetails);
    }

    // ========================================================================
    // GUARD ENDPOINTS
    // ========================================================================

    // Get my leave data (for LIFF)
    async getMyLeaveData(
        companyId: string,
        employeeId: string,
        year?: number
    ): Promise<MyLeaveDataResponse> {
        const currentYear = year || new Date().getFullYear();

        // Ensure all balances exist for the employee for the current year.
        await this.ensureBalancesForEmployee(companyId, employeeId, currentYear);

        // Fetch all necessary data in parallel
        const [balancesResult, pendingRequestsResult, recentRequestsResult] = await Promise.all([
            supabaseAdmin
                .from('leave_balances')
                .select(`
                    *,
                    leave_types:leave_type_id (id, name, name_th, is_paid)
                `)
                .eq('company_id', companyId)
                .eq('employee_id', employeeId)
                .eq('year', currentYear),
            supabaseAdmin
                .from('leave_requests')
                .select(`
                    *,
                    employees:employee_id (id, full_name, employee_code),
                    leave_types:leave_type_id (id, name, name_th, is_paid)
                `)
                .eq('company_id', companyId)
                .eq('employee_id', employeeId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false }),
            supabaseAdmin
                .from('leave_requests')
                .select(`
                    *,
                    employees:employee_id (id, full_name, employee_code),
                    leave_types:leave_type_id (id, name, name_th, is_paid)
                `)
                .eq('company_id', companyId)
                .eq('employee_id', employeeId)
                .order('created_at', { ascending: false })
                .limit(10)
        ]);

        const { data: updatedBalances, error: balancesError } = balancesResult;
        if (balancesError) {
            logger.error('Error fetching leave balances:', balancesError);
            throw balancesError;
        }

        const { data: pendingRequests, error: pendingError } = pendingRequestsResult;
        if (pendingError) {
            logger.error('Error fetching pending requests:', pendingError);
            throw pendingError;
        }

        const { data: recentRequests, error: recentError } = recentRequestsResult;
        if (recentError) {
            logger.error('Error fetching recent requests:', recentError);
            throw recentError;
        }

        return {
            balances: (updatedBalances as LeaveBalanceRowWithType[] || []).map(b => this.mapToLeaveBalanceWithType(b)),
            pendingRequests: (pendingRequests as LeaveRequestRowWithDetails[] || []).map(r => this.mapToLeaveRequestWithDetails(r)),
            recentRequests: (recentRequests as LeaveRequestRowWithDetails[] || []).map(r => this.mapToLeaveRequestWithDetails(r)),
        };
    }

    // Get my leave requests (for LIFF history)
    async getMyLeaveRequests(
        companyId: string,
        employeeId: string,
        limit = 20
    ): Promise<LeaveRequestWithDetails[]> {
        const { data, error } = await supabaseAdmin
            .from('leave_requests')
            .select(`
                *,
                employees:employee_id (id, full_name, employee_code),
                leave_types:leave_type_id (id, name, name_th, is_paid)
            `)
            .eq('company_id', companyId)
            .eq('employee_id', employeeId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            logger.error('Error fetching my leave requests:', error);
            throw error;
        }

        return (data as LeaveRequestRowWithDetails[]).map(r => this.mapToLeaveRequestWithDetails(r));
    }

    // Get my leave balances (for LIFF)
    async getMyBalances(
        companyId: string,
        employeeId: string,
        year?: number
    ): Promise<LeaveBalanceWithType[]> {
        const currentYear = year || new Date().getFullYear();

        // Ensure balances exist for the employee
        await this.ensureBalancesForEmployee(companyId, employeeId, currentYear);

        // Fetch all balances now that we know they exist
        const { data: balances, error } = await supabaseAdmin
            .from('leave_balances')
            .select(`
                *,
                leave_types:leave_type_id (id, name, name_th, is_paid)
            `)
            .eq('company_id', companyId)
            .eq('employee_id', employeeId)
            .eq('year', currentYear);

        if (error) {
            logger.error('Error fetching my balances:', error);
            throw error;
        }

        return (balances as LeaveBalanceRowWithType[] || []).map(b => this.mapToLeaveBalanceWithType(b));
    }

    // ========================================================================
    // MANAGER ENDPOINTS
    // ========================================================================

    // Get leave calendar (who's off when)
    async getLeaveCalendar(
        companyId: string,
        startDate: string,
        endDate: string
    ): Promise<LeaveCalendarEntry[]> {
        const { data, error } = await supabaseAdmin
            .from('leave_requests')
            .select(`
                *,
                employees:employee_id (id, full_name, employee_code),
                leave_types:leave_type_id (id, name, name_th)
            `)
            .eq('company_id', companyId)
            .eq('status', 'approved')
            .lte('start_date', endDate)
            .gte('end_date', startDate);

        if (error) {
            logger.error('Error fetching leave calendar:', error);
            throw error;
        }

        // Group by date
        const calendarMap = new Map<string, LeaveCalendarEntry>();

        for (const request of (data as LeaveRequestRowWithDetails[] || [])) {
            const start = new Date(request.start_date);
            const end = new Date(request.end_date);

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().slice(0, 10);

                if (dateStr >= startDate && dateStr <= endDate) {
                    if (!calendarMap.has(dateStr)) {
                        calendarMap.set(dateStr, { date: dateStr, employees: [] });
                    }

                    calendarMap.get(dateStr)!.employees.push({
                        id: request.employees.id,
                        fullName: request.employees.full_name,
                        employeeCode: request.employees.employee_code,
                        leaveType: {
                            id: request.leave_types.id,
                            name: request.leave_types.name,
                            nameTh: request.leave_types.name_th,
                        },
                    });
                }
            }
        }

        return Array.from(calendarMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    // Get leave summary for dashboard
    async getLeaveSummary(companyId: string): Promise<LeaveSummary> {
        const today = new Date().toISOString().slice(0, 10);
        const startOfMonth = `${today.slice(0, 7)}-01`;
        const endOfMonth = new Date(new Date(today).getFullYear(), new Date(today).getMonth() + 1, 0).toISOString().slice(0, 10);
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        // Count pending requests
        const { count: pendingRequests } = await supabaseAdmin
            .from('leave_requests')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('status', 'pending');

        // Count approved this month
        const { count: approvedThisMonth } = await supabaseAdmin
            .from('leave_requests')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('status', 'approved')
            .gte('reviewed_at', startOfMonth)
            .lte('reviewed_at', endOfMonth);

        // Count employees on leave today
        const { count: onLeaveToday } = await supabaseAdmin
            .from('leave_requests')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('status', 'approved')
            .lte('start_date', today)
            .gte('end_date', today);

        // Count upcoming leaves (next 7 days)
        const { count: upcomingLeaves } = await supabaseAdmin
            .from('leave_requests')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('status', 'approved')
            .gt('start_date', today)
            .lte('start_date', nextWeek);

        return {
            pendingRequests: pendingRequests || 0,
            approvedThisMonth: approvedThisMonth || 0,
            employeesOnLeaveToday: onLeaveToday || 0,
            upcomingLeaves: upcomingLeaves || 0,
        };
    }

    // Get pending leave requests count
    async getPendingCount(companyId: string): Promise<number> {
        const { count, error } = await supabaseAdmin
            .from('leave_requests')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('status', 'pending');

        if (error) {
            logger.error('Error fetching pending count:', error);
            throw error;
        }

        return count || 0;
    }

    // ========================================================================
    // BALANCE MANAGEMENT
    // ========================================================================

    // List leave balances (admin)
    async listBalances(
        companyId: string,
        query: ListLeaveBalancesQuery
    ): Promise<{ balances: LeaveBalanceWithDetails[]; total: number }> {
        const year = query.year || new Date().getFullYear();
        const page = query.page || 1;
        const pageSize = query.pageSize || 50;
        const offset = (page - 1) * pageSize;

        let queryBuilder = supabaseAdmin
            .from('leave_balances')
            .select(`
                *,
                leave_types:leave_type_id (id, name, name_th, is_paid),
                employees:employee_id (id, full_name, employee_code)
            `, { count: 'exact' })
            .eq('company_id', companyId)
            .eq('year', year);

        if (query.employeeId) {
            queryBuilder = queryBuilder.eq('employee_id', query.employeeId);
        }

        if (query.leaveTypeId) {
            queryBuilder = queryBuilder.eq('leave_type_id', query.leaveTypeId);
        }

        // Note: sorting by foreign table column might need explicit foreignTable option
        const { data, count, error } = await queryBuilder
            .range(offset, offset + pageSize - 1)
            .order('full_name', { foreignTable: 'employees', ascending: true });

        if (error) {
            logger.error('Error listing leave balances:', error);
            throw error;
        }

        const balances = (data as LeaveBalanceRowWithDetails[] || []).map(b => this.mapToLeaveBalanceWithDetails(b));

        return {
            balances,
            total: count || 0,
        };
    }

    // Update employee's leave balance (admin)
    async updateBalance(
        companyId: string,
        employeeId: string,
        leaveTypeId: string,
        year: number,
        entitledDays: number
    ): Promise<LeaveBalance> {
        // Get or create balance
        const balance = await this.getOrCreateSingleBalance(companyId, employeeId, leaveTypeId, year);

        // Update entitled days
        const { data: updated, error } = await supabaseAdmin
            .from('leave_balances')
            .update({
                entitled_days: entitledDays,
                updated_at: new Date().toISOString(),
            })
            .eq('id', balance.id)
            .select()
            .single();

        if (error) {
            logger.error('Error updating leave balance:', error);
            throw error;
        }

        return this.mapToLeaveBalance(updated as LeaveBalanceRow);
    }

    // Send leave status notification
    private async sendLeaveStatusNotification(
        companyId: string,
        request: LeaveRequestWithDetails,
        status: 'approved' | 'rejected'
    ) {
        try {
            // Get user for employee
            const { data: user, error } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('employee_id', request.employeeId)
                .single();

            if (error || !user) return;

            const { NotificationService } = await import('../notifications/notifications.service.js');

            const isApproved = status === 'approved';
            const type = isApproved ? 'leave_approved' : 'leave_rejected';
            const title = isApproved ? 'Leave Approved' : 'Leave Rejected';
            const titleTh = isApproved ? 'อนุมัติการลา' : 'ปฏิเสธการลา';
            const message = isApproved
                ? `Your leave request for ${request.leaveType?.name} from ${request.startDate} to ${request.endDate} has been approved.`
                : `Your leave request for ${request.leaveType?.name} from ${request.startDate} to ${request.endDate} has been rejected.`;
            const messageTh = isApproved
                ? `คำขอลา ${request.leaveType?.nameTh || request.leaveType?.name} ของคุณตั้งแต่วันที่ ${request.startDate} ถึง ${request.endDate} ได้รับการอนุมัติแล้ว`
                : `คำขอลา ${request.leaveType?.nameTh || request.leaveType?.name} ของคุณตั้งแต่วันที่ ${request.startDate} ถึง ${request.endDate} ถูกปฏิเสธ`;

            await NotificationService.createNotification({
                companyId,
                userId: user.id,
                type,
                title,
                titleTh,
                message,
                messageTh,
                data: {
                    requestId: request.id,
                    startDate: request.startDate,
                    endDate: request.endDate,
                    leaveType: request.leaveType?.name,
                    status
                },
                channels: ['in_app', 'line']
            });
        } catch (error) {
            logger.error('Error sending leave notification', error);
        }
    }

    // Initialize balances for all employees (admin)
    async initializeBalancesForYear(
        companyId: string,
        year: number,
        employeeIds?: string[]
    ): Promise<{ created: number }> {
        // 1. Get all active employees for the company (or the specified subset)
        let employeeQuery = supabaseAdmin
            .from('employees')
            .select('id')
            .eq('company_id', companyId)
            .eq('status', 'active');

        if (employeeIds && employeeIds.length > 0) {
            employeeQuery = employeeQuery.in('id', employeeIds);
        }

        const { data: employees, error: employeesError } = await employeeQuery;
        if (employeesError) {
            logger.error('Error fetching employees for balance initialization:', employeesError);
            throw employeesError;
        }
        if (!employees || employees.length === 0) {
            return { created: 0 };
        }

        const targetEmployeeIds = employees.map(e => e.id);

        // 2. Get all active leave types for the company
        const { data: leaveTypes, error: leaveTypesError } = await supabaseAdmin
            .from('leave_types')
            .select('id, max_days_per_year')
            .eq('company_id', companyId)
            .eq('is_active', true);

        if (leaveTypesError) {
            logger.error('Error fetching leave types for balance initialization:', leaveTypesError);
            throw leaveTypesError;
        }
        if (!leaveTypes || leaveTypes.length === 0) {
            return { created: 0 };
        }

        // 3. Get all existing balances for the targeted employees and year
        const { data: existingBalances, error: balancesError } = await supabaseAdmin
            .from('leave_balances')
            .select('employee_id, leave_type_id')
            .eq('company_id', companyId)
            .eq('year', year)
            .in('employee_id', targetEmployeeIds);

        if (balancesError) {
            logger.error('Error fetching existing balances for initialization:', balancesError);
            throw balancesError;
        }

        // 4. Determine which balances are missing
        const existingBalancesSet = new Set(
            (existingBalances || []).map(b => `${b.employee_id}:${b.leave_type_id}`)
        );

        const balancesToCreate = [];
        for (const employee of employees) {
            for (const leaveType of leaveTypes) {
                const key = `${employee.id}:${leaveType.id}`;
                if (!existingBalancesSet.has(key)) {
                    balancesToCreate.push({
                        company_id: companyId,
                        employee_id: employee.id,
                        leave_type_id: leaveType.id,
                        year: year,
                        entitled_days: leaveType.max_days_per_year || 0,
                        used_days: 0,
                        pending_days: 0,
                    });
                }
            }
        }

        // 5. Bulk insert the missing balances
        if (balancesToCreate.length > 0) {
            const { error: insertError } = await supabaseAdmin
                .from('leave_balances')
                .insert(balancesToCreate);

            if (insertError) {
                logger.error('Error bulk inserting leave balances:', insertError);
                throw insertError;
            }
        }

        return { created: balancesToCreate.length };
    }
}

export const leaveService = new LeaveService();
export default leaveService;

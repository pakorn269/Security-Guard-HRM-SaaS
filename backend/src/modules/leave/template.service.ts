/**
 * Leave Request Template Service
 * Handles CRUD operations for leave request templates
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { NotFoundError, BadRequestError, AppError } from '../../utils/errors.js';
import type {
    LeaveRequestTemplateRow,
    LeaveRequestTemplateWithDetails,
    LeaveRequestTemplate,
    CreateTemplateRequest,
    UpdateTemplateRequest,
    TemplateDraft,
} from './leave.types.js';

export class TemplateService {
    /**
     * List all templates for a company
     */
    async listTemplates(
        companyId: string,
        options: {
            includeInactive?: boolean;
        } = {}
    ): Promise<LeaveRequestTemplate[]> {
        let query = supabaseAdmin
            .from('leave_request_templates')
            .select(
                `
                *,
                leave_type:leave_types!leave_type_id(id, name, name_th, is_paid),
                creator:users!created_by(id, email)
            `
            )
            .eq('company_id', companyId)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true });

        // Filter by active status unless includeInactive is true
        if (!options.includeInactive) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error listing templates:', error);
            throw new AppError('Failed to list templates', 'LIST_TEMPLATES_FAILED', 500);
        }

        return (data || []).map((template) => this.transformTemplate(template));
    }

    /**
     * Get a single template by ID
     */
    async getTemplateById(templateId: string, companyId: string): Promise<LeaveRequestTemplate> {
        const { data, error } = await supabaseAdmin
            .from('leave_request_templates')
            .select(
                `
                *,
                leave_type:leave_types!leave_type_id(id, name, name_th, is_paid),
                creator:users!created_by(id, email)
            `
            )
            .eq('id', templateId)
            .eq('company_id', companyId)
            .single();

        if (error || !data) {
            throw new NotFoundError('Template not found');
        }

        return this.transformTemplate(data);
    }

    /**
     * Create a new template
     */
    async createTemplate(
        companyId: string,
        createdBy: string,
        templateData: CreateTemplateRequest
    ): Promise<LeaveRequestTemplate> {
        // Validate leave type exists and belongs to company
        const { data: leaveType, error: leaveTypeError } = await supabaseAdmin
            .from('leave_types')
            .select('id')
            .eq('id', templateData.leaveTypeId)
            .eq('company_id', companyId)
            .single();

        if (leaveTypeError || !leaveType) {
            throw new BadRequestError('Leave type not found or does not belong to your company');
        }

        // Check for duplicate name
        const { data: existing } = await supabaseAdmin
            .from('leave_request_templates')
            .select('id')
            .eq('company_id', companyId)
            .eq('name', templateData.name)
            .single();

        if (existing) {
            throw new BadRequestError('A template with this name already exists');
        }

        // Create template
        const insertData = {
            company_id: companyId,
            name: templateData.name,
            name_th: templateData.nameTh || null,
            description: templateData.description || null,
            leave_type_id: templateData.leaveTypeId,
            default_days_count: templateData.defaultDaysCount || null,
            default_reason: templateData.defaultReason || null,
            is_active: templateData.isActive !== undefined ? templateData.isActive : true,
            sort_order: templateData.sortOrder || 0,
            created_by: createdBy,
        };

        const { data, error } = await supabaseAdmin
            .from('leave_request_templates')
            .insert(insertData)
            .select(
                `
                *,
                leave_type:leave_types!leave_type_id(id, name, name_th, is_paid),
                creator:users!created_by(id, email)
            `
            )
            .single();

        if (error || !data) {
            console.error('Error creating template:', error);
            throw new AppError('Failed to create template', 'CREATE_TEMPLATE_FAILED', 500);
        }

        return this.transformTemplate(data);
    }

    /**
     * Update a template
     */
    async updateTemplate(
        templateId: string,
        companyId: string,
        templateData: UpdateTemplateRequest
    ): Promise<LeaveRequestTemplate> {
        // Verify template exists and belongs to company
        const { data: existing, error: existingError } = await supabaseAdmin
            .from('leave_request_templates')
            .select('id, name')
            .eq('id', templateId)
            .eq('company_id', companyId)
            .single();

        if (existingError || !existing) {
            throw new NotFoundError('Template not found');
        }

        // If updating leave type, validate it exists and belongs to company
        if (templateData.leaveTypeId) {
            const { data: leaveType, error: leaveTypeError } = await supabaseAdmin
                .from('leave_types')
                .select('id')
                .eq('id', templateData.leaveTypeId)
                .eq('company_id', companyId)
                .single();

            if (leaveTypeError || !leaveType) {
                throw new BadRequestError('Leave type not found or does not belong to your company');
            }
        }

        // Check for duplicate name if name is being changed
        if (templateData.name && templateData.name !== existing.name) {
            const { data: duplicate } = await supabaseAdmin
                .from('leave_request_templates')
                .select('id')
                .eq('company_id', companyId)
                .eq('name', templateData.name)
                .neq('id', templateId)
                .single();

            if (duplicate) {
                throw new BadRequestError('A template with this name already exists');
            }
        }

        // Build update object (only include provided fields)
        const updateData: any = {};
        if (templateData.name !== undefined) updateData.name = templateData.name;
        if (templateData.nameTh !== undefined) updateData.name_th = templateData.nameTh;
        if (templateData.description !== undefined) updateData.description = templateData.description;
        if (templateData.leaveTypeId !== undefined) updateData.leave_type_id = templateData.leaveTypeId;
        if (templateData.defaultDaysCount !== undefined) updateData.default_days_count = templateData.defaultDaysCount;
        if (templateData.defaultReason !== undefined) updateData.default_reason = templateData.defaultReason;
        if (templateData.isActive !== undefined) updateData.is_active = templateData.isActive;
        if (templateData.sortOrder !== undefined) updateData.sort_order = templateData.sortOrder;

        // Update template
        const { data, error } = await supabaseAdmin
            .from('leave_request_templates')
            .update(updateData)
            .eq('id', templateId)
            .eq('company_id', companyId)
            .select(
                `
                *,
                leave_type:leave_types!leave_type_id(id, name, name_th, is_paid),
                creator:users!created_by(id, email)
            `
            )
            .single();

        if (error || !data) {
            console.error('Error updating template:', error);
            throw new AppError('Failed to update template', 'UPDATE_TEMPLATE_FAILED', 500);
        }

        return this.transformTemplate(data);
    }

    /**
     * Delete a template
     */
    async deleteTemplate(templateId: string, companyId: string): Promise<void> {
        const { error } = await supabaseAdmin
            .from('leave_request_templates')
            .delete()
            .eq('id', templateId)
            .eq('company_id', companyId);

        if (error) {
            console.error('Error deleting template:', error);
            throw new AppError('Failed to delete template', 'DELETE_TEMPLATE_FAILED', 500);
        }
    }

    /**
     * Apply a template to get pre-filled draft data
     * This returns suggested values but doesn't create a leave request
     */
    async applyTemplate(
        templateId: string,
        companyId: string,
        startDate?: string
    ): Promise<TemplateDraft> {
        // Get template
        const template = await this.getTemplateById(templateId, companyId);

        // Build draft object
        const draft: TemplateDraft = {
            leaveTypeId: template.leaveTypeId,
            startDate: startDate || null,
            endDate: null,
            totalDays: template.defaultDaysCount || null,
            reason: template.defaultReason || null,
        };

        // If we have both startDate and defaultDaysCount, calculate endDate
        if (startDate && template.defaultDaysCount) {
            const start = new Date(startDate);

            // Simple calculation: add days (not accounting for weekends/holidays)
            // For production, you might want to add business day calculation
            const daysToAdd = Math.ceil(template.defaultDaysCount) - 1; // -1 because start date counts as day 1
            const end = new Date(start);
            end.setDate(end.getDate() + daysToAdd);

            draft.endDate = end.toISOString().split('T')[0];
        }

        return draft;
    }

    /**
     * Transform database row to API response format
     */
    private transformTemplate(row: LeaveRequestTemplateWithDetails): LeaveRequestTemplate {
        return {
            id: row.id,
            companyId: row.company_id,
            name: row.name,
            nameTh: row.name_th,
            description: row.description,
            leaveTypeId: row.leave_type_id,
            defaultDaysCount: row.default_days_count ? Number(row.default_days_count) : null,
            defaultReason: row.default_reason,
            isActive: row.is_active,
            sortOrder: row.sort_order,
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            leaveType: row.leave_type
                ? {
                    id: row.leave_type.id,
                    name: row.leave_type.name,
                    nameTh: row.leave_type.name_th,
                    isPaid: row.leave_type.is_paid,
                }
                : undefined,
            creator: row.creator
                ? {
                    id: row.creator.id,
                    email: row.creator.email,
                }
                : undefined,
        };
    }
}

// Export singleton instance
export const templateService = new TemplateService();

import { supabaseAdmin } from '../../config/supabase.js';
import {
    NotFoundError,
} from '../../utils/errors.js';
import logger from '../../utils/logger.js';

export class LinkRequestsService {
    /**
     * List pending link requests for a company
     */
    async listRequests(companyId: string) {
        const { data, error } = await supabaseAdmin
            .from('line_link_requests')
            .select(`
                *,
                employees (
                    id,
                    full_name,
                    employee_code,
                    phone
                )
            `)
            .eq('company_id', companyId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            // Gracefully handle missing table
            logger.warn('Failed to list link requests (table might be missing), returning empty list', error);
            return [];
        }

        return data;
    }

    /**
     * Approve a link request
     */
    async approveRequest(requestId: string, companyId: string, reviewedBy: string) {
        // 1. Get request
        const { data: request, error: requestError } = await supabaseAdmin
            .from('line_link_requests')
            .select('*')
            .eq('id', requestId)
            .eq('company_id', companyId)
            .eq('status', 'pending')
            .single();

        if (requestError || !request) {
            throw new NotFoundError('Link request not found or already processed');
        }

        const { employee_id, line_user_id, line_display_name, line_picture_url } = request;

        // 2. Link User
        // Check if employee has a user account
        const { data: employee } = await supabaseAdmin
            .from('employees')
            .select('user_id')
            .eq('id', employee_id)
            .single();

        if (!employee) {
            throw new NotFoundError('Employee not found');
        }

        if (employee.user_id) {
            // Update existing user
            const { error: updateError } = await supabaseAdmin
                .from('users')
                .update({
                    line_user_id,
                    line_display_name,
                    line_picture_url,
                    line_linked_at: new Date().toISOString(),
                })
                .eq('id', employee.user_id);

            if (updateError) {
                logger.error('Failed to link user', updateError);
                throw new Error('Failed to link user');
            }
        } else {
            // Create new user
            // Get employee details for email generation
            // We assume guard role
            const { data: newUser, error: createError } = await supabaseAdmin
                .from('users')
                .insert({
                    company_id: companyId,
                    employee_id,
                    email: `employee_${employee_id}@guard.local`,
                    role: 'guard',
                    line_user_id,
                    line_display_name,
                    line_picture_url,
                    line_linked_at: new Date().toISOString(),
                    is_active: true,
                    language: 'th',
                })
                .select()
                .single();

            if (createError || !newUser) {
                logger.error('Failed to create user', createError);
                throw new Error('Failed to create user');
            }

            // Update employee
            await supabaseAdmin
                .from('employees')
                .update({ user_id: newUser.id })
                .eq('id', employee_id);
        }

        // 3. Update Request Status
        await supabaseAdmin
            .from('line_link_requests')
            .update({
                status: 'approved',
                reviewed_by: reviewedBy,
                reviewed_at: new Date().toISOString(),
            })
            .eq('id', requestId);

        logger.info('Link request approved', { requestId, reviewedBy });
    }

    /**
     * Reject a link request
     */
    async rejectRequest(requestId: string, companyId: string, reviewedBy: string, notes?: string) {
        const { error } = await supabaseAdmin
            .from('line_link_requests')
            .update({
                status: 'rejected',
                reviewed_by: reviewedBy,
                reviewed_at: new Date().toISOString(),
                review_notes: notes,
            })
            .eq('id', requestId)
            .eq('company_id', companyId)
            .eq('status', 'pending');

        if (error) {
            logger.error('Failed to reject link request', error);
            throw new Error('Failed to reject link request');
        }

        logger.info('Link request rejected', { requestId, reviewedBy });
    }
}

export const linkRequestsService = new LinkRequestsService();

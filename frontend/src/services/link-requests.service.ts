import api from './api';
import type { ApiResponse } from './api';

export interface LinkRequest {
    id: string;
    line_user_id: string;
    line_display_name: string | null;
    line_picture_url: string | null;
    employee_id: string;
    company_id: string;
    entered_phone: string;
    entered_employee_code: string;
    phone_matched: boolean;
    code_matched: boolean;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    employees?: {
        id: string;
        full_name: string;
        employee_code: string;
        phone: string;
    };
}

export const linkRequestsService = {
    /**
     * List pending link requests
     */
    async listPending(): Promise<LinkRequest[]> {
        const response = await api.get<ApiResponse<LinkRequest[]>>('/link-requests');
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error?.message || 'Failed to fetch link requests');
    },

    /**
     * Approve a link request
     */
    async approve(id: string): Promise<void> {
        const response = await api.post<ApiResponse<void>>(`/link-requests/${id}/approve`);
        if (!response.data.success) {
            throw new Error(response.data.error?.message || 'Failed to approve request');
        }
    },

    /**
     * Reject a link request
     */
    async reject(id: string, notes?: string): Promise<void> {
        const response = await api.post<ApiResponse<void>>(`/link-requests/${id}/reject`, { notes });
        if (!response.data.success) {
            throw new Error(response.data.error?.message || 'Failed to reject request');
        }
    }
};

export default linkRequestsService;

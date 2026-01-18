import api from './api';
import type { CompanySettings, UpdateCompanySettingsRequest } from '../types/company.types';

// Response types
interface ApiResponse<T> {
    success: boolean;
    message: string;
    message_th?: string;
    data: T;
}

export const getSettings = async (companyId: string): Promise<CompanySettings> => {
    const response = await api.get<ApiResponse<CompanySettings>>(`/companies/${companyId}/settings`);
    return response.data.data;
};

export const updateSettings = async (companyId: string, data: UpdateCompanySettingsRequest): Promise<CompanySettings> => {
    const response = await api.put<ApiResponse<CompanySettings>>(`/companies/${companyId}/settings`, data);
    return response.data.data;
};

const companyService = {
    getSettings,
    updateSettings,
};

export default companyService;

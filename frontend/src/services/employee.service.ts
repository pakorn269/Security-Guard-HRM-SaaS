import { apiGet, apiPost, apiPut, apiDelete } from './api';
import type {
    Employee,
    Certification,
    SendLineMessageData,
    BulkLineMessageData,
    BulkLineMessageResponse,
} from '../types/employee.types';

const EMPLOYEES_BASE = '/employees';

export interface EmployeeWithUser extends Employee {
    user?: {
        id: string;
        email: string;
        role: string;
        isActive: boolean;
        hasPin: boolean;
        pinSetAt?: string | null;
        isPinLocked: boolean;
        pinLockedUntil?: string | null;
        failedPinAttempts: number;
        // LINE integration fields
        lineUserId?: string | null;
        lineDisplayName?: string | null;
        linePictureUrl?: string | null;
        lineLinkedAt?: string | null;
        isLineLinked: boolean;
    } | null;
}

export interface CreateEmployeeData {
    employeeCode: string;
    fullName: string;
    fullNameTh?: string;
    phone?: string;
    email?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    hireDate: string;
    notes?: string;
    profileImageUrl?: string;
    createUserAccount?: boolean;
    userRole?: 'manager' | 'guard';
    userPassword?: string;
}

export interface CreateUserAccountData {
    email: string;
    password: string;
    role: 'manager' | 'guard';
}

export interface UpdateEmployeeData {
    employeeCode?: string;
    fullName?: string;
    fullNameTh?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    hireDate?: string;
    status?: 'active' | 'on_leave' | 'terminated';
    notes?: string | null;
    profileImageUrl?: string | null;
}

export interface ListEmployeesParams {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: 'active' | 'on_leave' | 'terminated';
    hasUser?: boolean;
}

export interface ListEmployeesResponse {
    success: boolean;
    data: EmployeeWithUser[];
    meta?: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

export interface CreateCertificationData {
    type: string;
    typeTh?: string;
    licenseNumber?: string;
    issueDate: string;
    expiryDate?: string;
    documentUrl?: string;
    notes?: string;
}

export interface UpdateCertificationData {
    type?: string;
    typeTh?: string | null;
    licenseNumber?: string | null;
    issueDate?: string;
    expiryDate?: string | null;
    documentUrl?: string | null;
    notes?: string | null;
}

export const employeeService = {
    /**
     * List employees with pagination and filtering
     */
    async list(params?: ListEmployeesParams): Promise<ListEmployeesResponse> {
        const queryParams = params ? { ...params } as Record<string, unknown> : undefined;
        const response = await apiGet<EmployeeWithUser[]>(EMPLOYEES_BASE, queryParams);
        return response as unknown as ListEmployeesResponse;
    },

    /**
     * Get employee by ID
     */
    async getById(id: string): Promise<EmployeeWithUser> {
        const response = await apiGet<EmployeeWithUser>(`${EMPLOYEES_BASE}/${id}`);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error('Failed to get employee');
    },

    /**
     * Create employee
     */
    async create(data: CreateEmployeeData): Promise<Employee> {
        const response = await apiPost<Employee>(EMPLOYEES_BASE, data);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error('Failed to create employee');
    },

    /**
     * Update employee
     */
    async update(id: string, data: UpdateEmployeeData): Promise<Employee> {
        const response = await apiPut<Employee>(`${EMPLOYEES_BASE}/${id}`, data);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error('Failed to update employee');
    },

    /**
     * Terminate employee
     */
    async terminate(id: string, _terminationDate: string, _notes?: string): Promise<Employee> {
        const response = await apiDelete<Employee>(`${EMPLOYEES_BASE}/${id}`);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error('Failed to terminate employee');
    },

    /**
     * Reactivate employee
     */
    async reactivate(id: string): Promise<Employee> {
        const response = await apiPost<Employee>(`${EMPLOYEES_BASE}/${id}/reactivate`);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error('Failed to reactivate employee');
    },

    /**
     * Create user account for employee
     */
    async createUserAccount(employeeId: string, data: CreateUserAccountData): Promise<Employee> {
        const response = await apiPost<Employee>(`${EMPLOYEES_BASE}/${employeeId}/create-user`, data);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error('Failed to create user account');
    },

    /**
     * Link employee to user
     */
    async linkToUser(employeeId: string, userId: string): Promise<Employee> {
        const response = await apiPost<Employee>(`${EMPLOYEES_BASE}/${employeeId}/link-user`, {
            userId,
        });
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error('Failed to link employee to user');
    },

    /**
     * Reset employee PIN
     */
    async resetPin(employeeId: string): Promise<void> {
        await apiPost(`${EMPLOYEES_BASE}/${employeeId}/reset-pin`, {});
    },

    // === Certification methods ===

    /**
     * Get certifications for employee
     */
    async getCertifications(employeeId: string): Promise<Certification[]> {
        const response = await apiGet<Certification[]>(
            `${EMPLOYEES_BASE}/${employeeId}/certifications`
        );
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error('Failed to get certifications');
    },

    /**
     * Create certification
     */
    async createCertification(
        employeeId: string,
        data: CreateCertificationData
    ): Promise<Certification> {
        const response = await apiPost<Certification>(
            `${EMPLOYEES_BASE}/${employeeId}/certifications`,
            data
        );
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error('Failed to create certification');
    },

    /**
     * Update certification
     */
    async updateCertification(
        employeeId: string,
        certificationId: string,
        data: UpdateCertificationData
    ): Promise<Certification> {
        const response = await apiPut<Certification>(
            `${EMPLOYEES_BASE}/${employeeId}/certifications/${certificationId}`,
            data
        );
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error('Failed to update certification');
    },

    /**
     * Delete certification
     */
    async deleteCertification(employeeId: string, certificationId: string): Promise<void> {
        await apiDelete(`${EMPLOYEES_BASE}/${employeeId}/certifications/${certificationId}`);
    },

    /**
     * Get expiring certifications
     */
    async getExpiringCertifications(days?: number): Promise<Certification[]> {
        const response = await apiGet<Certification[]>(
            `${EMPLOYEES_BASE}/certifications/expiring`,
            { days }
        );
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error('Failed to get expiring certifications');
    },

    // === LINE Messaging Methods ===

    /**
     * Send LINE message to a single employee
     */
    async sendLineMessage(
        employeeId: string,
        data: SendLineMessageData
    ): Promise<{ success: boolean; error?: string }> {
        const response = await apiPost<{ success: boolean; error?: string }>(
            `${EMPLOYEES_BASE}/${employeeId}/line-message`,
            data
        );
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error('Failed to send LINE message');
    },

    /**
     * Send LINE message to multiple employees (bulk)
     */
    async sendBulkLineMessage(data: BulkLineMessageData): Promise<BulkLineMessageResponse> {
        const response = await apiPost<BulkLineMessageResponse>(
            `${EMPLOYEES_BASE}/line-message/bulk`,
            data
        );
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error('Failed to send bulk LINE message');
    },

    /**
     * Get employees with LINE linked
     */
    async getLineLinkedEmployees(): Promise<EmployeeWithUser[]> {
        const response = await apiGet<EmployeeWithUser[]>(`${EMPLOYEES_BASE}/line-linked`);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error('Failed to get LINE-linked employees');
    },
};

export default employeeService;

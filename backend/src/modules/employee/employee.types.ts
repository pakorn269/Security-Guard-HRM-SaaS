// Employee module types

export type EmploymentStatus = 'active' | 'on_leave' | 'terminated' | 'suspended';

// Database row type
export interface EmployeeRow {
    id: string;
    company_id: string;
    user_id: string | null;
    employee_code: string;
    full_name: string;
    full_name_th: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    hire_date: string;
    termination_date: string | null;
    status: EmploymentStatus;
    profile_image_url: string | null;
    notes: string | null;
    license_number?: string | null;
    license_issued_at?: string | null;
    license_expires_at?: string | null;
    created_at: string;
    updated_at: string;
}

// API response type
export interface Employee {
    id: string;
    companyId: string;
    userId: string | null;
    employeeCode: string;
    fullName: string;
    fullNameTh: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    hireDate: string;
    terminationDate: string | null;
    status: EmploymentStatus;
    profileImageUrl: string | null;
    notes: string | null;
    licenseNumber?: string | null;
    licenseIssuedAt?: string | null;
    licenseExpiresAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

// Extended employee with user info
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

// LINE messaging types
export interface SendLineMessageRequest {
    message: string;
    messageTh?: string;
}

export interface BulkLineMessageRequest {
    employeeIds: string[];
    message: string;
    messageTh?: string;
}

export interface LineMessageResult {
    employeeId: string;
    employeeName: string;
    success: boolean;
    error?: string;
}

// Create employee request
export interface CreateEmployeeRequest {
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
    licenseNumber?: string;
    licenseIssuedAt?: string;
    licenseExpiresAt?: string;
    // Optional: create user account with employee
    createUserAccount?: boolean;
    userRole?: 'manager' | 'guard';
    userPassword?: string;
}

// Update employee request
export interface UpdateEmployeeRequest {
    employeeCode?: string;
    fullName?: string;
    fullNameTh?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    hireDate?: string;
    status?: EmploymentStatus;
    notes?: string | null;
    profileImageUrl?: string | null;
    licenseNumber?: string | null;
    licenseIssuedAt?: string | null;
    licenseExpiresAt?: string | null;
}

// List employees query
export interface ListEmployeesQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: EmploymentStatus;
    hasUser?: boolean;
}

// Terminate employee request
export interface TerminateEmployeeRequest {
    terminationDate: string;
    notes?: string;
}

// Certification types
export type CertificationStatus = 'valid' | 'expiring_soon' | 'expired';

export interface CertificationRow {
    id: string;
    company_id: string;
    employee_id: string;
    type: string;
    type_th: string | null;
    license_number: string | null;
    issue_date: string;
    expiry_date: string | null;
    document_url: string | null;
    status: CertificationStatus;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface Certification {
    id: string;
    companyId: string;
    employeeId: string;
    type: string;
    typeTh: string | null;
    licenseNumber: string | null;
    issueDate: string;
    expiryDate: string | null;
    documentUrl: string | null;
    status: CertificationStatus;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCertificationRequest {
    type: string;
    typeTh?: string;
    licenseNumber?: string;
    issueDate: string;
    expiryDate?: string;
    documentUrl?: string;
    notes?: string;
}

export interface UpdateCertificationRequest {
    type?: string;
    typeTh?: string | null;
    licenseNumber?: string | null;
    issueDate?: string;
    expiryDate?: string | null;
    documentUrl?: string | null;
    notes?: string | null;
}

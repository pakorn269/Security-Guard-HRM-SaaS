export type EmploymentStatus = 'active' | 'on_leave' | 'terminated';

export interface Employee {
    id: string;
    companyId: string;
    userId?: string;
    employeeCode: string;
    fullName: string;
    fullNameTh?: string;
    phone?: string;
    email?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    hireDate: string;
    terminationDate?: string;
    status: EmploymentStatus;
    profileImageUrl?: string;
    notes?: string;
    position?: string;
    createdAt: string;
    updatedAt: string;
}

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
export interface SendLineMessageData {
    message: string;
    messageTh?: string;
}

export interface BulkLineMessageData {
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

export interface BulkLineMessageResponse {
    results: LineMessageResult[];
    successCount: number;
    failureCount: number;
}

export type CertificationStatus = 'valid' | 'expiring_soon' | 'expired';

export interface Certification {
    id: string;
    companyId: string;
    employeeId: string;
    type: string;
    typeTh?: string;
    licenseNumber?: string;
    issueDate: string;
    expiryDate?: string;
    documentUrl?: string;
    status: CertificationStatus;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

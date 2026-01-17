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
    createdAt: string;
    updatedAt: string;
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

// User module types

export type UserRole = 'super_admin' | 'company_admin' | 'manager' | 'guard';

// Database row type
export interface UserRow {
    id: string;
    company_id: string;
    employee_id: string | null;
    email: string;
    password_hash: string | null;
    role: UserRole;
    line_user_id: string | null;
    line_display_name: string | null;
    line_picture_url: string | null;
    line_linked_at: string | null;
    is_active: boolean;
    language: 'th' | 'en';
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
}

// API response type
export interface User {
    id: string;
    companyId: string;
    employeeId: string | null;
    email: string;
    role: UserRole;
    lineUserId: string | null;
    lineDisplayName: string | null;
    linePictureUrl: string | null;
    lineLinkedAt: string | null;
    isActive: boolean;
    language: 'th' | 'en';
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
}

// Create user request
export interface CreateUserRequest {
    email: string;
    password?: string;
    role: UserRole;
    employeeId?: string;
    language?: 'th' | 'en';
}

// Update user request
export interface UpdateUserRequest {
    email?: string;
    role?: UserRole;
    employeeId?: string | null;
    isActive?: boolean;
    language?: 'th' | 'en';
}

// Link LINE request
export interface LinkLineRequest {
    lineUserId: string;
    lineDisplayName?: string;
    linePictureUrl?: string;
}

// List users query
export interface ListUsersQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    role?: UserRole;
    isActive?: boolean;
}

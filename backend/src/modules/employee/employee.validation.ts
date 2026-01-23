import { z } from 'zod';

// Create employee validation schema
export const createEmployeeSchema = z.object({
    employeeCode: z.string().min(1, 'Employee code is required').max(50),
    fullName: z.string().min(1, 'Full name is required').max(255),
    fullNameTh: z.string().max(255).optional(),
    phone: z.string().max(20).optional(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    address: z.string().optional(),
    emergencyContactName: z.string().max(255).optional(),
    emergencyContactPhone: z.string().max(20).optional(),
    hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    notes: z.string().optional(),
    profileImageUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
    position: z.string().max(255).optional(),
    // Optional: create user account with employee
    createUserAccount: z.boolean().optional().default(false),
    userRole: z.enum(['manager', 'guard']).optional(),
    userPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
}).refine((data) => {
    // If creating user account, email and password are required
    if (data.createUserAccount) {
        return !!data.email && !!data.userPassword;
    }
    return true;
}, {
    message: 'Email and password are required when creating user account',
    path: ['email'],
});

// Update employee validation schema
export const updateEmployeeSchema = z.object({
    employeeCode: z.string().min(1).max(50).optional(),
    fullName: z.string().min(1).max(255).optional(),
    fullNameTh: z.string().max(255).optional().nullable(),
    phone: z.string().max(20).optional().nullable(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')).nullable(),
    address: z.string().optional().nullable(),
    emergencyContactName: z.string().max(255).optional().nullable(),
    emergencyContactPhone: z.string().max(20).optional().nullable(),
    hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
    position: z.string().max(255).optional().nullable(),
    status: z.enum(['active', 'on_leave', 'terminated']).optional(),
    notes: z.string().optional().nullable(),
    profileImageUrl: z.string().url('Invalid URL').optional().or(z.literal('')).nullable(),
});

// Terminate employee validation schema
export const terminateEmployeeSchema = z.object({
    terminationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    notes: z.string().optional(),
});

// List employees query validation
export const listEmployeesQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
    search: z.string().optional(),
    status: z.preprocess(
        (val) => (val === '' ? undefined : val),
        z.enum(['active', 'on_leave', 'terminated']).optional()
    ),
    // Fix: Only transform when a value is explicitly provided, otherwise keep undefined
    hasUser: z.preprocess(
        (val) => (val === '' || val === undefined ? undefined : val),
        z.enum(['true', 'false']).optional().transform((val) => val === undefined ? undefined : val === 'true')
    ),
});

// Create certification validation schema
export const createCertificationSchema = z.object({
    type: z.string().min(1, 'Certification type is required').max(100),
    typeTh: z.string().max(100).optional(),
    licenseNumber: z.string().max(100).optional(),
    issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
    documentUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
    notes: z.string().optional(),
});

// Update certification validation schema
export const updateCertificationSchema = z.object({
    type: z.string().min(1).max(100).optional(),
    typeTh: z.string().max(100).optional().nullable(),
    licenseNumber: z.string().max(100).optional().nullable(),
    issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
    expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional().nullable(),
    documentUrl: z.string().url('Invalid URL').optional().or(z.literal('')).nullable(),
    notes: z.string().optional().nullable(),
});

// Send LINE message validation schema
export const sendLineMessageSchema = z.object({
    message: z.string().min(1, 'Message is required').max(5000, 'Message must be less than 5000 characters'),
    messageTh: z.string().max(5000).optional(),
});

// Bulk LINE message validation schema
export const bulkLineMessageSchema = z.object({
    employeeIds: z.array(z.string().uuid('Invalid employee ID')).min(1, 'At least one employee is required'),
    message: z.string().min(1, 'Message is required').max(5000, 'Message must be less than 5000 characters'),
    messageTh: z.string().max(5000).optional(),
});

// Create user account validation schema
export const createUserAccountSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['manager', 'guard']),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type TerminateEmployeeInput = z.infer<typeof terminateEmployeeSchema>;
export type ListEmployeesQueryInput = z.infer<typeof listEmployeesQuerySchema>;
export type CreateCertificationInput = z.infer<typeof createCertificationSchema>;
export type UpdateCertificationInput = z.infer<typeof updateCertificationSchema>;
export type SendLineMessageInput = z.infer<typeof sendLineMessageSchema>;
export type BulkLineMessageInput = z.infer<typeof bulkLineMessageSchema>;
export type CreateUserAccountInput = z.infer<typeof createUserAccountSchema>;

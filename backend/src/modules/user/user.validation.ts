import { z } from 'zod';

// Create user validation schema
export const createUserSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    role: z.enum(['super_admin', 'company_admin', 'manager', 'guard'], {
        message: 'Invalid role',
    }),
    employeeId: z.string().uuid('Invalid employee ID').optional(),
    language: z.enum(['th', 'en']).optional().default('th'),
});

// Update user validation schema
export const updateUserSchema = z.object({
    email: z.string().email('Invalid email address').optional(),
    role: z.enum(['super_admin', 'company_admin', 'manager', 'guard']).optional(),
    employeeId: z.string().uuid('Invalid employee ID').nullable().optional(),
    isActive: z.boolean().optional(),
    language: z.enum(['th', 'en']).optional(),
});

// Link LINE validation schema
export const linkLineSchema = z.object({
    lineUserId: z.string().min(1, 'LINE user ID is required'),
    lineDisplayName: z.string().optional(),
    linePictureUrl: z.string().url('Invalid picture URL').optional(),
});

// Change password validation schema
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// List users query validation
export const listUsersQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
    search: z.string().optional(),
    role: z.enum(['super_admin', 'company_admin', 'manager', 'guard']).optional(),
    isActive: z.coerce.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LinkLineInput = z.infer<typeof linkLineSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ListUsersQueryInput = z.infer<typeof listUsersQuerySchema>;

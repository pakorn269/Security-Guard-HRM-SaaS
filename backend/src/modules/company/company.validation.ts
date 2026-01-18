import { z } from 'zod';

// Create company validation schema
export const createCompanySchema = z.object({
    name: z
        .string()
        .min(2, 'Company name must be at least 2 characters')
        .max(255),
    slug: z
        .string()
        .min(2)
        .max(100)
        .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens')
        .optional(),
    address: z.string().max(500).optional(),
    phone: z.string().max(20).optional(),
    email: z.string().email().max(255).optional(),
});

// Update company validation schema
export const updateCompanySchema = z.object({
    name: z.string().min(2).max(255).optional(),
    address: z.string().max(500).optional().nullable(),
    phone: z.string().max(20).optional().nullable(),
    email: z.string().email().max(255).optional().nullable(),
    logoUrl: z.string().url().optional().nullable(),
});

// Update company settings validation schema
export const updateCompanySettingsSchema = z.object({
    timezone: z.string().optional(),
    lateThresholdMinutes: z.number().min(0).max(120).optional(),
    earlyLeaveThresholdMinutes: z.number().min(0).max(120).optional(),
    clockInBeforeShiftMinutes: z.number().min(0).max(120).optional(),
    leaveResetMonth: z.number().min(1).max(12).optional(),
    defaultLanguage: z.enum(['th', 'en']).optional(),
});

// Type exports
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type UpdateCompanySettingsInput = z.infer<typeof updateCompanySettingsSchema>;

import { z } from 'zod';

// Registration validation schema
export const registerSchema = z.object({
    email: z
        .string()
        .email('Invalid email format / รูปแบบอีเมลไม่ถูกต้อง')
        .max(255),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters / รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
        .max(100)
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Password must contain uppercase, lowercase and number / รหัสผ่านต้องมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข'
        ),
    companyName: z
        .string()
        .min(2, 'Company name must be at least 2 characters / ชื่อบริษัทต้องมีอย่างน้อย 2 ตัวอักษร')
        .max(255),
    companySlug: z
        .string()
        .min(2)
        .max(100)
        .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens')
        .optional(),
    fullName: z
        .string()
        .min(2, 'Name must be at least 2 characters / ชื่อต้องมีอย่างน้อย 2 ตัวอักษร')
        .max(255),
    phone: z.string().max(20).optional(),
});

// Login validation schema
export const loginSchema = z.object({
    email: z.string().email('Invalid email format / รูปแบบอีเมลไม่ถูกต้อง'),
    password: z.string().min(1, 'Password is required / กรุณากรอกรหัสผ่าน'),
});

// LINE Login validation schema
export const lineLoginSchema = z.object({
    idToken: z.string().min(1, 'ID token is required'),
    liffId: z.string().min(1, 'LIFF ID is required'),
});

// Refresh token validation schema
export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Link LINE account validation schema
export const linkLineSchema = z.object({
    idToken: z.string().min(1, 'ID token is required'),
    liffId: z.string().min(1, 'LIFF ID is required'),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type LineLoginInput = z.infer<typeof lineLoginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LinkLineInput = z.infer<typeof linkLineSchema>;

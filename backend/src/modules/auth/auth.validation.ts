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

// Phone + PIN Login validation schema
export const phoneLoginSchema = z.object({
    companySlug: z.string().min(1, 'Company is required'),
    phone: z.string().min(1, 'Phone is required'),
    pin: z.string().length(6, 'PIN must be 6 digits'),
    turnstileToken: z.string().optional(),
});

// Set PIN validation schema
export const setPinSchema = z.object({
    currentPin: z.string().length(6, 'Current PIN must be 6 digits').optional(),
    newPin: z
        .string()
        .length(6, 'PIN must be 6 digits')
        .regex(/^[0-9]+$/, 'PIN must contain only digits')
        .refine((pin) => {
            // Check for repeated digits (e.g. 111111)
            if (/^(\d)\1+$/.test(pin)) return false;

            // Check for sequential digits (e.g. 123456, 654321)
            const sequential = '01234567890123456789';
            const reverseSequential = '98765432109876543210';
            if (sequential.includes(pin) || reverseSequential.includes(pin)) return false;

            return true;
        }, 'PIN is too simple (avoid repeated or sequential digits)'),
    resetToken: z.string().optional(),
}).refine((data) => {
    // Require either currentPin or resetToken if not setting for first time
    // But how do we know if it's first time? 
    // Actually, backend will handle checking if currentPin is required based on user state (has password_hash or not)
    // Here we just validate formats
    return true;
});

// Forgot PIN validation schema
export const forgotPinSchema = z.object({
    companySlug: z.string().min(1, 'Company is required'),
    phone: z.string().min(1, 'Phone is required'),
    turnstileToken: z.string().optional(),
});

// Verify reset code validation schema
export const verifyResetCodeSchema = z.object({
    companySlug: z.string().min(1, 'Company is required'),
    phone: z.string().min(1, 'Phone is required'),
    code: z.string().length(6, 'Code must be 6 digits'),
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

// ============================================================
// LIFF Account Linking Validation Schemas
// ============================================================

// LINE verify validation schema (same as linkLine)
export const lineVerifySchema = z.object({
    idToken: z.string().min(1, 'ID token is required / กรุณาระบุ ID token'),
    liffId: z.string().min(1, 'LIFF ID is required / กรุณาระบุ LIFF ID'),
});

// Link employee validation schema (for guards)
export const linkEmployeeSchema = z.object({
    idToken: z.string().min(1, 'ID token is required / กรุณาระบุ ID token'),
    liffId: z.string().min(1, 'LIFF ID is required / กรุณาระบุ LIFF ID'),
    employeeCode: z
        .string()
        .min(1, 'Employee code is required / กรุณาระบุรหัสพนักงาน')
        .max(50),
    phone: z
        .string()
        .min(9, 'Phone number must be at least 9 digits / เบอร์โทรศัพท์ต้องมีอย่างน้อย 9 หลัก')
        .max(20)
        .regex(/^[0-9]+$/, 'Phone number must contain only digits / เบอร์โทรศัพท์ต้องเป็นตัวเลขเท่านั้น'),
    companySlug: z
        .string()
        .min(1, 'Company is required / กรุณาเลือกบริษัท')
        .max(100),
});

// Link credentials validation schema (for managers/admins)
export const linkCredentialsSchema = z.object({
    idToken: z.string().min(1, 'ID token is required / กรุณาระบุ ID token'),
    liffId: z.string().min(1, 'LIFF ID is required / กรุณาระบุ LIFF ID'),
    email: z.string().email('Invalid email format / รูปแบบอีเมลไม่ถูกต้อง'),
    password: z.string().min(1, 'Password is required / กรุณากรอกรหัสผ่าน'),
});

// ============================================================
// LIFF Email Login (Without LINE)
// ============================================================

// Employee login validation schema (for guards without LINE)
export const liffEmployeeLoginSchema = z.object({
    employeeCode: z
        .string()
        .min(1, 'Employee code is required / กรุณาระบุรหัสพนักงาน')
        .max(50),
    phone: z
        .string()
        .min(9, 'Phone number must be at least 9 digits / เบอร์โทรศัพท์ต้องมีอย่างน้อย 9 หลัก')
        .max(20)
        .regex(/^[0-9]+$/, 'Phone number must contain only digits / เบอร์โทรศัพท์ต้องเป็นตัวเลขเท่านั้น'),
    password: z.string().min(1, 'Password is required / กรุณากรอกรหัสผ่าน'),
    companySlug: z
        .string()
        .min(1, 'Company is required / กรุณาเลือกบริษัท')
        .max(100),
});

// Change password validation schema
export const changePasswordSchema = z.object({
    oldPassword: z.string().min(1, 'Old password is required / กรุณากรอกรหัสผ่านเดิม'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters / รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
        .max(100)
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Password must contain uppercase, lowercase and number / รหัสผ่านต้องมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข'
        ),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PhoneLoginInput = z.infer<typeof phoneLoginSchema>;
export type SetPinInput = z.infer<typeof setPinSchema>;
export type ForgotPinInput = z.infer<typeof forgotPinSchema>;
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>;
export type LineLoginInput = z.infer<typeof lineLoginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LinkLineInput = z.infer<typeof linkLineSchema>;
export type LineVerifyInput = z.infer<typeof lineVerifySchema>;
export type LinkEmployeeInput = z.infer<typeof linkEmployeeSchema>;
export type LinkCredentialsInput = z.infer<typeof linkCredentialsSchema>;
export type LiffEmployeeLoginInput = z.infer<typeof liffEmployeeLoginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ============================================================
// PIN Reset Request Validation (Hybrid Approach)
// ============================================================

// Request PIN reset validation schema (for guards)
export const requestPinResetSchema = z.object({
    companySlug: z.string().min(1, 'Company is required / กรุณาระบุบริษัท'),
    phone: z.string().min(9, 'Phone number must be at least 9 digits / เบอร์โทรศัพท์ต้องมีอย่างน้อย 9 หลัก'),
});

export type RequestPinResetInput = z.infer<typeof requestPinResetSchema>;


/**
 * Email Configuration
 * Manages email service settings for Resend
 */

export const emailConfig = {
  provider: 'resend',

  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    fromEmail: process.env.EMAIL_FROM || 'noreply@securityguard-hrm.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Security Guard HRM',
  },

  // Email template settings
  templates: {
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:5173',
    logoUrl: process.env.EMAIL_LOGO_URL || '',
  },

  // Company branding
  branding: {
    primaryColor: '#3b82f6', // blue-500
    companyName: 'Security Guard HRM',
  },

  // Rate limiting and retry
  retry: {
    maxAttempts: 3,
    delayMs: 1000,
  },
};

export default emailConfig;

// LIFF Account Linking - Email Credentials Page
// Managers/Admins link their LINE account using email + password

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useLiffAuth } from '../../context/LiffAuthContext';
import { useAuth } from '../../context/AuthContext';

export default function LiffLinkCredentialsPage() {
    const navigate = useNavigate();
    const { linkWithCredentials, error, clearError, isLoading } = useLiffAuth();
    const { checkAuth } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!formData.email.trim()) {
            errors.email = 'กรุณาระบุอีเมล';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
        }

        if (!formData.password) {
            errors.password = 'กรุณาระบุรหัสผ่าน';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();

        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            const success = await linkWithCredentials(
                formData.email.trim().toLowerCase(),
                formData.password
            );

            if (success) {
                setSuccess(true);
                // Sync AuthContext with newly stored tokens
                await checkAuth();
                // Redirect to clock page after success
                setTimeout(() => {
                    navigate('/liff/clock');
                }, 1500);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear field error on change
        if (formErrors[field]) {
            setFormErrors(prev => ({ ...prev, [field]: '' }));
        }
        // Clear API error
        if (error) {
            clearError();
        }
    };

    // Success state
    if (success) {
        return (
            <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4 safe-area-inset">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center animate-bounce-in">
                        <CheckCircle size={40} className="text-success-500" />
                    </div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                        เชื่อมต่อบัญชีสำเร็จ!
                    </h2>
                    <p className="text-neutral-500 dark:text-neutral-400">
                        Account linked successfully
                    </p>
                    <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-4">
                        กำลังเปลี่ยนหน้า...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col safe-area-inset">
            {/* Header */}
            <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/liff/link')}
                        className="p-2 -ml-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors touch-target"
                    >
                        <ArrowLeft size={20} className="text-neutral-600 dark:text-neutral-400" />
                    </button>
                    <div>
                        <h1 className="font-semibold text-neutral-900 dark:text-white">
                            ยืนยันด้วยอีเมล
                        </h1>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            Verify with Email
                        </p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 p-4">
                <div className="space-y-4">
                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                            <span className="flex items-center gap-1.5">
                                <Mail size={14} />
                                อีเมล / Email
                            </span>
                        </label>
                        <input
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            placeholder="manager@company.com"
                            className={`
                                w-full h-12 px-4 
                                bg-white dark:bg-neutral-900 
                                border rounded-lg
                                text-neutral-900 dark:text-white
                                placeholder:text-neutral-400
                                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                                ${formErrors.email
                                    ? 'border-error-500'
                                    : 'border-neutral-300 dark:border-neutral-700'
                                }
                            `}
                            disabled={isSubmitting || isLoading}
                        />
                        {formErrors.email && (
                            <p className="text-sm text-error-500 mt-1">{formErrors.email}</p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                            <span className="flex items-center gap-1.5">
                                <Lock size={14} />
                                รหัสผ่าน / Password
                            </span>
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                placeholder="••••••••"
                                className={`
                                    w-full h-12 px-4 pr-12
                                    bg-white dark:bg-neutral-900 
                                    border rounded-lg
                                    text-neutral-900 dark:text-white
                                    placeholder:text-neutral-400
                                    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                                    ${formErrors.password
                                        ? 'border-error-500'
                                        : 'border-neutral-300 dark:border-neutral-700'
                                    }
                                `}
                                disabled={isSubmitting || isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        {formErrors.password && (
                            <p className="text-sm text-error-500 mt-1">{formErrors.password}</p>
                        )}
                    </div>

                    {/* API Error */}
                    {error && (
                        <div className="bg-error-50 dark:bg-error-900/30 border border-error-200 dark:border-error-800 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={20} className="text-error-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-error-700 dark:text-error-300">
                                        {error}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <div className="mt-8">
                    <button
                        type="submit"
                        disabled={isSubmitting || isLoading}
                        className="
                            w-full h-12 
                            bg-primary-500 hover:bg-primary-600 active:bg-primary-700
                            disabled:bg-neutral-300 dark:disabled:bg-neutral-700
                            text-white font-medium
                            rounded-lg
                            flex items-center justify-center gap-2
                            transition-colors
                            touch-target
                        "
                    >
                        {isSubmitting || isLoading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                กำลังตรวจสอบ...
                            </>
                        ) : (
                            'ยืนยัน / Verify'
                        )}
                    </button>
                </div>

                {/* Help text */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                        ใช้อีเมลและรหัสผ่านเดียวกับการเข้าสู่ระบบเว็บ
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                        Use the same credentials as web login
                    </p>
                </div>
            </form>
        </div>
    );
}

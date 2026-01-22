// LIFF Email Login Page - For guards who don't use LINE
// Allows authentication via employee code + phone + password

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User,
    Phone,
    Lock,
    Building2,
    LogIn,
    Loader2,
    ArrowLeft,
    Eye,
    EyeOff,
    AlertCircle,
} from 'lucide-react';
import liffAuthService from '../../services/liff-auth.service';
import { setTokens } from '../../services/api';
import type { AuthUser } from '../../types/auth';

interface LiffEmailLoginPageProps {
    onLoginSuccess?: (user: AuthUser) => void;
}

export default function LiffEmailLoginPage({ onLoginSuccess }: LiffEmailLoginPageProps) {
    const navigate = useNavigate();

    // Form state
    const [companySlug, setCompanySlug] = useState('');
    const [employeeCode, setEmployeeCode] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get company slug from URL if accessing via company-specific URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const slugFromUrl = urlParams.get('company');
        if (slugFromUrl) {
            setCompanySlug(slugFromUrl);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!companySlug.trim()) {
            setError('กรุณาระบุรหัสบริษัท');
            return;
        }
        if (!employeeCode.trim()) {
            setError('กรุณาระบุรหัสพนักงาน');
            return;
        }
        if (!phone.trim()) {
            setError('กรุณาระบุเบอร์โทรศัพท์');
            return;
        }
        if (!password) {
            setError('กรุณาระบุรหัสผ่าน');
            return;
        }

        setIsLoading(true);

        try {
            const result = await liffAuthService.liffEmployeeLogin({
                employeeCode: employeeCode.trim(),
                phone: phone.replace(/\D/g, ''), // Remove non-digits
                password,
                companySlug: companySlug.trim().toLowerCase(),
            });

            // Store tokens
            setTokens(result.tokens.accessToken, result.tokens.refreshToken);

            // Callback or navigate
            if (onLoginSuccess) {
                onLoginSuccess(result.user);
            } else {
                // Navigate to clock page
                navigate('/liff/clock', { replace: true });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col safe-area-inset">
            {/* Header */}
            <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/liff/login-select')}
                        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors touch-target"
                    >
                        <ArrowLeft size={20} className="text-neutral-600 dark:text-neutral-300" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                            เข้าสู่ระบบด้วยอีเมล
                        </h1>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            Login with Email
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4">
                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg flex items-start gap-3">
                        <AlertCircle size={20} className="text-error-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm text-error-700 dark:text-error-300">{error}</p>
                        </div>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Company Slug */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                            รหัสบริษัท / Company Code
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Building2 size={18} className="text-neutral-400" />
                            </div>
                            <input
                                type="text"
                                value={companySlug}
                                onChange={(e) => setCompanySlug(e.target.value)}
                                placeholder="company-name"
                                className="
                                    block w-full h-12 pl-10 pr-3
                                    rounded-lg border border-neutral-300 dark:border-neutral-700
                                    bg-white dark:bg-neutral-800
                                    text-neutral-900 dark:text-neutral-100
                                    placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                                    focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                                    disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed
                                    transition-colors touch-target
                                "
                                disabled={isLoading}
                            />
                        </div>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                            รหัสบริษัทที่ได้รับจากฝ่ายบุคคล
                        </p>
                    </div>

                    {/* Employee Code */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                            รหัสพนักงาน / Employee Code
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User size={18} className="text-neutral-400" />
                            </div>
                            <input
                                type="text"
                                value={employeeCode}
                                onChange={(e) => setEmployeeCode(e.target.value)}
                                placeholder="EMP-001"
                                className="
                                    block w-full h-12 pl-10 pr-3
                                    rounded-lg border border-neutral-300 dark:border-neutral-700
                                    bg-white dark:bg-neutral-800
                                    text-neutral-900 dark:text-neutral-100
                                    placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                                    focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                                    disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed
                                    transition-colors touch-target
                                "
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                            เบอร์โทรศัพท์ / Phone Number
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Phone size={18} className="text-neutral-400" />
                            </div>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="0812345678"
                                className="
                                    block w-full h-12 pl-10 pr-3
                                    rounded-lg border border-neutral-300 dark:border-neutral-700
                                    bg-white dark:bg-neutral-800
                                    text-neutral-900 dark:text-neutral-100
                                    placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                                    focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                                    disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed
                                    transition-colors touch-target
                                "
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                            รหัสผ่าน / Password
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock size={18} className="text-neutral-400" />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="
                                    block w-full h-12 pl-10 pr-12
                                    rounded-lg border border-neutral-300 dark:border-neutral-700
                                    bg-white dark:bg-neutral-800
                                    text-neutral-900 dark:text-neutral-100
                                    placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                                    focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                                    disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed
                                    transition-colors touch-target
                                "
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="
                                    absolute inset-y-0 right-0 pr-3 flex items-center
                                    text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300
                                    transition-colors
                                "
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="
                            w-full h-12 mt-4
                            inline-flex items-center justify-center gap-2
                            rounded-lg
                            bg-primary-500 hover:bg-primary-600 active:bg-primary-700
                            text-white font-medium
                            focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-colors touch-target
                        "
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                กำลังเข้าสู่ระบบ...
                            </>
                        ) : (
                            <>
                                <LogIn size={20} />
                                เข้าสู่ระบบ
                            </>
                        )}
                    </button>
                </form>

                {/* Help text */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                        หากไม่ทราบรหัสผ่าน กรุณาติดต่อฝ่ายบุคคล
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                        If you forgot your password, please contact HR
                    </p>
                </div>
            </div>
        </div>
    );
}

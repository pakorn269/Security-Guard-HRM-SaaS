import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Shield,
    Mail,
    Lock,
    LogIn,
    Loader2,
    Globe,
    UserPlus,
    AlertCircle,
} from 'lucide-react';

export default function LoginPage() {
    const { i18n } = useTranslation();
    const navigate = useNavigate();
    const { login, isLoading, isAuthenticated, error, clearError } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Redirect if already authenticated
    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        clearError();

        if (!email || !password) {
            setLocalError(
                i18n.language === 'th'
                    ? 'กรุณากรอกอีเมลและรหัสผ่าน'
                    : 'Please enter email and password'
            );
            return;
        }

        const success = await login({ email, password });
        if (success) {
            navigate('/');
        }
    };

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'th' ? 'en' : 'th');
    };

    const displayError = localError || error;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-900 p-4">
            {/* Background pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-secondary-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Language toggle */}
                <div className="flex justify-end mb-4">
                    <button
                        onClick={toggleLanguage}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-sm border border-white/10"
                    >
                        <Globe className="w-4 h-4" />
                        {i18n.language === 'th' ? 'English' : 'ไทย'}
                    </button>
                </div>

                {/* Login card */}
                <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                    {/* Header with gradient */}
                    <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-8 py-8 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20">
                            <Shield className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">
                            Security Guard HRM
                        </h1>
                        <p className="text-white/80 mt-2 text-sm">
                            {i18n.language === 'th'
                                ? 'ระบบจัดการพนักงานรักษาความปลอดภัย'
                                : 'Security Guard Management System'}
                        </p>
                    </div>

                    {/* Form section */}
                    <div className="p-8">
                        {/* Error message */}
                        {displayError && (
                            <div className="mb-6 p-4 rounded-lg bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-error-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-error-600 dark:text-error-400">
                                    {displayError}
                                </p>
                            </div>
                        )}

                        {/* Login form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2"
                                >
                                    {i18n.language === 'th' ? 'อีเมล' : 'Email'}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="w-5 h-5 text-surface-400" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input-base pl-10"
                                        placeholder="admin@company.com"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2"
                                >
                                    {i18n.language === 'th' ? 'รหัสผ่าน' : 'Password'}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="w-5 h-5 text-surface-400" />
                                    </div>
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input-base pl-10 pr-10"
                                        placeholder="••••••••"
                                        required
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-surface-400 hover:text-surface-600"
                                    >
                                        {showPassword ? (
                                            <svg
                                                className="w-5 h-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                                                />
                                            </svg>
                                        ) : (
                                            <svg
                                                className="w-5 h-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full btn-primary py-3 text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        {i18n.language === 'th'
                                            ? 'กำลังเข้าสู่ระบบ...'
                                            : 'Logging in...'}
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-5 h-5" />
                                        {i18n.language === 'th' ? 'เข้าสู่ระบบ' : 'Login'}
                                    </>
                                )}
                            </button>
                        </form>

                        {/* LINE Login */}
                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-surface-200 dark:border-surface-700" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white dark:bg-surface-800 text-surface-500">
                                        {i18n.language === 'th' ? 'หรือ' : 'or'}
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                disabled={isLoading}
                                className="w-full mt-4 py-3 px-4 rounded-lg bg-[#00B900] text-white font-medium hover:bg-[#00A000] transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                <svg
                                    className="w-6 h-6"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                                </svg>
                                {i18n.language === 'th'
                                    ? 'เข้าสู่ระบบด้วย LINE'
                                    : 'Login with LINE'}
                            </button>
                        </div>

                        {/* Register link */}
                        <div className="mt-6 text-center">
                            <p className="text-surface-500 text-sm flex items-center justify-center gap-1">
                                {i18n.language === 'th'
                                    ? 'ยังไม่มีบัญชี?'
                                    : "Don't have an account?"}{' '}
                                <Link
                                    to="/register"
                                    className="text-primary-600 hover:text-primary-500 font-medium inline-flex items-center gap-1"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    {i18n.language === 'th'
                                        ? 'ลงทะเบียนบริษัท'
                                        : 'Register Company'}
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center mt-6 text-white/60 text-sm">
                    © 2025 Security Guard HRM. All rights reserved.
                </p>
            </div>
        </div>
    );
}

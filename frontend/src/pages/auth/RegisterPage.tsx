import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
    const { i18n } = useTranslation();
    const navigate = useNavigate();
    const { register, isLoading, isAuthenticated, error, clearError } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        companyName: '',
        fullName: '',
        phone: '',
    });
    const [localError, setLocalError] = useState<string | null>(null);

    // Redirect if already authenticated
    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setLocalError(null);
        clearError();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        clearError();

        // Validation
        if (!formData.email || !formData.password || !formData.companyName || !formData.fullName) {
            setLocalError(i18n.language === 'th'
                ? 'กรุณากรอกข้อมูลให้ครบถ้วน'
                : 'Please fill in all required fields');
            return;
        }

        if (formData.password.length < 8) {
            setLocalError(i18n.language === 'th'
                ? 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
                : 'Password must be at least 8 characters');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setLocalError(i18n.language === 'th'
                ? 'รหัสผ่านไม่ตรงกัน'
                : 'Passwords do not match');
            return;
        }

        // Password strength check
        const hasUpperCase = /[A-Z]/.test(formData.password);
        const hasLowerCase = /[a-z]/.test(formData.password);
        const hasNumber = /\d/.test(formData.password);
        if (!hasUpperCase || !hasLowerCase || !hasNumber) {
            setLocalError(i18n.language === 'th'
                ? 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข'
                : 'Password must contain uppercase, lowercase and number');
            return;
        }

        const success = await register({
            email: formData.email,
            password: formData.password,
            companyName: formData.companyName,
            fullName: formData.fullName,
            phone: formData.phone || undefined,
        });

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
            <div className="w-full max-w-lg">
                {/* Language toggle */}
                <div className="flex justify-end mb-4">
                    <button
                        onClick={toggleLanguage}
                        className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-sm"
                    >
                        {i18n.language === 'th' ? '🇺🇸 English' : '🇹🇭 ไทย'}
                    </button>
                </div>

                {/* Register card */}
                <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-2xl p-8 animate-fade-in">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg">
                            <span className="text-3xl">🏢</span>
                        </div>
                        <h1 className="text-2xl font-bold text-surface-800 dark:text-white">
                            {i18n.language === 'th' ? 'ลงทะเบียนบริษัท' : 'Register Company'}
                        </h1>
                        <p className="text-surface-500 mt-2">
                            {i18n.language === 'th'
                                ? 'สร้างบัญชีบริษัทเพื่อเริ่มใช้งานระบบ'
                                : 'Create a company account to get started'}
                        </p>
                    </div>

                    {/* Error message */}
                    {displayError && (
                        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                            <p className="text-sm text-red-600 dark:text-red-400 text-center">
                                {displayError}
                            </p>
                        </div>
                    )}

                    {/* Registration form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                    {i18n.language === 'th' ? 'ชื่อบริษัท *' : 'Company Name *'}
                                </label>
                                <input
                                    type="text"
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    className="input-base"
                                    placeholder={i18n.language === 'th' ? 'บริษัท รักษาความปลอดภัย จำกัด' : 'Security Services Co., Ltd.'}
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                    {i18n.language === 'th' ? 'ชื่อ-นามสกุลผู้ดูแลระบบ *' : 'Admin Full Name *'}
                                </label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className="input-base"
                                    placeholder={i18n.language === 'th' ? 'สมชาย ใจดี' : 'John Doe'}
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                    {i18n.language === 'th' ? 'อีเมล *' : 'Email *'}
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="input-base"
                                    placeholder="admin@company.com"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                    {i18n.language === 'th' ? 'เบอร์โทรศัพท์' : 'Phone Number'}
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="input-base"
                                    placeholder="08X-XXX-XXXX"
                                    disabled={isLoading}
                                />
                            </div>

                            <div></div>

                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                    {i18n.language === 'th' ? 'รหัสผ่าน *' : 'Password *'}
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input-base"
                                    placeholder="••••••••"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                    {i18n.language === 'th' ? 'ยืนยันรหัสผ่าน *' : 'Confirm Password *'}
                                </label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="input-base"
                                    placeholder="••••••••"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <p className="text-xs text-surface-500">
                            {i18n.language === 'th'
                                ? 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข'
                                : 'Password must be at least 8 characters with uppercase, lowercase and number'}
                        </p>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 spinner border-white border-t-transparent" />
                                    {i18n.language === 'th' ? 'กำลังลงทะเบียน...' : 'Registering...'}
                                </span>
                            ) : (
                                i18n.language === 'th' ? 'ลงทะเบียน' : 'Register'
                            )}
                        </button>
                    </form>

                    {/* Login link */}
                    <div className="mt-6 text-center">
                        <p className="text-surface-500 text-sm">
                            {i18n.language === 'th' ? 'มีบัญชีอยู่แล้ว?' : 'Already have an account?'}{' '}
                            <Link
                                to="/login"
                                className="text-primary-600 hover:text-primary-500 font-medium"
                            >
                                {i18n.language === 'th' ? 'เข้าสู่ระบบ' : 'Login'}
                            </Link>
                        </p>
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

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function LoginPage() {
    const { t, i18n } = useTranslation('auth');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // TODO: Implement login logic in Sprint 1
        console.log('Login attempt:', { email, password });
        setTimeout(() => setIsLoading(false), 1000);
    };

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'th' ? 'en' : 'th');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-900 p-4">
            <div className="w-full max-w-md">
                {/* Language toggle */}
                <div className="flex justify-end mb-4">
                    <button
                        onClick={toggleLanguage}
                        className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-sm"
                    >
                        {i18n.language === 'th' ? '🇺🇸 English' : '🇹🇭 ไทย'}
                    </button>
                </div>

                {/* Login card */}
                <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-2xl p-8 animate-fade-in">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg">
                            <span className="text-4xl">🛡️</span>
                        </div>
                        <h1 className="text-2xl font-bold text-surface-800 dark:text-white">
                            {t('app.name', { ns: 'common' })}
                        </h1>
                        <p className="text-surface-500 mt-2">
                            {t('app.tagline', { ns: 'common' })}
                        </p>
                    </div>

                    {/* Login form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2"
                            >
                                อีเมล / Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-base"
                                placeholder="admin@company.com"
                                required
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2"
                            >
                                รหัสผ่าน / Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-base"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 spinner border-white border-t-transparent" />
                                    {t('actions.loading', { ns: 'common' })}
                                </span>
                            ) : (
                                'เข้าสู่ระบบ / Login'
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
                                    หรือ / or
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="w-full mt-4 py-3 px-4 rounded-lg bg-[#00B900] text-white font-medium hover:bg-[#00A000] transition-colors flex items-center justify-center gap-3"
                        >
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                            </svg>
                            เข้าสู่ระบบด้วย LINE
                        </button>
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

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Lock, Globe, Check, AlertTriangle, Loader2 } from 'lucide-react';
import authService from '../../services/auth.service';

interface MyAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    user?: {
        name?: string;
        email?: string;
    };
}

export default function MyAccountModal({ isOpen, onClose, user }: MyAccountModalProps) {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState<'password' | 'language'>('password');

    // Password form state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleLanguageChange = (lang: string) => {
        i18n.changeLanguage(lang);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (newPassword !== confirmPassword) {
            setError(t('account.passwordsDoNotMatch'));
            return;
        }

        if (newPassword.length < 8) {
            setError(t('validation.passwordMinLength'));
            return;
        }

        setLoading(true);
        try {
            await authService.changePassword(currentPassword, newPassword);
            setSuccess(t('account.passwordChanged'));
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.message || t('liff.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div
                className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                        {t('account.title')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* User Info (Brief) */}
                <div className="p-4 bg-primary-50 dark:bg-primary-900/10 border-b border-primary-100 dark:border-primary-900/20">
                    <p className="font-medium text-primary-900 dark:text-primary-100">{user?.name}</p>
                    <p className="text-sm text-primary-600 dark:text-primary-300">{user?.email}</p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-neutral-200 dark:border-neutral-800">
                    <button
                        onClick={() => setActiveTab('password')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'password'
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                            }`}
                    >
                        <Lock size={16} />
                        {t('account.changePassword')}
                    </button>
                    <button
                        onClick={() => setActiveTab('language')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'language'
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                            }`}
                    >
                        <Globe size={16} />
                        {t('language.th')}/{t('language.en')}
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {activeTab === 'password' && (
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400 text-sm rounded-lg flex items-start gap-2">
                                    <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                            {success && (
                                <div className="p-3 bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400 text-sm rounded-lg flex items-start gap-2">
                                    <Check size={16} className="mt-0.5 flex-shrink-0" />
                                    <span>{success}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    {t('account.currentPassword')}
                                </label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    {t('account.newPassword')}
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white transition-all"
                                    required
                                    minLength={8}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    {t('account.confirmPassword')}
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white transition-all"
                                    required
                                    minLength={8}
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading && <Loader2 size={16} className="animate-spin" />}
                                    {t('common.save')}
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'language' && (
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => handleLanguageChange('th')}
                                className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${i18n.language === 'th'
                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                        : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-200 dark:hover:border-primary-800'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🇹🇭</span>
                                    <div className="text-left">
                                        <p className="font-medium text-neutral-900 dark:text-white">ภาษาไทย</p>
                                        <p className="text-sm text-neutral-500">Thai</p>
                                    </div>
                                </div>
                                {i18n.language === 'th' && <Check className="text-primary-600" size={20} />}
                            </button>

                            <button
                                type="button"
                                onClick={() => handleLanguageChange('en')}
                                className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${i18n.language === 'en'
                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                        : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-200 dark:hover:border-primary-800'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🇬🇧</span>
                                    <div className="text-left">
                                        <p className="font-medium text-neutral-900 dark:text-white">English</p>
                                        <p className="text-sm text-neutral-500">English</p>
                                    </div>
                                </div>
                                {i18n.language === 'en' && <Check className="text-primary-600" size={20} />}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

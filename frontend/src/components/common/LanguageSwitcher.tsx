import { useTranslation } from 'react-i18next';

interface LanguageSwitcherProps {
    variant?: 'dropdown' | 'toggle' | 'button';
    className?: string;
}

export default function LanguageSwitcher({ variant = 'toggle', className = '' }: LanguageSwitcherProps) {
    const { i18n } = useTranslation();

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'th' ? 'en' : 'th');
    };

    if (variant === 'button') {
        return (
            <button
                onClick={toggleLanguage}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    bg-surface-100 dark:bg-surface-700 
                    text-surface-600 dark:text-surface-300
                    hover:bg-surface-200 dark:hover:bg-surface-600
                    ${className}`}
            >
                {i18n.language === 'th' ? '🇺🇸 EN' : '🇹🇭 TH'}
            </button>
        );
    }

    if (variant === 'dropdown') {
        return (
            <select
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    bg-surface-100 dark:bg-surface-700 
                    text-surface-600 dark:text-surface-300
                    hover:bg-surface-200 dark:hover:bg-surface-600
                    border-none cursor-pointer
                    ${className}`}
            >
                <option value="th">🇹🇭 ไทย</option>
                <option value="en">🇺🇸 English</option>
            </select>
        );
    }

    // Toggle variant (default)
    return (
        <div className={`inline-flex rounded-lg bg-surface-100 dark:bg-surface-700 p-1 ${className}`}>
            <button
                onClick={() => i18n.changeLanguage('th')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${i18n.language === 'th'
                        ? 'bg-white dark:bg-surface-600 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                    }`}
            >
                🇹🇭 TH
            </button>
            <button
                onClick={() => i18n.changeLanguage('en')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${i18n.language === 'en'
                        ? 'bg-white dark:bg-surface-600 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                    }`}
            >
                🇺🇸 EN
            </button>
        </div>
    );
}

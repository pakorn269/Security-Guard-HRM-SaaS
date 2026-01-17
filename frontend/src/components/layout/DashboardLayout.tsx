import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

export default function DashboardLayout() {
    const { t, i18n } = useTranslation();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const navItems = [
        { path: '/', label: t('navigation.dashboard'), icon: '📊' },
        { path: '/employees', label: t('navigation.employees'), icon: '👥' },
        { path: '/schedule', label: t('navigation.schedule'), icon: '📅' },
        { path: '/attendance', label: t('navigation.attendance'), icon: '⏰' },
        { path: '/leave', label: t('navigation.leave'), icon: '🏖️' },
        { path: '/reports', label: t('navigation.reports'), icon: '📈' },
        { path: '/settings', label: t('navigation.settings'), icon: '⚙️' },
    ];

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'th' ? 'en' : 'th');
    };

    return (
        <div className="flex min-h-screen bg-surface-100 dark:bg-surface-900">
            {/* Sidebar */}
            <aside
                className={`${sidebarOpen ? 'w-64' : 'w-20'
                    } fixed left-0 top-0 h-full bg-primary-900 text-white transition-all duration-300 z-50`}
            >
                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-primary-800">
                    {sidebarOpen && (
                        <span className="text-xl font-bold">{t('app.name')}</span>
                    )}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 rounded-lg hover:bg-primary-800 transition-colors"
                    >
                        {sidebarOpen ? '◀' : '▶'}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                                    ? 'bg-primary-500 text-white shadow-lg'
                                    : 'hover:bg-primary-800 text-primary-100'
                                }`
                            }
                        >
                            <span className="text-xl">{item.icon}</span>
                            {sidebarOpen && <span>{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>
            </aside>

            {/* Main content */}
            <div
                className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}
            >
                {/* Header */}
                <header className="sticky top-0 h-16 bg-white dark:bg-surface-800 shadow-sm flex items-center justify-between px-6 z-40">
                    <h1 className="text-xl font-semibold text-surface-800 dark:text-white">
                        {t('app.name')}
                    </h1>
                    <div className="flex items-center gap-4">
                        {/* Language toggle */}
                        <button
                            onClick={toggleLanguage}
                            className="px-3 py-1 rounded-lg bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors"
                        >
                            {i18n.language === 'th' ? '🇹🇭 ไทย' : '🇺🇸 EN'}
                        </button>

                        {/* User menu placeholder */}
                        <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
                            U
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import NotificationBell from '../common/NotificationBell';

export default function DashboardLayout() {
    const { t, i18n } = useTranslation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Check for mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
            if (window.innerWidth >= 1024) {
                setSidebarOpen(true);
            } else {
                setSidebarOpen(false);
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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

    const closeSidebarOnMobile = () => {
        if (isMobile) {
            setSidebarOpen(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-surface-100 dark:bg-surface-900">
            {/* Mobile overlay */}
            {sidebarOpen && isMobile && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed left-0 top-0 h-full bg-primary-900 text-white z-50 transition-all duration-300
                    ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-20 lg:translate-x-0'}
                `}
            >
                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-primary-800">
                    <span className={`text-xl font-bold transition-opacity ${sidebarOpen ? 'opacity-100' : 'lg:opacity-0'}`}>
                        {t('app.name')}
                    </span>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 rounded-lg hover:bg-primary-800 transition-colors lg:block hidden"
                        aria-label="Toggle sidebar"
                    >
                        {sidebarOpen ? '◀' : '▶'}
                    </button>
                    {/* Close button for mobile */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-2 rounded-lg hover:bg-primary-800 transition-colors lg:hidden"
                        aria-label="Close menu"
                    >
                        ✕
                    </button>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-4rem)]">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            onClick={closeSidebarOnMobile}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                                    ? 'bg-primary-500 text-white shadow-lg'
                                    : 'hover:bg-primary-800 text-primary-100'
                                }`
                            }
                        >
                            <span className="text-xl flex-shrink-0">{item.icon}</span>
                            <span className={`transition-opacity whitespace-nowrap ${sidebarOpen ? 'opacity-100' : 'lg:opacity-0 lg:w-0'}`}>
                                {item.label}
                            </span>
                        </NavLink>
                    ))}
                </nav>
            </aside>

            {/* Main content */}
            <div
                className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}
            >
                {/* Header */}
                <header className="sticky top-0 h-16 bg-white dark:bg-surface-800 shadow-sm flex items-center justify-between px-4 sm:px-6 z-40">
                    {/* Mobile menu button */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors lg:hidden"
                        aria-label="Open menu"
                    >
                        <span className="text-xl">☰</span>
                    </button>

                    <h1 className="text-lg sm:text-xl font-semibold text-surface-800 dark:text-white truncate">
                        {t('app.name')}
                    </h1>

                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Language toggle */}
                        <button
                            onClick={toggleLanguage}
                            className="px-2 sm:px-3 py-1 rounded-lg bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors text-sm"
                        >
                            {i18n.language === 'th' ? '🇹🇭' : '🇺🇸'}
                            <span className="hidden sm:inline ml-1">{i18n.language === 'th' ? 'ไทย' : 'EN'}</span>
                        </button>

                        {/* Notification Bell */}
                        <NotificationBell />

                        {/* User menu placeholder */}
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                            U
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 sm:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}


import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Clock,
  CalendarOff,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
  Globe,
} from 'lucide-react';
import NotificationBell from '../common/NotificationBell';
import Avatar from '../common/Avatar';
import { ThemeToggle } from '../theme';

// Navigation items with Lucide icons
const NAV_ITEMS = [
  { path: '/', labelKey: 'navigation.dashboard', icon: LayoutDashboard },
  { path: '/employees', labelKey: 'navigation.employees', icon: Users },
  { path: '/schedule', labelKey: 'navigation.schedule', icon: Calendar },
  { path: '/attendance', labelKey: 'navigation.attendance', icon: Clock },
  { path: '/leave', labelKey: 'navigation.leave', icon: CalendarOff },
  { path: '/reports', labelKey: 'navigation.reports', icon: BarChart3 },
  { path: '/settings', labelKey: 'navigation.settings', icon: Settings },
] as const;

export default function DashboardLayout() {
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'th' ? 'en' : 'th');
  };

  const closeSidebarOnMobile = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-full bg-primary-900 text-white z-50 transition-all duration-300
          ${sidebarOpen ? 'w-60 translate-x-0' : 'w-60 -translate-x-full lg:w-16 lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-primary-800">
          <span
            className={`text-lg font-semibold whitespace-nowrap transition-opacity ${
              sidebarOpen ? 'opacity-100' : 'lg:opacity-0 lg:w-0 lg:overflow-hidden'
            }`}
          >
            {t('app.name')}
          </span>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md hover:bg-primary-800 transition-colors lg:block hidden"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
          {/* Close button for mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-md hover:bg-primary-800 transition-colors lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={closeSidebarOnMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                    isActive
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'hover:bg-primary-800 text-primary-100'
                  }`
                }
              >
                <Icon size={20} className="flex-shrink-0" aria-hidden="true" />
                <span
                  className={`transition-opacity whitespace-nowrap text-sm ${
                    sidebarOpen ? 'opacity-100' : 'lg:opacity-0 lg:w-0 lg:overflow-hidden'
                  }`}
                >
                  {t(item.labelKey)}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-60' : 'lg:ml-16'}`}>
        {/* Header */}
        <header className="sticky top-0 h-14 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 z-40">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} className="text-neutral-600 dark:text-neutral-400" />
          </button>

          <h1 className="text-base font-semibold text-neutral-800 dark:text-white truncate lg:hidden">
            {t('app.name')}
          </h1>

          {/* Spacer for desktop */}
          <div className="hidden lg:block" />

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <ThemeToggle size="sm" />

            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-sm text-neutral-700 dark:text-neutral-300"
              aria-label={`Switch language to ${i18n.language === 'th' ? 'English' : 'Thai'}`}
            >
              <Globe size={16} />
              <span className="hidden sm:inline">{i18n.language === 'th' ? 'TH' : 'EN'}</span>
            </button>

            {/* Notification Bell */}
            <NotificationBell />

            {/* User avatar */}
            <Avatar name="User" size="sm" />
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

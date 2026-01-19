import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  path: string;
  labelKey: string;
  icon: LucideIcon;
  end?: boolean;
}

// Navigation items with Lucide icons (replaces emoji icons)
const NAV_ITEMS: NavItem[] = [
  { path: '/', labelKey: 'navigation.dashboard', icon: LayoutDashboard, end: true },
  { path: '/employees', labelKey: 'navigation.employees', icon: Users },
  { path: '/schedule', labelKey: 'navigation.schedule', icon: Calendar },
  { path: '/attendance', labelKey: 'navigation.attendance', icon: Clock },
  { path: '/leave', labelKey: 'navigation.leave', icon: CalendarOff },
  { path: '/reports', labelKey: 'navigation.reports', icon: BarChart3 },
];

const BOTTOM_NAV_ITEMS: NavItem[] = [
  { path: '/settings', labelKey: 'navigation.settings', icon: Settings },
];

interface SidebarProps {
  /** Whether sidebar is expanded */
  isExpanded: boolean;
  /** Toggle sidebar expansion */
  onToggle: () => void;
  /** Whether on mobile viewport */
  isMobile: boolean;
  /** Close sidebar (mobile) */
  onClose: () => void;
  /** Additional CSS classes */
  className?: string;
}

export default function Sidebar({
  isExpanded,
  onToggle,
  isMobile,
  onClose,
  className = '',
}: SidebarProps) {
  const { t } = useTranslation();

  const handleNavClick = () => {
    if (isMobile) {
      onClose();
    }
  };

  return (
    <aside
      className={`
        fixed left-0 top-0 h-full z-50
        bg-primary-900 dark:bg-neutral-900
        text-white
        transition-all duration-300 ease-in-out
        flex flex-col
        ${isExpanded ? 'w-60' : 'w-16'}
        ${isMobile && !isExpanded ? '-translate-x-full' : 'translate-x-0'}
        ${className}
      `}
    >
      {/* Logo area - 56px height to match header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-primary-800 dark:border-neutral-800 flex-shrink-0">
        {/* Logo/Brand */}
        <div
          className={`
            flex items-center gap-2 overflow-hidden transition-all duration-300
            ${isExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0'}
          `}
        >
          <div className="w-8 h-8 rounded-md bg-primary-500 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold">SG</span>
          </div>
          <span className="text-base font-semibold whitespace-nowrap">
            {t('app.name')}
          </span>
        </div>

        {/* Collapsed logo */}
        {!isExpanded && !isMobile && (
          <div className="w-8 h-8 rounded-md bg-primary-500 flex items-center justify-center mx-auto">
            <span className="text-sm font-bold">SG</span>
          </div>
        )}

        {/* Toggle/Close button */}
        {isMobile ? (
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-primary-800 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        ) : (
          <button
            onClick={onToggle}
            className={`
              p-1.5 rounded-md hover:bg-primary-800 dark:hover:bg-neutral-800 transition-colors
              ${isExpanded ? '' : 'mx-auto'}
            `}
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.path}
            item={item}
            isExpanded={isExpanded}
            onClick={handleNavClick}
          />
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-primary-800 dark:border-neutral-800" />

      {/* Bottom Navigation (Settings) */}
      <nav className="p-3 space-y-1 flex-shrink-0">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.path}
            item={item}
            isExpanded={isExpanded}
            onClick={handleNavClick}
          />
        ))}
      </nav>
    </aside>
  );
}

// Sidebar Navigation Item Component
interface SidebarNavItemProps {
  item: NavItem;
  isExpanded: boolean;
  onClick: () => void;
}

function SidebarNavItem({ item, isExpanded, onClick }: SidebarNavItemProps) {
  const { t } = useTranslation();
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        `
          flex items-center gap-3 px-3 py-2.5 rounded-md transition-all
          ${isExpanded ? '' : 'justify-center'}
          ${
            isActive
              ? 'bg-primary-500 dark:bg-primary-600 text-white shadow-md'
              : 'hover:bg-primary-800 dark:hover:bg-neutral-800 text-primary-100 dark:text-neutral-300'
          }
        `
      }
      title={!isExpanded ? t(item.labelKey) : undefined}
    >
      <Icon size={20} className="flex-shrink-0" aria-hidden="true" />
      <span
        className={`
          text-sm font-medium whitespace-nowrap transition-all duration-300
          ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}
        `}
      >
        {t(item.labelKey)}
      </span>
    </NavLink>
  );
}

export { NAV_ITEMS, BOTTOM_NAV_ITEMS };
export type { SidebarProps, NavItem };

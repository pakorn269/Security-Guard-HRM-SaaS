import React from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, Globe, Search } from 'lucide-react';
import NotificationBell from '../common/NotificationBell';
import Avatar from '../common/Avatar';
import { ThemeToggle } from '../theme';

interface HeaderProps {
  /** Callback to open mobile sidebar */
  onMenuClick?: () => void;
  /** Show mobile menu button */
  showMenuButton?: boolean;
  /** Page title (for mobile) */
  title?: string;
  /** Show search */
  showSearch?: boolean;
  /** User data */
  user?: {
    name?: string;
    avatar?: string;
  };
  /** Additional CSS classes */
  className?: string;
}

export default function Header({
  onMenuClick,
  showMenuButton = true,
  title,
  showSearch = false,
  user,
  className = '',
}: HeaderProps) {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'th' ? 'en' : 'th');
  };

  return (
    <header
      className={`
        sticky top-0 z-40
        h-14 px-4
        bg-white dark:bg-neutral-900
        border-b border-neutral-200 dark:border-neutral-800
        flex items-center justify-between gap-4
        ${className}
      `}
    >
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} className="text-neutral-600 dark:text-neutral-400" />
          </button>
        )}

        {/* Mobile title */}
        {title && (
          <h1 className="text-base font-semibold text-neutral-800 dark:text-white truncate lg:hidden">
            {title}
          </h1>
        )}

        {/* Search (desktop) */}
        {showSearch && (
          <div className="hidden lg:flex items-center">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                placeholder={t('common.search')}
                className="
                  w-64 h-9 pl-9 pr-4
                  text-sm
                  bg-neutral-100 dark:bg-neutral-800
                  border-0
                  rounded-md
                  placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                  focus:outline-none focus:ring-2 focus:ring-primary-500/20
                  transition-all
                "
              />
              <kbd className="hidden xl:inline-flex absolute right-3 top-1/2 -translate-y-1/2 items-center px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 dark:text-neutral-500 bg-neutral-200 dark:bg-neutral-700 rounded">
                ⌘K
              </kbd>
            </div>
          </div>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <ThemeToggle size="sm" />

        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          className="
            inline-flex items-center gap-1.5
            px-2.5 py-1.5
            rounded-md
            bg-neutral-100 dark:bg-neutral-800
            hover:bg-neutral-200 dark:hover:bg-neutral-700
            transition-colors
            text-sm text-neutral-700 dark:text-neutral-300
          "
          aria-label={`Switch language to ${i18n.language === 'th' ? 'English' : 'Thai'}`}
        >
          <Globe size={16} />
          <span className="hidden sm:inline font-medium">
            {i18n.language === 'th' ? 'TH' : 'EN'}
          </span>
        </button>

        {/* Notification Bell */}
        <NotificationBell />

        {/* User menu */}
        <UserMenu user={user} />
      </div>
    </header>
  );
}

// User Menu Component
interface UserMenuProps {
  user?: {
    name?: string;
    avatar?: string;
  };
}

function UserMenu({ user }: UserMenuProps) {
  const userName = user?.name || 'User';
  const userAvatar = user?.avatar;

  return (
    <button
      className="
        flex items-center gap-2 p-1 rounded-md
        hover:bg-neutral-100 dark:hover:bg-neutral-800
        transition-colors
      "
      aria-label="User menu"
    >
      <Avatar name={userName} src={userAvatar} size="sm" />
      <span className="hidden lg:block text-sm font-medium text-neutral-700 dark:text-neutral-300 max-w-[120px] truncate">
        {userName}
      </span>
    </button>
  );
}

export type { HeaderProps };

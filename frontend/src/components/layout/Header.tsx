import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, Globe, Search, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import NotificationBell from '../common/NotificationBell';
import Avatar from '../common/Avatar';
import { ThemeToggle } from '../theme';
import { useAuth } from '../../context/AuthContext';
<<<<<<< HEAD
import MyAccountModal from '../auth/MyAccountModal';
import { Link } from 'react-router-dom';
=======
>>>>>>> c250b2ab5f71c2f1dbd343e4f40002ffd4ea34ed

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

// User Menu Component with Dropdown
interface UserMenuProps {
  user?: {
    name?: string;
    avatar?: string;
    email?: string;
  };
}

function UserMenu({ user }: UserMenuProps) {
  const { t } = useTranslation();
<<<<<<< HEAD
  const navigate = useNavigate();
=======
>>>>>>> c250b2ab5f71c2f1dbd343e4f40002ffd4ea34ed
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const userName = user?.name || 'User';
  const userEmail = user?.email || '';
  const userAvatar = user?.avatar;

  // Close menu on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  React.useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLogout = async () => {
<<<<<<< HEAD
=======
    await logout();
>>>>>>> c250b2ab5f71c2f1dbd343e4f40002ffd4ea34ed
    setIsOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 p-1 rounded-md
          hover:bg-neutral-100 dark:hover:bg-neutral-800
          transition-colors
        "
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Avatar name={userName} src={userAvatar} size="sm" />
        <span className="hidden lg:block text-sm font-medium text-neutral-700 dark:text-neutral-300 max-w-[120px] truncate">
          {userName}
        </span>
        <ChevronDown
          size={14}
          className={`hidden lg:block text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="
            absolute right-0 mt-2 z-50
            w-56 py-1
            bg-white dark:bg-neutral-900
            border border-neutral-200 dark:border-neutral-800
            rounded-md shadow-lg
            animate-scale-in origin-top-right
          "
        >
          {/* User info header */}
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
              {userName}
            </p>
            {userEmail && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {userEmail}
              </p>
            )}
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsAccountModalOpen(true);
              }}
              className="
                w-full flex items-center gap-3 px-4 py-2
                text-sm text-neutral-700 dark:text-neutral-300
                hover:bg-neutral-50 dark:hover:bg-neutral-800
                transition-colors text-left
              "
            >
              <User size={16} className="text-neutral-400 dark:text-neutral-500" />
              {t('account.title')}
            </button>
            <MenuLink to="/settings" icon={Settings} onClick={() => setIsOpen(false)}>
              {t('navigation.settings')}
            </MenuLink>
          </div>

          {/* Logout */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 py-1">
            <button
              onClick={handleLogout}
              className="
                w-full flex items-center gap-3 px-4 py-2
                text-sm text-error-600 dark:text-error-400
                hover:bg-neutral-50 dark:hover:bg-neutral-800
                transition-colors
              "
            >
              <LogOut size={16} />
              {t('auth.logout')}
            </button>
          </div>
        </div>
      )}

      {/* Account Modal */}
      <MyAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        user={{
          name: userName,
          email: userEmail
        }}
      />
    </div>
  );
}

// Menu Link Component
interface MenuLinkProps {
  to: string;
  icon: React.ElementType;
  children: React.ReactNode;
  onClick?: () => void;
}

function MenuLink({ to, icon: Icon, children, onClick }: MenuLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="
        flex items-center gap-3 px-4 py-2
        text-sm text-neutral-700 dark:text-neutral-300
        hover:bg-neutral-50 dark:hover:bg-neutral-800
        transition-colors
      "
    >
      <Icon size={16} className="text-neutral-400 dark:text-neutral-500" />
      {children}
    </Link>
  );
}

export type { HeaderProps };


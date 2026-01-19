import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme, type Theme } from './ThemeProvider';

interface ThemeToggleProps {
  /** Display variant */
  variant?: 'button' | 'dropdown';
  /** Size of the toggle */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Show label text */
  showLabel?: boolean;
}

const sizeClasses = {
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-2.5',
};

const iconSizes = {
  sm: 14,
  md: 18,
  lg: 22,
};

export function ThemeToggle({
  variant = 'button',
  size = 'md',
  className = '',
  showLabel = false,
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme, toggleTheme } = useTheme();

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`
          inline-flex items-center justify-center gap-2
          rounded-md transition-colors duration-150
          text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100
          dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
          ${sizeClasses[size]}
          ${className}
        `}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {resolvedTheme === 'dark' ? (
          <Sun size={iconSizes[size]} />
        ) : (
          <Moon size={iconSizes[size]} />
        )}
        {showLabel && (
          <span className="text-sm">
            {resolvedTheme === 'dark' ? 'Light' : 'Dark'}
          </span>
        )}
      </button>
    );
  }

  // Dropdown variant with all three options
  return (
    <div className={`relative inline-block ${className}`}>
      <div className="flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-neutral-800 p-1">
        <ThemeOption
          theme="light"
          currentTheme={theme}
          onClick={() => setTheme('light')}
          size={size}
          icon={<Sun size={iconSizes[size]} />}
          label="Light"
        />
        <ThemeOption
          theme="dark"
          currentTheme={theme}
          onClick={() => setTheme('dark')}
          size={size}
          icon={<Moon size={iconSizes[size]} />}
          label="Dark"
        />
        <ThemeOption
          theme="system"
          currentTheme={theme}
          onClick={() => setTheme('system')}
          size={size}
          icon={<Monitor size={iconSizes[size]} />}
          label="System"
        />
      </div>
    </div>
  );
}

interface ThemeOptionProps {
  theme: Theme;
  currentTheme: Theme;
  onClick: () => void;
  size: 'sm' | 'md' | 'lg';
  icon: React.ReactNode;
  label: string;
}

function ThemeOption({
  theme,
  currentTheme,
  onClick,
  size,
  icon,
  label,
}: ThemeOptionProps) {
  const isActive = theme === currentTheme;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center justify-center rounded
        transition-colors duration-150
        ${sizeClasses[size]}
        ${
          isActive
            ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
            : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
        }
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
      `}
      aria-label={`Use ${label} theme`}
      aria-pressed={isActive}
      title={`${label} mode`}
    >
      {icon}
    </button>
  );
}

export default ThemeToggle;

import React from 'react';
import { NavLink as RouterNavLink, type NavLinkProps as RouterNavLinkProps } from 'react-router-dom';

type NavLinkVariant = 'default' | 'sidebar' | 'header' | 'bottom';
type NavLinkSize = 'sm' | 'md' | 'lg';

interface NavLinkProps extends Omit<RouterNavLinkProps, 'className'> {
  /** Link content */
  children: React.ReactNode;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Badge content (e.g., notification count) */
  badge?: React.ReactNode;
  /** Visual variant */
  variant?: NavLinkVariant;
  /** Size variant */
  size?: NavLinkSize;
  /** Show icon only (for collapsed sidebar) */
  iconOnly?: boolean;
  /** Custom active class check */
  isActive?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const variantClasses: Record<
  NavLinkVariant,
  { base: string; active: string; inactive: string }
> = {
  default: {
    base: 'inline-flex items-center gap-2 font-medium rounded transition-colors',
    active: 'text-primary-600 dark:text-primary-400',
    inactive: 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white',
  },
  sidebar: {
    base: 'flex items-center gap-3 font-medium rounded-md transition-colors',
    active: 'bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400',
    inactive: 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white',
  },
  header: {
    base: 'inline-flex items-center gap-2 font-medium transition-colors border-b-2',
    active: 'border-primary-500 text-primary-600 dark:text-primary-400',
    inactive: 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600',
  },
  bottom: {
    base: 'flex flex-col items-center gap-1 font-medium transition-colors',
    active: 'text-primary-600 dark:text-primary-400',
    inactive: 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white',
  },
};

const sizeClasses: Record<NavLinkVariant, Record<NavLinkSize, string>> = {
  default: {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  },
  sidebar: {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  },
  header: {
    sm: 'px-2 py-2 text-sm',
    md: 'px-3 py-3 text-sm',
    lg: 'px-4 py-4 text-base',
  },
  bottom: {
    sm: 'px-2 py-1 text-[10px]',
    md: 'px-3 py-1.5 text-xs',
    lg: 'px-4 py-2 text-sm',
  },
};

export default function NavLink({
  children,
  icon,
  badge,
  variant = 'default',
  size = 'md',
  iconOnly = false,
  isActive: propIsActive,
  className = '',
  ...props
}: NavLinkProps) {
  const variantConfig = variantClasses[variant];
  const sizeConfig = sizeClasses[variant][size];

  return (
    <RouterNavLink
      className={({ isActive: routerIsActive }) => {
        const active = propIsActive !== undefined ? propIsActive : routerIsActive;
        return `
          ${variantConfig.base}
          ${sizeConfig}
          ${active ? variantConfig.active : variantConfig.inactive}
          ${iconOnly ? 'justify-center' : ''}
          ${className}
        `.trim();
      }}
      {...props}
    >
      {({ isActive: routerIsActive }) => {
        const active = propIsActive !== undefined ? propIsActive : routerIsActive;
        return (
          <>
            {icon && (
              <span
                className={`
                  flex-shrink-0
                  ${variant === 'bottom' ? 'text-lg' : ''}
                `}
              >
                {icon}
              </span>
            )}
            {!iconOnly && <span className="truncate">{children}</span>}
            {badge && (
              <span
                className={`
                  inline-flex items-center justify-center
                  min-w-[18px] h-[18px] px-1
                  text-[10px] font-semibold
                  rounded-full
                  ${
                    active
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                  }
                `}
              >
                {badge}
              </span>
            )}
          </>
        );
      }}
    </RouterNavLink>
  );
}

// Simple link (not for routing)
interface SimpleLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Link content */
  children: React.ReactNode;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Visual variant */
  variant?: 'default' | 'primary' | 'muted';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** External link (opens in new tab) */
  external?: boolean;
}

export function SimpleLink({
  children,
  icon,
  variant = 'default',
  size = 'md',
  external = false,
  className = '',
  ...props
}: SimpleLinkProps) {
  const variantClasses: Record<string, string> = {
    default: 'text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white',
    primary: 'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300',
    muted: 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200',
  };

  const sizeClasses: Record<string, string> = {
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <a
      className={`
        inline-flex items-center gap-1.5
        font-medium underline-offset-2 hover:underline
        transition-colors
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </a>
  );
}

export type { NavLinkProps, SimpleLinkProps, NavLinkVariant, NavLinkSize };

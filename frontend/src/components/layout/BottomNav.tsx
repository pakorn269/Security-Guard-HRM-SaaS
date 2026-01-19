import React from 'react';
import { NavLink } from 'react-router-dom';
import { type LucideIcon } from 'lucide-react';

interface BottomNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

interface BottomNavProps {
  /** Navigation items */
  items: BottomNavItem[];
  /** Additional CSS classes */
  className?: string;
}

export default function BottomNav({ items, className = '' }: BottomNavProps) {
  return (
    <nav
      className={`
        fixed bottom-0 left-0 right-0 z-40
        bg-white dark:bg-neutral-900
        border-t border-neutral-200 dark:border-neutral-800
        safe-area-bottom
        ${className}
      `}
    >
      <div className="flex items-center justify-around h-14">
        {items.map((item) => (
          <BottomNavItem key={item.path} item={item} />
        ))}
      </div>
    </nav>
  );
}

// Bottom Navigation Item
interface BottomNavItemProps {
  item: BottomNavItem;
}

function BottomNavItem({ item }: BottomNavItemProps) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `
          flex flex-col items-center justify-center
          min-w-[64px] h-full px-2
          transition-colors touch-target
          ${
            isActive
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-neutral-500 dark:text-neutral-400'
          }
        `
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={22}
            className={isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}
            aria-hidden="true"
          />
          <span className="mt-0.5 text-[10px] font-medium truncate max-w-full">
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

// Fixed Bottom Action Button (for clock-in, etc.)
interface BottomActionProps {
  /** Action button content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function BottomAction({ children, className = '' }: BottomActionProps) {
  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-40
        bg-white dark:bg-neutral-900
        border-t border-neutral-200 dark:border-neutral-800
        p-4 safe-area-bottom
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export type { BottomNavProps, BottomNavItem, BottomActionProps };

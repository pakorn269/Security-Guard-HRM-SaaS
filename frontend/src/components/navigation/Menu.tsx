import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Check } from 'lucide-react';

type MenuPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

interface MenuProps {
  /** Menu trigger element */
  trigger: React.ReactElement;
  /** Menu items */
  children: React.ReactNode;
  /** Placement of menu */
  placement?: MenuPlacement;
  /** Menu is open (controlled) */
  isOpen?: boolean;
  /** Open change callback (controlled) */
  onOpenChange?: (open: boolean) => void;
  /** Additional CSS classes for menu */
  className?: string;
}

export default function Menu({
  trigger,
  children,
  placement = 'bottom-start',
  isOpen: controlledIsOpen,
  onOpenChange,
  className = '',
}: MenuProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;

  const triggerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !menuRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'bottom-start':
        top = triggerRect.bottom + scrollY + 4;
        left = triggerRect.left + scrollX;
        break;
      case 'bottom-end':
        top = triggerRect.bottom + scrollY + 4;
        left = triggerRect.right + scrollX - menuRect.width;
        break;
      case 'top-start':
        top = triggerRect.top + scrollY - menuRect.height - 4;
        left = triggerRect.left + scrollX;
        break;
      case 'top-end':
        top = triggerRect.top + scrollY - menuRect.height - 4;
        left = triggerRect.right + scrollX - menuRect.width;
        break;
    }

    // Keep within viewport
    const viewportWidth = window.innerWidth;
    if (left < 8) left = 8;
    if (left + menuRect.width > viewportWidth - 8) {
      left = viewportWidth - menuRect.width - 8;
    }

    setPosition({ top, left });
  }, [placement]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, setIsOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, setIsOpen]);

  const triggerProps = trigger.props as Record<string, unknown>;
  const triggerElement = React.cloneElement(trigger, {
    ref: triggerRef,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      setIsOpen(!isOpen);
      (triggerProps.onClick as ((e: React.MouseEvent) => void) | undefined)?.(e);
    },
    'aria-expanded': isOpen,
    'aria-haspopup': true,
  } as React.HTMLAttributes<HTMLElement>);

  return (
    <>
      {triggerElement}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className={`
              fixed z-[100]
              min-w-[180px] py-1
              bg-white dark:bg-neutral-800
              border border-neutral-200 dark:border-neutral-700
              rounded-md shadow-lg
              animate-fade-in
              ${className}
            `}
            style={{ top: position.top, left: position.left }}
          >
            {React.Children.map(children, (child) =>
              React.isValidElement(child)
                ? React.cloneElement(child, {
                  onClose: () => setIsOpen(false),
                } as Partial<MenuItemProps>)
                : child
            )}
          </div>,
          document.body
        )}
    </>
  );
}

// Menu Item
interface MenuItemProps {
  /** Item content */
  children: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Show chevron (for submenus) */
  hasSubmenu?: boolean;
  /** Checked state (for checkbox items) */
  checked?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Destructive action */
  destructive?: boolean;
  /** Internal: close menu */
  onClose?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function MenuItem({
  children,
  onClick,
  icon,
  hasSubmenu = false,
  checked,
  disabled = false,
  destructive = false,
  onClose,
  className = '',
}: MenuItemProps) {
  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    if (!hasSubmenu) {
      onClose?.();
    }
  };

  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={`
        w-full flex items-center gap-2 px-3 py-2
        text-sm text-left
        transition-colors
        ${destructive
          ? 'text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-950/30'
          : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'
        }
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent
        ${className}
      `}
    >
      {/* Checkbox indicator */}
      {checked !== undefined && (
        <span className="w-4 flex-shrink-0">
          {checked && <Check size={16} className="text-primary-500" />}
        </span>
      )}

      {/* Icon */}
      {icon && <span className="flex-shrink-0 text-neutral-400 dark:text-neutral-500">{icon}</span>}

      {/* Content */}
      <span className="flex-1">{children}</span>

      {/* Submenu indicator */}
      {hasSubmenu && (
        <ChevronRight size={16} className="flex-shrink-0 text-neutral-400 dark:text-neutral-500" />
      )}
    </button>
  );
}

// Menu Divider
interface MenuDividerProps {
  className?: string;
}

export function MenuDivider({ className = '' }: MenuDividerProps) {
  return (
    <div
      role="separator"
      className={`my-1 h-px bg-neutral-200 dark:bg-neutral-700 ${className}`}
    />
  );
}

// Menu Label
interface MenuLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function MenuLabel({ children, className = '' }: MenuLabelProps) {
  return (
    <div
      className={`
        px-3 py-1.5 text-xs font-semibold uppercase tracking-wider
        text-neutral-500 dark:text-neutral-400
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export type { MenuProps, MenuItemProps, MenuDividerProps, MenuLabelProps, MenuPlacement };

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type DrawerPlacement = 'left' | 'right' | 'top' | 'bottom';
type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface DrawerProps {
  /** Whether drawer is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Drawer title */
  title?: string;
  /** Drawer content */
  children: React.ReactNode;
  /** Placement of the drawer */
  placement?: DrawerPlacement;
  /** Size of the drawer */
  size?: DrawerSize;
  /** Show close button */
  showCloseButton?: boolean;
  /** Close on overlay click */
  closeOnOverlayClick?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
  /** Footer content */
  footer?: React.ReactNode;
  /** Additional CSS classes for drawer */
  className?: string;
}

const sizeClasses: Record<DrawerPlacement, Record<DrawerSize, string>> = {
  left: {
    sm: 'w-64',
    md: 'w-80',
    lg: 'w-96',
    xl: 'w-[32rem]',
    full: 'w-screen',
  },
  right: {
    sm: 'w-64',
    md: 'w-80',
    lg: 'w-96',
    xl: 'w-[32rem]',
    full: 'w-screen',
  },
  top: {
    sm: 'h-32',
    md: 'h-48',
    lg: 'h-64',
    xl: 'h-96',
    full: 'h-screen',
  },
  bottom: {
    sm: 'h-32',
    md: 'h-48',
    lg: 'h-64',
    xl: 'h-96',
    full: 'h-screen',
  },
};

const placementClasses: Record<DrawerPlacement, { position: string; transform: string; open: string }> = {
  left: {
    position: 'inset-y-0 left-0',
    transform: '-translate-x-full',
    open: 'translate-x-0',
  },
  right: {
    position: 'inset-y-0 right-0',
    transform: 'translate-x-full',
    open: 'translate-x-0',
  },
  top: {
    position: 'inset-x-0 top-0',
    transform: '-translate-y-full',
    open: 'translate-y-0',
  },
  bottom: {
    position: 'inset-x-0 bottom-0',
    transform: 'translate-y-full',
    open: 'translate-y-0',
  },
};

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  placement = 'right',
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  className = '',
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      drawerRef.current.focus();
    }
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const placementConfig = placementClasses[placement];
  const sizeClass = sizeClasses[placement][size];
  const isHorizontal = placement === 'left' || placement === 'right';

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-hidden"
      aria-labelledby={title ? 'drawer-title' : undefined}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        className={`
          fixed ${placementConfig.position}
          ${sizeClass}
          ${isHorizontal ? 'max-w-full' : 'max-h-full'}
          bg-white dark:bg-neutral-900
          shadow-xl
          transform transition-transform duration-300 ease-out
          ${isOpen ? placementConfig.open : placementConfig.transform}
          flex flex-col
          ${className}
        `}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
            {title && (
              <h2
                id="drawer-title"
                className="text-lg font-semibold text-neutral-900 dark:text-white"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className={`
                  p-2 rounded-lg
                  text-neutral-400 dark:text-neutral-500
                  hover:text-neutral-600 dark:hover:text-neutral-300
                  hover:bg-neutral-100 dark:hover:bg-neutral-800
                  transition-colors
                  ${!title ? 'ml-auto' : ''}
                `}
                aria-label="Close drawer"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export type { DrawerProps, DrawerPlacement, DrawerSize };

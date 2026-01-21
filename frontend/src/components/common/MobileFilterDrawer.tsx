import React, { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, SlidersHorizontal, RotateCcw, Check } from 'lucide-react';

export interface MobileFilterDrawerProps {
    /** Whether the drawer is open */
    isOpen: boolean;
    /** Callback when drawer should close */
    onClose: () => void;
    /** Filter content to render inside drawer */
    children: React.ReactNode;
    /** Title of the filter drawer */
    title?: string;
    /** Show apply button */
    showApplyButton?: boolean;
    /** Apply button callback */
    onApply?: () => void;
    /** Show clear all button */
    showClearButton?: boolean;
    /** Clear all callback */
    onClear?: () => void;
    /** Number of active filters (shown as badge) */
    activeFiltersCount?: number;
    /** Additional CSS classes for the drawer content */
    className?: string;
}

/**
 * Mobile-optimized filter drawer that slides up from the bottom of the screen.
 * Used on mobile devices to provide a better UX for complex filter interfaces.
 */
export default function MobileFilterDrawer({
    isOpen,
    onClose,
    children,
    title = 'Filters',
    showApplyButton = true,
    onApply,
    showClearButton = true,
    onClear,
    activeFiltersCount = 0,
    className = '',
}: MobileFilterDrawerProps) {
    const drawerRef = useRef<HTMLDivElement>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    // Handle open/close animation
    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            // Small delay to trigger animation
            requestAnimationFrame(() => {
                setIsAnimating(true);
            });
        } else {
            setIsAnimating(false);
            // Wait for animation to complete before unmounting
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

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

    // Handle backdrop click
    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    // Handle apply
    const handleApply = useCallback(() => {
        onApply?.();
        onClose();
    }, [onApply, onClose]);

    // Handle clear
    const handleClear = useCallback(() => {
        onClear?.();
    }, [onClear]);

    if (!shouldRender) return null;

    const drawerContent = (
        <div
            className={`
        fixed inset-0 z-50
        transition-opacity duration-300
        ${isAnimating ? 'opacity-100' : 'opacity-0'}
      `}
            onClick={handleBackdropClick}
        >
            {/* Backdrop */}
            <div
                className={`
          absolute inset-0 bg-black/50 backdrop-blur-sm
          transition-opacity duration-300
          ${isAnimating ? 'opacity-100' : 'opacity-0'}
        `}
                aria-hidden="true"
            />

            {/* Drawer */}
            <div
                ref={drawerRef}
                className={`
          absolute bottom-0 left-0 right-0
          max-h-[85vh] overflow-hidden
          bg-white dark:bg-neutral-900
          rounded-t-2xl shadow-2xl
          transform transition-transform duration-300 ease-out
          ${isAnimating ? 'translate-y-0' : 'translate-y-full'}
          ${className}
        `}
                role="dialog"
                aria-modal="true"
                aria-labelledby="filter-drawer-title"
            >
                {/* Drawer handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 pb-3 border-b border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal size={18} className="text-neutral-500" />
                        <h2
                            id="filter-drawer-title"
                            className="text-lg font-semibold text-neutral-900 dark:text-white"
                        >
                            {title}
                        </h2>
                        {activeFiltersCount > 0 && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded-full">
                                {activeFiltersCount}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors touch-target"
                        aria-label="Close filters"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(85vh-140px)] overscroll-contain">
                    <div className="p-4 space-y-4">
                        {children}
                    </div>
                </div>

                {/* Footer with actions */}
                {(showClearButton || showApplyButton) && (
                    <div className="flex items-center gap-3 px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 safe-area-bottom">
                        {showClearButton && (
                            <button
                                onClick={handleClear}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors touch-target font-medium"
                            >
                                <RotateCcw size={16} />
                                <span>Clear All</span>
                            </button>
                        )}
                        {showApplyButton && (
                            <button
                                onClick={handleApply}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors touch-target font-medium shadow-sm"
                            >
                                <Check size={16} />
                                <span>Apply</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    // Use portal to render drawer at document body level
    return createPortal(drawerContent, document.body);
}

/**
 * Filter trigger button for mobile - shows filter icon with active count badge
 */
export interface FilterTriggerButtonProps {
    /** Click handler to open filter drawer */
    onClick: () => void;
    /** Number of active filters */
    activeFiltersCount?: number;
    /** Button label */
    label?: string;
    /** Show label text (set false for icon-only) */
    showLabel?: boolean;
    /** Additional CSS classes */
    className?: string;
}

export function FilterTriggerButton({
    onClick,
    activeFiltersCount = 0,
    label = 'Filters',
    showLabel = true,
    className = '',
}: FilterTriggerButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`
        relative inline-flex items-center gap-2 
        px-3 py-2 
        bg-white dark:bg-neutral-800 
        border border-neutral-200 dark:border-neutral-700 
        hover:bg-neutral-50 dark:hover:bg-neutral-700 
        rounded-lg transition-colors touch-target
        text-neutral-700 dark:text-neutral-300
        font-medium text-sm
        ${className}
      `}
        >
            <SlidersHorizontal size={18} />
            {showLabel && <span>{label}</span>}
            {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 flex items-center justify-center px-1.5 text-xs font-semibold bg-primary-500 text-white rounded-full">
                    {activeFiltersCount}
                </span>
            )}
        </button>
    );
}

/**
 * Hook to manage mobile filter drawer state
 */
export function useMobileFilterDrawer() {
    const [isOpen, setIsOpen] = useState(false);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

    return {
        isOpen,
        open,
        close,
        toggle,
    };
}

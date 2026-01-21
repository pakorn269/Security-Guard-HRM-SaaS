import React, { useState, useEffect } from 'react';
import MobileFilterDrawer, { FilterTriggerButton } from './MobileFilterDrawer';

export interface ResponsiveFiltersProps {
    /** Filter controls to render */
    children: React.ReactNode;
    /** Mobile breakpoint in pixels (default: 768) */
    mobileBreakpoint?: number;
    /** Title for mobile drawer */
    title?: string;
    /** Number of active filters */
    activeFiltersCount?: number;
    /** Callback when apply is clicked (mobile only) */
    onApply?: () => void;
    /** Callback when clear all is clicked */
    onClear?: () => void;
    /** Show inline on desktop */
    desktopClassName?: string;
    /** Additional class for the container */
    className?: string;
}

/**
 * ResponsiveFilters - Automatically switches between inline filters on desktop
 * and a slide-up drawer on mobile devices.
 * 
 * Usage:
 * ```tsx
 * <ResponsiveFilters 
 *   activeFiltersCount={2} 
 *   onClear={() => clearFilters()}
 * >
 *   <Select ... />
 *   <DatePicker ... />
 *   <Input type="search" ... />
 * </ResponsiveFilters>
 * ```
 */
export default function ResponsiveFilters({
    children,
    mobileBreakpoint = 768,
    title = 'Filters',
    activeFiltersCount = 0,
    onApply,
    onClear,
    desktopClassName = 'flex flex-wrap items-center gap-3',
    className = '',
}: ResponsiveFiltersProps) {
    const [isMobile, setIsMobile] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Check viewport on mount and resize
    useEffect(() => {
        const checkViewport = () => {
            setIsMobile(window.innerWidth < mobileBreakpoint);
        };

        checkViewport();
        window.addEventListener('resize', checkViewport);
        return () => window.removeEventListener('resize', checkViewport);
    }, [mobileBreakpoint]);

    // Close drawer when switching to desktop
    useEffect(() => {
        if (!isMobile && drawerOpen) {
            setDrawerOpen(false);
        }
    }, [isMobile, drawerOpen]);

    // Mobile: Show filter button + drawer
    if (isMobile) {
        return (
            <>
                <FilterTriggerButton
                    onClick={() => setDrawerOpen(true)}
                    activeFiltersCount={activeFiltersCount}
                    className={className}
                />
                <MobileFilterDrawer
                    isOpen={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    title={title}
                    activeFiltersCount={activeFiltersCount}
                    onApply={onApply}
                    onClear={onClear}
                >
                    {/* Stack filters vertically on mobile */}
                    <div className="space-y-4">
                        {children}
                    </div>
                </MobileFilterDrawer>
            </>
        );
    }

    // Desktop: Show inline filters
    return (
        <div className={`${desktopClassName} ${className}`}>
            {children}
        </div>
    );
}

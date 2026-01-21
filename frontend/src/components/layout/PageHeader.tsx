import React from 'react';
import Breadcrumb, { type BreadcrumbItem } from './Breadcrumb';

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Page description/subtitle */
  description?: string;
  /** Breadcrumb items (excluding home) */
  breadcrumbs?: BreadcrumbItem[];
  /** Show breadcrumbs */
  showBreadcrumbs?: boolean;
  /** Action buttons or elements to show on the right */
  actions?: React.ReactNode;
  /** Content to show below the title (e.g., tabs) */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Make actions full width on mobile */
  mobileActionsFullWidth?: boolean;
  /** Hide description on mobile to save space */
  hideDescriptionOnMobile?: boolean;
}

export default function PageHeader({
  title,
  description,
  breadcrumbs = [],
  showBreadcrumbs = true,
  actions,
  children,
  className = '',
  mobileActionsFullWidth = false,
  hideDescriptionOnMobile = false,
}: PageHeaderProps) {
  return (
    <div className={`mb-4 sm:mb-6 ${className}`}>
      {/* Breadcrumbs - hidden on mobile */}
      {showBreadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} className="mb-3 hidden sm:flex" />
      )}

      {/* Title row - stacks on mobile */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-white truncate sm:text-xl lg:text-2xl">
            {title}
          </h1>
          {description && (
            <p
              className={`
                mt-0.5 text-sm text-neutral-500 dark:text-neutral-400 
                ${hideDescriptionOnMobile ? 'hidden sm:block' : ''}
              `}
            >
              {description}
            </p>
          )}
        </div>

        {/* Actions - responsive layout */}
        {actions && (
          <div
            className={`
              flex items-center gap-2 flex-shrink-0
              ${mobileActionsFullWidth ? 'w-full sm:w-auto' : ''}
              overflow-x-auto sm:overflow-visible
              -mx-1 px-1 sm:mx-0 sm:px-0
              pb-1 sm:pb-0
              scrollbar-hide
            `}
          >
            <div className={`flex items-center gap-2 ${mobileActionsFullWidth ? 'w-full justify-stretch [&>*]:flex-1' : ''}`}>
              {actions}
            </div>
          </div>
        )}
      </div>

      {/* Additional content (tabs, filters, etc.) */}
      {children && <div className="mt-3 sm:mt-4">{children}</div>}
    </div>
  );
}

export type { PageHeaderProps };

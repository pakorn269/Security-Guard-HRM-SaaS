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
}

export default function PageHeader({
  title,
  description,
  breadcrumbs = [],
  showBreadcrumbs = true,
  actions,
  children,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`mb-6 ${className}`}>
      {/* Breadcrumbs */}
      {showBreadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} className="mb-3" />
      )}

      {/* Title row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white truncate sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Additional content (tabs, filters, etc.) */}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export type { PageHeaderProps };

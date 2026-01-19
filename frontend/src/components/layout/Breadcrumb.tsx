import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  /** Display label */
  label: string;
  /** Link path (optional - if not provided, item is not clickable) */
  href?: string;
  /** Icon to display before label */
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  /** Breadcrumb items */
  items: BreadcrumbItem[];
  /** Show home icon as first item */
  showHome?: boolean;
  /** Home link path */
  homePath?: string;
  /** Separator between items */
  separator?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export default function Breadcrumb({
  items,
  showHome = true,
  homePath = '/',
  separator,
  className = '',
}: BreadcrumbProps) {
  const allItems: BreadcrumbItem[] = showHome
    ? [{ label: 'Home', href: homePath, icon: <Home size={14} /> }, ...items]
    : items;

  const separatorElement = separator || (
    <ChevronRight size={14} className="text-neutral-400" aria-hidden="true" />
  );

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center flex-wrap gap-1.5 text-sm">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const isClickable = !isLast && item.href;

          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <span className="flex items-center" aria-hidden="true">
                  {separatorElement}
                </span>
              )}
              {isClickable ? (
                <Link
                  to={item.href!}
                  className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                >
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className={`inline-flex items-center gap-1 ${
                    isLast
                      ? 'text-neutral-900 dark:text-white font-medium'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export type { BreadcrumbProps, BreadcrumbItem };

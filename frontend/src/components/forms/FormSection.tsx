import React from 'react';

interface FormSectionProps {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Form fields */
  children: React.ReactNode;
  /** Show divider above section */
  divider?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export default function FormSection({
  title,
  description,
  children,
  divider = false,
  className = '',
}: FormSectionProps) {
  return (
    <div
      className={`
        ${divider ? 'pt-6 border-t border-neutral-200 dark:border-neutral-800' : ''}
        ${className}
      `}
    >
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// Form Grid for multi-column layouts
interface FormGridProps {
  /** Grid columns */
  columns?: 1 | 2 | 3 | 4;
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg';
  /** Form fields */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function FormGrid({ columns = 2, gap = 'md', children, className = '' }: FormGridProps) {
  const colClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  const gapClasses: Record<string, string> = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div className={`grid ${colClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}

// Form Actions for submit/cancel buttons
interface FormActionsProps {
  /** Action buttons */
  children: React.ReactNode;
  /** Alignment */
  align?: 'left' | 'center' | 'right' | 'between';
  /** Show divider above */
  divider?: boolean;
  /** Sticky to bottom */
  sticky?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function FormActions({
  children,
  align = 'right',
  divider = true,
  sticky = false,
  className = '',
}: FormActionsProps) {
  const alignClasses: Record<string, string> = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={`
        flex items-center gap-3 pt-6
        ${divider ? 'border-t border-neutral-200 dark:border-neutral-800 mt-6' : ''}
        ${alignClasses[align]}
        ${sticky ? 'sticky bottom-0 bg-white dark:bg-neutral-900 pb-4 -mb-4' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Full Form wrapper
interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  /** Form content */
  children: React.ReactNode;
  /** Spacing between sections */
  spacing?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

export function Form({ children, spacing = 'md', className = '', ...props }: FormProps) {
  const spacingClasses: Record<string, string> = {
    sm: 'space-y-4',
    md: 'space-y-6',
    lg: 'space-y-8',
  };

  return (
    <form className={`${spacingClasses[spacing]} ${className}`} {...props}>
      {children}
    </form>
  );
}

export type { FormSectionProps, FormGridProps, FormActionsProps, FormProps };

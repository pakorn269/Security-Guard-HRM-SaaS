import React, { useId } from 'react';

interface FormFieldProps {
  /** Field label */
  label?: string;
  /** Field content (input, select, etc.) */
  children: React.ReactNode;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Required field indicator */
  required?: boolean;
  /** Optional label text */
  optionalText?: string;
  /** Label position */
  labelPosition?: 'top' | 'left' | 'hidden';
  /** Label width for horizontal layout */
  labelWidth?: string;
  /** Additional CSS classes */
  className?: string;
}

export default function FormField({
  label,
  children,
  error,
  helperText,
  required = false,
  optionalText = 'Optional',
  labelPosition = 'top',
  labelWidth = 'w-1/3',
  className = '',
}: FormFieldProps) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  const helperId = helperText && !error ? `${id}-helper` : undefined;

  const labelElement = label && labelPosition !== 'hidden' && (
    <label
      htmlFor={id}
      className={`
        block text-sm font-medium text-neutral-700 dark:text-neutral-300
        ${labelPosition === 'top' ? 'mb-1.5' : 'pt-2'}
        ${labelPosition === 'left' ? labelWidth + ' flex-shrink-0' : ''}
      `}
    >
      {label}
      {required && <span className="text-error-500 ml-0.5">*</span>}
      {!required && optionalText && (
        <span className="text-neutral-400 dark:text-neutral-500 ml-1 font-normal">
          ({optionalText})
        </span>
      )}
    </label>
  );

  // Clone child to pass id, error state, and aria attributes
  const childWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        id,
        error: error || undefined,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': errorId || helperId || undefined,
      } as React.HTMLAttributes<HTMLElement>);
    }
    return child;
  });

  const content = (
    <>
      <div className="flex-1 min-w-0">{childWithProps}</div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-error-600 dark:text-error-400" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
          {helperText}
        </p>
      )}
    </>
  );

  if (labelPosition === 'left') {
    return (
      <div className={`flex gap-4 ${className}`}>
        {labelElement}
        <div className="flex-1">{content}</div>
      </div>
    );
  }

  return (
    <div className={className}>
      {labelElement}
      {content}
    </div>
  );
}

// Horizontal Form Field for inline forms
interface InlineFormFieldProps {
  /** Field label */
  label: string;
  /** Field content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function InlineFormField({ label, children, className = '' }: InlineFormFieldProps) {
  const id = useId();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label
        htmlFor={id}
        className="text-sm font-medium text-neutral-700 dark:text-neutral-300 whitespace-nowrap"
      >
        {label}
      </label>
      {React.Children.map(children, (child) =>
        React.isValidElement(child) ? React.cloneElement(child, { id } as React.HTMLAttributes<HTMLElement>) : child
      )}
    </div>
  );
}

export type { FormFieldProps, InlineFormFieldProps };

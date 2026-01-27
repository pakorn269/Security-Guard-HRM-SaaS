import React, { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';

type SelectSize = 'sm' | 'md' | 'lg';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Label text */
  label?: string;
  /** Error message */
  error?: string;
  /** Helper text shown below select */
  helperText?: string;
  /** Options to display */
  options: SelectOption[];
  /** Placeholder text */
  placeholder?: string;
  /** Size of the select */
  size?: SelectSize;
  /** Make select full width */
  fullWidth?: boolean;
  /** Disable the select */
  isDisabled?: boolean;
}

const sizeClasses: Record<SelectSize, string> = {
  sm: 'h-8 pl-2.5 pr-8 text-[13px]',
  md: 'h-10 pl-3 pr-10 text-sm',
  lg: 'h-12 pl-3.5 pr-11 text-base',
};

const iconSizes: Record<SelectSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
      size = 'md',
      fullWidth = true,
      isDisabled = false,
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = error ? `${selectId}-error` : undefined;
    const helperId = helperText && !error ? `${selectId}-helper` : undefined;

    const isSelectDisabled = disabled || isDisabled;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={isSelectDisabled}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={errorId || helperId}
            className={`
              appearance-none
              block w-full rounded
              bg-white dark:bg-neutral-900
              text-neutral-900 dark:text-neutral-100
              border transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-offset-0
              disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed
              ${
                error
                  ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20'
                  : 'border-neutral-300 dark:border-neutral-700 focus:border-primary-500 focus:ring-primary-500/20'
              }
              ${sizeClasses[size]}
              ${className}
            `}
            {...props}
          >
            {placeholder && !options.some(opt => opt.value === '') && (
              <option value="" disabled className="text-neutral-400">
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
            <ChevronDown size={iconSizes[size]} />
          </div>
        </div>
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
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
export type { SelectProps, SelectOption, SelectSize };

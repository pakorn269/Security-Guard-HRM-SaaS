import React, { forwardRef, useId } from 'react';

type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text */
  label?: string;
  /** Error message */
  error?: string;
  /** Helper text shown below input */
  helperText?: string;
  /** Icon to show on the left */
  leftIcon?: React.ReactNode;
  /** Icon to show on the right */
  rightIcon?: React.ReactNode;
  /** Size of the input */
  size?: InputSize;
  /** Make input full width */
  fullWidth?: boolean;
  /** Disable the input */
  isDisabled?: boolean;
  /** Make input read-only */
  isReadOnly?: boolean;
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'h-8 px-2.5 text-[13px]',
  md: 'h-10 px-3 text-sm',
  lg: 'h-12 px-3.5 text-base',
};

const iconPadding: Record<InputSize, { left: string; right: string }> = {
  sm: { left: 'pl-8', right: 'pr-8' },
  md: { left: 'pl-10', right: 'pr-10' },
  lg: { left: 'pl-11', right: 'pr-11' },
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      size = 'md',
      fullWidth = true,
      isDisabled = false,
      isReadOnly = false,
      className = '',
      id,
      disabled,
      readOnly,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText && !error ? `${inputId}-helper` : undefined;

    const isInputDisabled = disabled || isDisabled;
    const isInputReadOnly = readOnly || isReadOnly;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={isInputDisabled}
            readOnly={isInputReadOnly}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={errorId || helperId}
            className={`
              block w-full rounded
              bg-white dark:bg-neutral-900
              text-neutral-900 dark:text-neutral-100
              placeholder:text-neutral-400 dark:placeholder:text-neutral-500
              border transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-offset-0
              disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed
              read-only:bg-neutral-50 dark:read-only:bg-neutral-800
              ${
                error
                  ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20'
                  : 'border-neutral-300 dark:border-neutral-700 focus:border-primary-500 focus:ring-primary-500/20'
              }
              ${sizeClasses[size]}
              ${leftIcon ? iconPadding[size].left : ''}
              ${rightIcon ? iconPadding[size].right : ''}
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
              {rightIcon}
            </div>
          )}
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

Input.displayName = 'Input';

export default Input;
export type { InputProps, InputSize };

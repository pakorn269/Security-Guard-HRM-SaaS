import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Show loading spinner */
  isLoading?: boolean;
  /** Disable the button */
  isDisabled?: boolean;
  /** Icon to show on the left */
  leftIcon?: React.ReactNode;
  /** Icon to show on the right */
  rightIcon?: React.ReactNode;
  /** Make button full width */
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: `
    bg-primary-500 text-white
    hover:bg-primary-600
    active:bg-primary-700
  `,
  secondary: `
    bg-neutral-100 text-neutral-700
    hover:bg-neutral-200
    dark:bg-neutral-800 dark:text-neutral-200
    dark:hover:bg-neutral-700
  `,
  outline: `
    bg-transparent border border-primary-300 text-primary-600
    hover:bg-primary-50
    dark:border-primary-700 dark:text-primary-400
    dark:hover:bg-primary-950
  `,
  ghost: `
    bg-transparent text-neutral-600
    hover:bg-neutral-100
    dark:text-neutral-400
    dark:hover:bg-neutral-800
  `,
  danger: `
    bg-error-500 text-white
    hover:bg-error-600
    active:bg-error-700
  `,
  link: `
    bg-transparent text-primary-600 underline-offset-2
    hover:underline
    dark:text-primary-400
  `,
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
};

const iconSizes: Record<ButtonSize, number> = {
  sm: 14,
  md: 16,
  lg: 20,
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      isDisabled = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isButtonDisabled = disabled || isDisabled || isLoading;

    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center
          font-medium rounded
          transition-all duration-150 ease-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        disabled={isButtonDisabled}
        aria-disabled={isButtonDisabled}
        {...props}
      >
        {isLoading ? (
          <Loader2
            size={iconSizes[size]}
            className="animate-spin"
            aria-hidden="true"
          />
        ) : (
          leftIcon && (
            <span className="inline-flex shrink-0" aria-hidden="true">
              {leftIcon}
            </span>
          )
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
export type { ButtonProps, ButtonVariant, ButtonSize };

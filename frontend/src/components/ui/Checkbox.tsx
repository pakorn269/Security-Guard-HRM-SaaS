import React, { forwardRef, useId } from 'react';
import { Check, Minus } from 'lucide-react';

type CheckboxSize = 'sm' | 'md' | 'lg';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** Label text */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Error message */
  error?: string;
  /** Size of the checkbox */
  size?: CheckboxSize;
  /** Indeterminate state */
  indeterminate?: boolean;
  /** Disable the checkbox */
  isDisabled?: boolean;
}

const sizeClasses: Record<CheckboxSize, { box: string; icon: number; label: string }> = {
  sm: { box: 'w-4 h-4', icon: 12, label: 'text-sm' },
  md: { box: 'w-5 h-5', icon: 14, label: 'text-sm' },
  lg: { box: 'w-6 h-6', icon: 16, label: 'text-base' },
};

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      error,
      size = 'md',
      indeterminate = false,
      isDisabled = false,
      className = '',
      id,
      disabled,
      checked,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;
    const isCheckboxDisabled = disabled || isDisabled;
    const sizeConfig = sizeClasses[size];

    return (
      <div className={className}>
        <label
          htmlFor={checkboxId}
          className={`
            inline-flex items-start gap-3 cursor-pointer
            ${isCheckboxDisabled ? 'cursor-not-allowed opacity-50' : ''}
          `}
        >
          <div className="relative flex-shrink-0">
            <input
              ref={(el) => {
                if (typeof ref === 'function') ref(el);
                else if (ref) ref.current = el;
                if (el) el.indeterminate = indeterminate;
              }}
              type="checkbox"
              id={checkboxId}
              disabled={isCheckboxDisabled}
              checked={checked}
              className="peer sr-only"
              aria-invalid={error ? 'true' : undefined}
              {...props}
            />
            <div
              className={`
                ${sizeConfig.box}
                flex items-center justify-center
                rounded border-2 transition-all
                ${
                  error
                    ? 'border-error-500'
                    : 'border-neutral-300 dark:border-neutral-600'
                }
                peer-checked:border-primary-500 peer-checked:bg-primary-500
                peer-indeterminate:border-primary-500 peer-indeterminate:bg-primary-500
                peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/25 peer-focus-visible:ring-offset-2
                peer-disabled:opacity-50
              `}
            >
              {(checked || indeterminate) && (
                <span className="text-white">
                  {indeterminate ? (
                    <Minus size={sizeConfig.icon} strokeWidth={3} />
                  ) : (
                    <Check size={sizeConfig.icon} strokeWidth={3} />
                  )}
                </span>
              )}
            </div>
          </div>
          {(label || description) && (
            <div className="flex-1 min-w-0">
              {label && (
                <span
                  className={`
                    block font-medium text-neutral-700 dark:text-neutral-200
                    ${sizeConfig.label}
                  `}
                >
                  {label}
                </span>
              )}
              {description && (
                <span className="block text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {description}
                </span>
              )}
            </div>
          )}
        </label>
        {error && (
          <p className="mt-1.5 text-sm text-error-600 dark:text-error-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
export type { CheckboxProps, CheckboxSize };

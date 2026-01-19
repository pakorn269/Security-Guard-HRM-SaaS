import React, { forwardRef, useId } from 'react';

type SwitchSize = 'sm' | 'md' | 'lg';

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** Label text */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Error message */
  error?: string;
  /** Size of the switch */
  size?: SwitchSize;
  /** Disable the switch */
  isDisabled?: boolean;
  /** Position of the label */
  labelPosition?: 'left' | 'right';
}

const sizeClasses: Record<SwitchSize, { track: string; thumb: string; translate: string; label: string }> = {
  sm: {
    track: 'w-8 h-4',
    thumb: 'w-3 h-3',
    translate: 'translate-x-4',
    label: 'text-sm',
  },
  md: {
    track: 'w-10 h-5',
    thumb: 'w-4 h-4',
    translate: 'translate-x-5',
    label: 'text-sm',
  },
  lg: {
    track: 'w-12 h-6',
    thumb: 'w-5 h-5',
    translate: 'translate-x-6',
    label: 'text-base',
  },
};

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      label,
      description,
      error,
      size = 'md',
      isDisabled = false,
      labelPosition = 'right',
      className = '',
      id,
      disabled,
      checked,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const switchId = id || generatedId;
    const isSwitchDisabled = disabled || isDisabled;
    const sizeConfig = sizeClasses[size];

    const switchElement = (
      <div className="relative flex-shrink-0">
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          id={switchId}
          disabled={isSwitchDisabled}
          checked={checked}
          className="peer sr-only"
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        {/* Track */}
        <div
          className={`
            ${sizeConfig.track}
            rounded-full transition-colors
            bg-neutral-300 dark:bg-neutral-600
            peer-checked:bg-primary-500
            peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/25 peer-focus-visible:ring-offset-2
            peer-disabled:opacity-50
            ${error ? 'ring-2 ring-error-500/25' : ''}
          `}
        />
        {/* Thumb */}
        <div
          className={`
            absolute top-0.5 left-0.5
            ${sizeConfig.thumb}
            rounded-full bg-white shadow-sm
            transition-transform
            peer-checked:${sizeConfig.translate}
          `}
          style={{
            transform: checked ? sizeConfig.translate.replace('translate-x-', 'translateX(') + 'rem)' : 'translateX(0)',
          }}
        />
      </div>
    );

    const labelElement = (label || description) && (
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
    );

    return (
      <div className={className}>
        <label
          htmlFor={switchId}
          className={`
            inline-flex items-start gap-3 cursor-pointer
            ${isSwitchDisabled ? 'cursor-not-allowed opacity-50' : ''}
          `}
        >
          {labelPosition === 'left' ? (
            <>
              {labelElement}
              {switchElement}
            </>
          ) : (
            <>
              {switchElement}
              {labelElement}
            </>
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

Switch.displayName = 'Switch';

export default Switch;
export type { SwitchProps, SwitchSize };

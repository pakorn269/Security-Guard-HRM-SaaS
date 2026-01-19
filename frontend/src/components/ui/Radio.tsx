import React, { forwardRef, useId, createContext, useContext } from 'react';

type RadioSize = 'sm' | 'md' | 'lg';

interface RadioGroupContextValue {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  size: RadioSize;
  isDisabled: boolean;
  error?: string;
}

const RadioGroupContext = createContext<RadioGroupContextValue | undefined>(undefined);

interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** Label text */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Size of the radio */
  size?: RadioSize;
  /** Disable the radio */
  isDisabled?: boolean;
  /** Error state (from group) */
  error?: string;
}

const sizeClasses: Record<RadioSize, { box: string; dot: string; label: string }> = {
  sm: { box: 'w-4 h-4', dot: 'w-1.5 h-1.5', label: 'text-sm' },
  md: { box: 'w-5 h-5', dot: 'w-2 h-2', label: 'text-sm' },
  lg: { box: 'w-6 h-6', dot: 'w-2.5 h-2.5', label: 'text-base' },
};

const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      label,
      description,
      size: propSize,
      isDisabled: propIsDisabled = false,
      error: propError,
      className = '',
      id,
      disabled,
      name: propName,
      value,
      checked,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const radioId = id || generatedId;
    const groupContext = useContext(RadioGroupContext);

    const size = propSize || groupContext?.size || 'md';
    const isDisabled = disabled || propIsDisabled || groupContext?.isDisabled || false;
    const error = propError || groupContext?.error;
    const name = propName || groupContext?.name || '';
    const isChecked = groupContext ? groupContext.value === value : checked;
    const sizeConfig = sizeClasses[size];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (groupContext?.onChange && value) {
        groupContext.onChange(value);
      }
      onChange?.(e);
    };

    return (
      <div className={className}>
        <label
          htmlFor={radioId}
          className={`
            inline-flex items-start gap-3 cursor-pointer
            ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}
          `}
        >
          <div className="relative flex-shrink-0">
            <input
              ref={ref}
              type="radio"
              id={radioId}
              name={name}
              value={value}
              checked={isChecked}
              disabled={isDisabled}
              onChange={handleChange}
              className="peer sr-only"
              aria-invalid={error ? 'true' : undefined}
              {...props}
            />
            <div
              className={`
                ${sizeConfig.box}
                flex items-center justify-center
                rounded-full border-2 transition-all
                ${
                  error
                    ? 'border-error-500'
                    : 'border-neutral-300 dark:border-neutral-600'
                }
                peer-checked:border-primary-500
                peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/25 peer-focus-visible:ring-offset-2
                peer-disabled:opacity-50
              `}
            >
              <div
                className={`
                  ${sizeConfig.dot}
                  rounded-full bg-primary-500
                  scale-0 peer-checked:scale-100
                  transition-transform
                `}
              />
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
      </div>
    );
  }
);

Radio.displayName = 'Radio';

// Radio Group Component
interface RadioGroupProps {
  /** Group name for all radios */
  name: string;
  /** Current selected value */
  value?: string;
  /** Change handler */
  onChange?: (value: string) => void;
  /** Radio options */
  children: React.ReactNode;
  /** Label for the group */
  label?: string;
  /** Error message */
  error?: string;
  /** Size for all radios */
  size?: RadioSize;
  /** Disable all radios */
  isDisabled?: boolean;
  /** Layout direction */
  direction?: 'horizontal' | 'vertical';
  /** Additional CSS classes */
  className?: string;
}

function RadioGroup({
  name,
  value,
  onChange,
  children,
  label,
  error,
  size = 'md',
  isDisabled = false,
  direction = 'vertical',
  className = '',
}: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ name, value, onChange, size, isDisabled, error }}>
      <div className={className} role="radiogroup" aria-label={label}>
        {label && (
          <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {label}
          </span>
        )}
        <div
          className={`
            flex gap-3
            ${direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'}
          `}
        >
          {children}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-error-600 dark:text-error-400" role="alert">
            {error}
          </p>
        )}
      </div>
    </RadioGroupContext.Provider>
  );
}

export default Radio;
export { RadioGroup };
export type { RadioProps, RadioGroupProps, RadioSize };

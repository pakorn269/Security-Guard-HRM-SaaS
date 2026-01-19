import { forwardRef, useId } from 'react';
import { Calendar } from 'lucide-react';

type DateInputSize = 'sm' | 'md' | 'lg';
type DateInputType = 'date' | 'datetime-local' | 'time' | 'month' | 'week';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
    /** Input type */
    type?: DateInputType;
    /** Label text */
    label?: string;
    /** Error message */
    error?: string;
    /** Helper text */
    helperText?: string;
    /** Size variant */
    size?: DateInputSize;
    /** Required field */
    required?: boolean;
    /** Show calendar icon */
    showIcon?: boolean;
}

const sizeClasses: Record<DateInputSize, { input: string; icon: number; padding: string }> = {
    sm: { input: 'h-8 text-sm', icon: 14, padding: 'px-3 pr-9' },
    md: { input: 'h-10 text-sm', icon: 16, padding: 'px-3.5 pr-10' },
    lg: { input: 'h-12 text-base', icon: 18, padding: 'px-4 pr-12' },
};

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
    (
        {
            type = 'date',
            label,
            error,
            helperText,
            size = 'md',
            required = false,
            showIcon = true,
            className = '',
            id,
            ...props
        },
        ref
    ) => {
        const generatedId = useId();
        const inputId = id || generatedId;
        const errorId = error ? `${inputId}-error` : undefined;
        const helperId = helperText && !error ? `${inputId}-helper` : undefined;
        const sizeConfig = sizeClasses[size];

        return (
            <div className={className}>
                {/* Label */}
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                    >
                        {label}
                        {required && <span className="text-error-500 ml-0.5">*</span>}
                    </label>
                )}

                {/* Input wrapper */}
                <div className="relative">
                    <input
                        ref={ref}
                        type={type}
                        id={inputId}
                        aria-invalid={error ? 'true' : undefined}
                        aria-describedby={errorId || helperId || undefined}
                        className={`
              block w-full rounded-md
              bg-white dark:bg-neutral-900
              text-neutral-900 dark:text-neutral-100
              border transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
              disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed disabled:text-neutral-500
              ${sizeConfig.input}
              ${sizeConfig.padding}
              ${error
                                ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20'
                                : 'border-neutral-300 dark:border-neutral-700'
                            }
              [&::-webkit-calendar-picker-indicator]:opacity-0
              [&::-webkit-calendar-picker-indicator]:absolute
              [&::-webkit-calendar-picker-indicator]:inset-0
              [&::-webkit-calendar-picker-indicator]:w-full
              [&::-webkit-calendar-picker-indicator]:h-full
              [&::-webkit-calendar-picker-indicator]:cursor-pointer
            `}
                        {...props}
                    />

                    {/* Calendar icon */}
                    {showIcon && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <Calendar
                                size={sizeConfig.icon}
                                className="text-neutral-400 dark:text-neutral-500"
                            />
                        </div>
                    )}
                </div>

                {/* Error text */}
                {error && (
                    <p id={errorId} className="mt-1.5 text-sm text-error-600 dark:text-error-400" role="alert">
                        {error}
                    </p>
                )}

                {/* Helper text */}
                {helperText && !error && (
                    <p id={helperId} className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

DateInput.displayName = 'DateInput';

export default DateInput;
export type { DateInputProps, DateInputSize, DateInputType };

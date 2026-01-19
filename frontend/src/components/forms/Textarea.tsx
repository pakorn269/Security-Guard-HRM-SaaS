import { forwardRef, useId } from 'react';

type TextareaSize = 'sm' | 'md' | 'lg';

interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
    /** Label text */
    label?: string;
    /** Error message */
    error?: string;
    /** Helper text */
    helperText?: string;
    /** Size variant */
    size?: TextareaSize;
    /** Required field */
    required?: boolean;
    /** Resize behavior */
    resize?: 'none' | 'vertical' | 'horizontal' | 'both';
    /** Auto-grow based on content */
    autoGrow?: boolean;
    /** Max rows for auto-grow */
    maxRows?: number;
    /** Minimum rows */
    minRows?: number;
    /** Show character count */
    showCount?: boolean;
    /** Maximum characters */
    maxLength?: number;
}

const sizeClasses: Record<TextareaSize, string> = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-3.5 py-2.5 text-sm',
    lg: 'px-4 py-3 text-base',
};

const resizeClasses: Record<string, string> = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize',
};

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    (
        {
            label,
            error,
            helperText,
            size = 'md',
            required = false,
            resize = 'vertical',
            autoGrow = false,
            maxRows = 10,
            minRows = 3,
            showCount = false,
            maxLength,
            className = '',
            id,
            value,
            onChange,
            ...props
        },
        ref
    ) => {
        const generatedId = useId();
        const textareaId = id || generatedId;
        const errorId = error ? `${textareaId}-error` : undefined;
        const helperId = helperText && !error ? `${textareaId}-helper` : undefined;

        const characterCount = typeof value === 'string' ? value.length : 0;

        // Handle auto-grow
        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            if (autoGrow) {
                const textarea = e.target;
                textarea.style.height = 'auto';
                const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
                const maxHeight = lineHeight * maxRows;
                const minHeight = lineHeight * minRows;
                const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
                textarea.style.height = `${newHeight}px`;
            }
            onChange?.(e);
        };

        return (
            <div className={className}>
                {/* Label */}
                {label && (
                    <label
                        htmlFor={textareaId}
                        className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                    >
                        {label}
                        {required && <span className="text-error-500 ml-0.5">*</span>}
                    </label>
                )}

                {/* Textarea */}
                <textarea
                    ref={ref}
                    id={textareaId}
                    value={value}
                    onChange={handleChange}
                    maxLength={maxLength}
                    rows={minRows}
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={errorId || helperId || undefined}
                    className={`
            block w-full rounded-md
            bg-white dark:bg-neutral-900
            text-neutral-900 dark:text-neutral-100
            placeholder:text-neutral-400 dark:placeholder:text-neutral-500
            border transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
            disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed disabled:text-neutral-500
            ${sizeClasses[size]}
            ${autoGrow ? 'resize-none overflow-hidden' : resizeClasses[resize]}
            ${error
                            ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20'
                            : 'border-neutral-300 dark:border-neutral-700'
                        }
          `}
                    {...props}
                />

                {/* Bottom row: helper/error text and character count */}
                <div className="flex justify-between gap-2 mt-1.5">
                    <div className="flex-1">
                        {error && (
                            <p id={errorId} className="text-sm text-error-600 dark:text-error-400" role="alert">
                                {error}
                            </p>
                        )}
                        {helperText && !error && (
                            <p id={helperId} className="text-sm text-neutral-500 dark:text-neutral-400">
                                {helperText}
                            </p>
                        )}
                    </div>
                    {showCount && (
                        <span
                            className={`text-xs flex-shrink-0 ${maxLength && characterCount >= maxLength
                                    ? 'text-error-500'
                                    : 'text-neutral-400 dark:text-neutral-500'
                                }`}
                        >
                            {characterCount}
                            {maxLength && `/${maxLength}`}
                        </span>
                    )}
                </div>
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';

export default Textarea;
export type { TextareaProps, TextareaSize };

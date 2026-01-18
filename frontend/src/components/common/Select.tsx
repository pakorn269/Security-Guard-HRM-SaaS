import React, { forwardRef } from 'react';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    helperText?: string;
    options: SelectOption[];
    placeholder?: string;
    fullWidth?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            label,
            error,
            helperText,
            options,
            placeholder,
            fullWidth = true,
            className = '',
            id,
            ...props
        },
        ref
    ) => {
        const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

        return (
            <div className={`${fullWidth ? 'w-full' : ''}`}>
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        id={selectId}
                        className={`
                            appearance-none
                            block w-full rounded-xl border
                            px-4 py-2.5 pr-10
                            bg-white dark:bg-surface-800
                            text-surface-900 dark:text-white
                            transition-all duration-200
                            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                            disabled:bg-surface-100 dark:disabled:bg-surface-900 disabled:cursor-not-allowed
                            ${error ? 'border-red-500 focus:ring-red-500' : 'border-surface-300 dark:border-surface-600'}
                            ${className}
                        `}
                        {...props}
                    >
                        {placeholder && (
                            <option value="" disabled>
                                {placeholder}
                            </option>
                        )}
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-surface-400">
                        <svg
                            className="h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </div>
                </div>
                {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
                {helperText && !error && (
                    <p className="mt-1 text-sm text-surface-500">{helperText}</p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';

export default Select;

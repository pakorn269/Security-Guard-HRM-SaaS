import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        {
            label,
            error,
            helperText,
            leftIcon,
            rightIcon,
            fullWidth = true,
            className = '',
            id,
            ...props
        },
        ref
    ) => {
        const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

        return (
            <div className={`${fullWidth ? 'w-full' : ''}`}>
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        className={`
                            block w-full rounded-xl border
                            px-4 py-2.5
                            bg-white dark:bg-surface-800
                            text-surface-900 dark:text-white
                            placeholder-surface-400 dark:placeholder-surface-500
                            transition-all duration-200
                            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                            disabled:bg-surface-100 dark:disabled:bg-surface-900 disabled:cursor-not-allowed
                            ${error ? 'border-red-500 focus:ring-red-500' : 'border-surface-300 dark:border-surface-600'}
                            ${leftIcon ? 'pl-10' : ''}
                            ${rightIcon ? 'pr-10' : ''}
                            ${className}
                        `}
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-surface-400">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
                {helperText && !error && (
                    <p className="mt-1 text-sm text-surface-500">{helperText}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;

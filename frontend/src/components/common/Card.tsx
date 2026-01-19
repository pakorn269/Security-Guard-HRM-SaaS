import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
    onClick?: () => void;
    style?: React.CSSProperties;
    variant?: 'default' | 'bordered' | 'flat';
}

const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
};

const variantClasses = {
    default: 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-sm',
    bordered: 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700',
    flat: 'bg-transparent',
};

export default function Card({
    children,
    className = '',
    padding = 'md',
    hover = false,
    onClick,
    style,
    variant = 'default',
}: CardProps) {
    return (
        <div
            onClick={onClick}
            style={style}
            className={`
                rounded-xl
                ${variantClasses[variant]}
                ${paddingClasses[padding]}
                ${hover ? 'transition-all duration-200 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800 cursor-pointer' : ''}
                ${className}
            `}
        >
            {children}
        </div>
    );
}

// Card Header
interface CardHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
    return (
        <div className="flex items-start justify-between mb-4">
            <div>
                <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
                        {subtitle}
                    </p>
                )}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}

// Card Footer
interface CardFooterProps {
    children: React.ReactNode;
    className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
    return (
        <div
            className={`
                mt-4 pt-4
                border-t border-surface-200 dark:border-surface-700
                ${className}
            `}
        >
            {children}
        </div>
    );
}

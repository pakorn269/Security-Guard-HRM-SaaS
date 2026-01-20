import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
    onClick?: () => void;
    style?: React.CSSProperties;
    variant?: 'default' | 'bordered' | 'elevated';
}

const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
};

const variantClasses = {
    default: 'bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800',
    bordered: 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800',
    elevated: 'bg-white dark:bg-neutral-900 shadow-sm border border-neutral-100 dark:border-neutral-800',
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
                rounded-md
                ${variantClasses[variant]}
                ${paddingClasses[padding]}
                ${hover ? 'transition-all duration-200 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800 cursor-pointer' : ''}
                ${onClick ? 'cursor-pointer' : ''}
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
    className?: string;
}

export function CardHeader({ title, subtitle, action, className = '' }: CardHeaderProps) {
    return (
        <div className={`flex items-start justify-between mb-4 ${className}`}>
            <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {subtitle}
                    </p>
                )}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}

// Card Body
interface CardBodyProps {
    children: React.ReactNode;
    className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps) {
    return (
        <div className={`text-neutral-700 dark:text-neutral-300 ${className}`}>
            {children}
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
                border-t border-neutral-200 dark:border-neutral-800
                ${className}
            `}
        >
            {children}
        </div>
    );
}

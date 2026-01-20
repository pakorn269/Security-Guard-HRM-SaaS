// LoadingSpinner components

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
};

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
    return (
        <div
            className={`
                ${sizeClasses[size]}
                border-2 border-primary-200 dark:border-primary-800
                border-t-primary-500
                rounded-full
                animate-spin
                ${className}
            `}
        />
    );
}

// Full page loading spinner
export function PageLoader() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950">
            <div className="flex flex-col items-center gap-4">
                <LoadingSpinner size="lg" />
                <p className="text-neutral-500 animate-pulse">Loading...</p>
            </div>
        </div>
    );
}

// Skeleton loader for content placeholders
interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
    width?: string | number;
    height?: string | number;
    /** Animation style */
    animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
    className = '',
    variant = 'text',
    width,
    height,
    animation = 'pulse',
}: SkeletonProps) {
    const variantClasses = {
        text: 'h-4 rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-none',
        rounded: 'rounded-md',
    };

    const animationClasses = {
        pulse: 'animate-pulse',
        wave: 'animate-shimmer bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-800 dark:via-neutral-700 dark:to-neutral-800 bg-[length:200%_100%]',
        none: '',
    };

    const baseClasses = animation !== 'wave'
        ? 'bg-neutral-200 dark:bg-neutral-700'
        : '';

    return (
        <div
            className={`
                ${baseClasses}
                ${animationClasses[animation]}
                ${variantClasses[variant]}
                ${className}
            `}
            style={{
                width: typeof width === 'number' ? `${width}px` : width,
                height: typeof height === 'number' ? `${height}px` : height,
            }}
        />
    );
}

// Skeleton Text - multiple lines of text
interface SkeletonTextProps {
    lines?: number;
    lastLineWidth?: string;
    className?: string;
}

export function SkeletonText({
    lines = 3,
    lastLineWidth = '60%',
    className = ''
}: SkeletonTextProps) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    variant="text"
                    width={i === lines - 1 ? lastLineWidth : '100%'}
                />
            ))}
        </div>
    );
}

// Skeleton Avatar
interface SkeletonAvatarProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

export function SkeletonAvatar({ size = 'md', className = '' }: SkeletonAvatarProps) {
    const sizeMap = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16',
    };

    return (
        <Skeleton
            variant="circular"
            className={`${sizeMap[size]} ${className}`}
        />
    );
}

// Skeleton Card - common card loading pattern
interface SkeletonCardProps {
    /** Show avatar placeholder */
    showAvatar?: boolean;
    /** Number of text lines */
    lines?: number;
    /** Show action buttons */
    showActions?: boolean;
    className?: string;
}

export function SkeletonCard({
    showAvatar = true,
    lines = 2,
    showActions = false,
    className = ''
}: SkeletonCardProps) {
    return (
        <div className={`p-4 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 ${className}`}>
            {/* Header with avatar */}
            {showAvatar && (
                <div className="flex items-center gap-3 mb-4">
                    <SkeletonAvatar size="md" />
                    <div className="flex-1 space-y-2">
                        <Skeleton variant="text" width="40%" />
                        <Skeleton variant="text" width="25%" height={12} />
                    </div>
                </div>
            )}

            {/* Content lines */}
            <SkeletonText lines={lines} />

            {/* Actions */}
            {showActions && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <Skeleton variant="rounded" width={80} height={32} />
                    <Skeleton variant="rounded" width={80} height={32} />
                </div>
            )}
        </div>
    );
}

// Skeleton Table Row
interface SkeletonTableRowProps {
    columns?: number;
    className?: string;
}

export function SkeletonTableRow({ columns = 4, className = '' }: SkeletonTableRowProps) {
    return (
        <div className={`flex items-center gap-4 px-4 py-3 ${className}`}>
            {Array.from({ length: columns }).map((_, i) => (
                <Skeleton
                    key={i}
                    variant="text"
                    className="flex-1"
                    width={i === 0 ? '60%' : '100%'}
                />
            ))}
        </div>
    );
}

// Skeleton Table
interface SkeletonTableProps {
    rows?: number;
    columns?: number;
    showHeader?: boolean;
    className?: string;
}

export function SkeletonTable({
    rows = 5,
    columns = 4,
    showHeader = true,
    className = ''
}: SkeletonTableProps) {
    return (
        <div className={`rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden ${className}`}>
            {showHeader && (
                <div className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                    <SkeletonTableRow columns={columns} />
                </div>
            )}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {Array.from({ length: rows }).map((_, i) => (
                    <SkeletonTableRow key={i} columns={columns} />
                ))}
            </div>
        </div>
    );
}


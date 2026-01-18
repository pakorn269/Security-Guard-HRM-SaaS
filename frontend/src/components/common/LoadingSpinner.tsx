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
        <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-surface-950">
            <div className="flex flex-col items-center gap-4">
                <LoadingSpinner size="lg" />
                <p className="text-surface-500 animate-pulse">Loading...</p>
            </div>
        </div>
    );
}

// Skeleton loader for content placeholders
interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string;
    height?: string;
}

export function Skeleton({
    className = '',
    variant = 'text',
    width,
    height,
}: SkeletonProps) {
    const variantClasses = {
        text: 'h-4 rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-lg',
    };

    return (
        <div
            className={`
                bg-surface-200 dark:bg-surface-700
                animate-pulse
                ${variantClasses[variant]}
                ${className}
            `}
            style={{ width, height }}
        />
    );
}

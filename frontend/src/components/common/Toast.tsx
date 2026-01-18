import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
    onClose: (id: string) => void;
}

const typeStyles: Record<ToastType, { bg: string; icon: string; iconBg: string }> = {
    success: {
        bg: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
        icon: '✓',
        iconBg: 'bg-green-500',
    },
    error: {
        bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
        icon: '✕',
        iconBg: 'bg-red-500',
    },
    warning: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
        icon: '!',
        iconBg: 'bg-yellow-500',
    },
    info: {
        bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
        icon: 'i',
        iconBg: 'bg-blue-500',
    },
};

function Toast({ id, type, message, duration = 5000, onClose }: ToastProps) {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose(id);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [id, duration, onClose]);

    const styles = typeStyles[type];

    return (
        <div
            className={`
                flex items-center gap-3 p-4
                rounded-xl border shadow-lg
                animate-slide-in
                ${styles.bg}
            `}
        >
            <div
                className={`
                    flex-shrink-0 w-6 h-6
                    rounded-full
                    flex items-center justify-center
                    text-white text-sm font-bold
                    ${styles.iconBg}
                `}
            >
                {styles.icon}
            </div>
            <p className="flex-1 text-sm text-surface-700 dark:text-surface-200">
                {message}
            </p>
            <button
                onClick={() => onClose(id)}
                className="flex-shrink-0 p-1 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
            </button>
        </div>
    );
}

// Toast Container
interface ToastItem {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContainerProps {
    toasts: ToastItem[];
    onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
    return createPortal(
        <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full">
            {toasts.map((toast) => (
                <Toast key={toast.id} {...toast} onClose={onClose} />
            ))}
        </div>,
        document.body
    );
}

// Toast Hook
export function useToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const addToast = (type: ToastType, message: string, duration?: number) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setToasts((prev) => [...prev, { id, type, message, duration }]);
        return id;
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    const success = (message: string, duration?: number) => addToast('success', message, duration);
    const error = (message: string, duration?: number) => addToast('error', message, duration);
    const warning = (message: string, duration?: number) => addToast('warning', message, duration);
    const info = (message: string, duration?: number) => addToast('info', message, duration);

    return {
        toasts,
        addToast,
        removeToast,
        success,
        error,
        warning,
        info,
    };
}

export default Toast;

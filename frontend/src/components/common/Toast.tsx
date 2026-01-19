import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
    onClose: (id: string) => void;
}

const typeStyles: Record<ToastType, {
    bg: string;
    Icon: typeof Info;
    iconColor: string;
}> = {
    success: {
        bg: 'bg-success-50 dark:bg-success-900/30 border-success-200 dark:border-success-800',
        Icon: CheckCircle,
        iconColor: 'text-success-500',
    },
    error: {
        bg: 'bg-error-50 dark:bg-error-900/30 border-error-200 dark:border-error-800',
        Icon: XCircle,
        iconColor: 'text-error-500',
    },
    warning: {
        bg: 'bg-warning-50 dark:bg-warning-900/30 border-warning-200 dark:border-warning-800',
        Icon: AlertTriangle,
        iconColor: 'text-warning-500',
    },
    info: {
        bg: 'bg-info-50 dark:bg-info-900/30 border-info-200 dark:border-info-800',
        Icon: Info,
        iconColor: 'text-info-500',
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
    const IconComponent = styles.Icon;

    return (
        <div
            className={`
                flex items-center gap-3 p-4
                rounded-md border shadow-lg
                animate-slide-in
                ${styles.bg}
            `}
        >
            <div className="flex-shrink-0">
                <IconComponent size={20} className={styles.iconColor} />
            </div>
            <p className="flex-1 text-sm text-neutral-700 dark:text-neutral-200">
                {message}
            </p>
            <button
                onClick={() => onClose(id)}
                className="flex-shrink-0 p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
            >
                <X size={16} />
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

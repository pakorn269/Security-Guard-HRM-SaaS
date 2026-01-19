import React from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';
type AlertSize = 'sm' | 'md' | 'lg';

interface AlertProps {
  /** Alert message/content */
  children: React.ReactNode;
  /** Alert title */
  title?: string;
  /** Visual variant */
  variant?: AlertVariant;
  /** Size variant */
  size?: AlertSize;
  /** Custom icon (overrides variant icon) */
  icon?: React.ReactNode;
  /** Show icon */
  showIcon?: boolean;
  /** Dismissible alert */
  dismissible?: boolean;
  /** Dismiss callback */
  onDismiss?: () => void;
  /** Action buttons */
  actions?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const variantConfig: Record<
  AlertVariant,
  { icon: typeof Info; bg: string; border: string; text: string; iconColor: string }
> = {
  info: {
    icon: Info,
    bg: 'bg-info-50 dark:bg-info-950/30',
    border: 'border-info-200 dark:border-info-800',
    text: 'text-info-800 dark:text-info-200',
    iconColor: 'text-info-500',
  },
  success: {
    icon: CheckCircle,
    bg: 'bg-success-50 dark:bg-success-950/30',
    border: 'border-success-200 dark:border-success-800',
    text: 'text-success-800 dark:text-success-200',
    iconColor: 'text-success-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-warning-50 dark:bg-warning-950/30',
    border: 'border-warning-200 dark:border-warning-800',
    text: 'text-warning-800 dark:text-warning-200',
    iconColor: 'text-warning-500',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-error-50 dark:bg-error-950/30',
    border: 'border-error-200 dark:border-error-800',
    text: 'text-error-800 dark:text-error-200',
    iconColor: 'text-error-500',
  },
};

const sizeConfig: Record<AlertSize, { padding: string; text: string; title: string; icon: number }> = {
  sm: { padding: 'p-3', text: 'text-xs', title: 'text-sm', icon: 16 },
  md: { padding: 'p-4', text: 'text-sm', title: 'text-sm', icon: 20 },
  lg: { padding: 'p-5', text: 'text-base', title: 'text-base', icon: 24 },
};

export default function Alert({
  children,
  title,
  variant = 'info',
  size = 'md',
  icon,
  showIcon = true,
  dismissible = false,
  onDismiss,
  actions,
  className = '',
}: AlertProps) {
  const config = variantConfig[variant];
  const sizes = sizeConfig[size];
  const IconComponent = config.icon;

  return (
    <div
      role="alert"
      className={`
        ${sizes.padding}
        ${config.bg}
        border ${config.border}
        rounded-md
        ${className}
      `}
    >
      <div className="flex gap-3">
        {/* Icon */}
        {showIcon && (
          <div className="flex-shrink-0">
            {icon || <IconComponent size={sizes.icon} className={config.iconColor} />}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`${sizes.title} font-semibold ${config.text} mb-1`}>
              {title}
            </h3>
          )}
          <div className={`${sizes.text} ${config.text}`}>{children}</div>

          {/* Actions */}
          {actions && <div className="mt-3 flex gap-2">{actions}</div>}
        </div>

        {/* Dismiss button */}
        {dismissible && (
          <button
            type="button"
            onClick={onDismiss}
            className={`
              flex-shrink-0 p-1 rounded
              ${config.text}
              hover:bg-black/5 dark:hover:bg-white/5
              transition-colors
            `}
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// Inline Alert variant (no background)
interface InlineAlertProps {
  /** Alert message */
  children: React.ReactNode;
  /** Visual variant */
  variant?: AlertVariant;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

export function InlineAlert({
  children,
  variant = 'info',
  size = 'md',
  className = '',
}: InlineAlertProps) {
  const config = variantConfig[variant];
  const IconComponent = config.icon;
  const iconSize = size === 'sm' ? 14 : 16;
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <IconComponent size={iconSize} className={`${config.iconColor} flex-shrink-0 mt-0.5`} />
      <span className={`${textSize} ${config.text}`}>{children}</span>
    </div>
  );
}

export type { AlertProps, InlineAlertProps, AlertVariant, AlertSize };

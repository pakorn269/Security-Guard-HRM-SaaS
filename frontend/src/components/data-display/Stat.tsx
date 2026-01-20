import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type StatSize = 'sm' | 'md' | 'lg';
type TrendDirection = 'up' | 'down' | 'neutral';
type StatVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatProps {
  /** Stat label/title */
  label: string;
  /** Main stat value */
  value: string | number;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Previous value for comparison */
  previousValue?: number;
  /** Current value for trend calculation */
  currentValue?: number;
  /** Trend direction (auto-calculated if previousValue and currentValue provided) */
  trend?: TrendDirection;
  /** Trend percentage or text */
  trendValue?: string;
  /** Helper text below value */
  helpText?: string;
  /** Size variant */
  size?: StatSize;
  /** Color variant for icon background */
  variant?: StatVariant;
  /** Icon position */
  iconPosition?: 'left' | 'top';
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses: Record<StatSize, { label: string; value: string; trend: string; icon: string }> = {
  sm: {
    label: 'text-xs',
    value: 'text-xl',
    trend: 'text-xs',
    icon: 'w-8 h-8',
  },
  md: {
    label: 'text-sm',
    value: 'text-2xl',
    trend: 'text-sm',
    icon: 'w-10 h-10',
  },
  lg: {
    label: 'text-base',
    value: 'text-3xl',
    trend: 'text-sm',
    icon: 'w-12 h-12',
  },
};

function calculateTrend(current?: number, previous?: number): TrendDirection {
  if (current === undefined || previous === undefined || previous === 0) {
    return 'neutral';
  }
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'neutral';
}

function calculateTrendPercentage(current?: number, previous?: number): string | null {
  if (current === undefined || previous === undefined || previous === 0) {
    return null;
  }
  const percentage = ((current - previous) / previous) * 100;
  return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
}

export default function Stat({
  label,
  value,
  icon,
  previousValue,
  currentValue,
  trend: propTrend,
  trendValue: propTrendValue,
  helpText,
  size = 'md',
  variant = 'default',
  iconPosition = 'left',
  className = '',
}: StatProps) {
  const sizeConfig = sizeClasses[size];
  const trend = propTrend || calculateTrend(currentValue, previousValue);
  const trendValue = propTrendValue || calculateTrendPercentage(currentValue, previousValue);

  const trendColors: Record<TrendDirection, string> = {
    up: 'text-success-600 dark:text-success-400',
    down: 'text-error-600 dark:text-error-400',
    neutral: 'text-neutral-500 dark:text-neutral-400',
  };

  const iconVariantColors: Record<StatVariant, { bg: string; text: string }> = {
    default: { bg: 'bg-primary-100 dark:bg-primary-900/30', text: 'text-primary-600 dark:text-primary-400' },
    primary: { bg: 'bg-primary-100 dark:bg-primary-900/30', text: 'text-primary-600 dark:text-primary-400' },
    success: { bg: 'bg-success-100 dark:bg-success-900/30', text: 'text-success-600 dark:text-success-400' },
    warning: { bg: 'bg-warning-100 dark:bg-warning-900/30', text: 'text-warning-600 dark:text-warning-400' },
    error: { bg: 'bg-error-100 dark:bg-error-900/30', text: 'text-error-600 dark:text-error-400' },
    info: { bg: 'bg-info-100 dark:bg-info-900/30', text: 'text-info-600 dark:text-info-400' },
    neutral: { bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-600 dark:text-neutral-400' },
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const iconColors = iconVariantColors[variant];

  return (
    <div
      className={`
        ${iconPosition === 'top' ? '' : 'flex items-start gap-4'}
        ${className}
      `}
    >
      {/* Icon */}
      {icon && (
        <div
          className={`
            ${sizeConfig.icon}
            flex items-center justify-center flex-shrink-0
            rounded-lg
            ${iconColors.bg}
            ${iconColors.text}
            ${iconPosition === 'top' ? 'mb-3' : ''}
          `}
        >
          {icon}
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Label */}
        <p
          className={`
            ${sizeConfig.label}
            font-medium text-neutral-500 dark:text-neutral-400
            truncate
          `}
        >
          {label}
        </p>

        {/* Value row */}
        <div className="flex items-baseline gap-2 mt-1">
          <p
            className={`
              ${sizeConfig.value}
              font-semibold text-neutral-900 dark:text-white
            `}
          >
            {value}
          </p>

          {/* Trend */}
          {trendValue && (
            <span
              className={`
                inline-flex items-center gap-0.5
                ${sizeConfig.trend}
                font-medium
                ${trendColors[trend]}
              `}
            >
              <TrendIcon size={14} />
              {trendValue}
            </span>
          )}
        </div>

        {/* Help text */}
        {helpText && (
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {helpText}
          </p>
        )}
      </div>
    </div>
  );
}

// Stat Group for displaying multiple stats in a grid
interface StatGroupProps {
  /** Stat components */
  children: React.ReactNode;
  /** Number of columns */
  columns?: 1 | 2 | 3 | 4;
  /** Additional CSS classes */
  className?: string;
}

export function StatGroup({ children, columns = 4, className = '' }: StatGroupProps) {
  const colClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid gap-4 ${colClasses[columns]} ${className}`}>
      {children}
    </div>
  );
}

// Stat Card variant with background
interface StatCardProps extends StatProps {
  /** Card style variant */
  cardVariant?: 'default' | 'bordered' | 'elevated';
}

export function StatCard({ cardVariant = 'default', variant, className = '', ...props }: StatCardProps) {
  const cardVariantClasses: Record<string, string> = {
    default: 'bg-neutral-50 dark:bg-neutral-900',
    bordered: 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800',
    elevated: 'bg-white dark:bg-neutral-900 shadow-sm',
  };

  return (
    <div className={`rounded-md p-5 ${cardVariantClasses[cardVariant]} ${className}`}>
      <Stat {...props} variant={variant} />
    </div>
  );
}

export type { StatProps, StatGroupProps, StatCardProps, StatSize, TrendDirection };

import React from 'react';
import { Circle, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

type TimelineItemStatus = 'default' | 'completed' | 'error' | 'warning' | 'pending';
type TimelineSize = 'sm' | 'md' | 'lg';

interface TimelineItem {
  /** Unique identifier */
  id: string | number;
  /** Item title */
  title: string;
  /** Item description */
  description?: React.ReactNode;
  /** Timestamp or date string */
  timestamp?: string;
  /** Status of the item */
  status?: TimelineItemStatus;
  /** Custom icon (overrides status icon) */
  icon?: React.ReactNode;
  /** Additional content below description */
  content?: React.ReactNode;
}

interface TimelineProps {
  /** Timeline items */
  items: TimelineItem[];
  /** Size variant */
  size?: TimelineSize;
  /** Show line connecting items */
  showLine?: boolean;
  /** Reverse order (newest first) */
  reverse?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses: Record<TimelineSize, { icon: number; dot: string; title: string; desc: string }> = {
  sm: { icon: 14, dot: 'w-2 h-2', title: 'text-sm', desc: 'text-xs' },
  md: { icon: 16, dot: 'w-2.5 h-2.5', title: 'text-sm', desc: 'text-sm' },
  lg: { icon: 18, dot: 'w-3 h-3', title: 'text-base', desc: 'text-sm' },
};

const statusConfig: Record<
  TimelineItemStatus,
  { icon: typeof Circle; color: string; bg: string }
> = {
  default: {
    icon: Circle,
    color: 'text-neutral-400 dark:text-neutral-500',
    bg: 'bg-neutral-100 dark:bg-neutral-800',
  },
  completed: {
    icon: CheckCircle,
    color: 'text-success-500',
    bg: 'bg-success-100 dark:bg-success-900/30',
  },
  error: {
    icon: XCircle,
    color: 'text-error-500',
    bg: 'bg-error-100 dark:bg-error-900/30',
  },
  warning: {
    icon: AlertCircle,
    color: 'text-warning-500',
    bg: 'bg-warning-100 dark:bg-warning-900/30',
  },
  pending: {
    icon: Clock,
    color: 'text-primary-500',
    bg: 'bg-primary-100 dark:bg-primary-900/30',
  },
};

export default function Timeline({
  items,
  size = 'md',
  showLine = true,
  reverse = false,
  className = '',
}: TimelineProps) {
  const sizeConfig = sizeClasses[size];
  const displayItems = reverse ? [...items].reverse() : items;

  return (
    <div className={`relative ${className}`}>
      {/* Vertical line */}
      {showLine && items.length > 1 && (
        <div
          className="absolute left-3 top-3 bottom-3 w-0.5 bg-neutral-200 dark:bg-neutral-700"
          aria-hidden="true"
        />
      )}

      <div className="space-y-6">
        {displayItems.map((item, index) => {
          const status = item.status || 'default';
          const config = statusConfig[status];
          const IconComponent = config.icon;
          const isLast = index === displayItems.length - 1;

          return (
            <div key={item.id} className="relative flex gap-4">
              {/* Icon/dot */}
              <div
                className={`
                  relative z-10 flex-shrink-0
                  w-6 h-6 flex items-center justify-center
                  rounded-full
                  ${config.bg}
                `}
              >
                {item.icon || (
                  <IconComponent size={sizeConfig.icon} className={config.color} />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 min-w-0 ${!isLast ? 'pb-2' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`
                      ${sizeConfig.title}
                      font-medium text-neutral-900 dark:text-white
                    `}
                  >
                    {item.title}
                  </p>
                  {item.timestamp && (
                    <time
                      className={`
                        ${sizeConfig.desc}
                        text-neutral-500 dark:text-neutral-400
                        flex-shrink-0
                      `}
                    >
                      {item.timestamp}
                    </time>
                  )}
                </div>

                {item.description && (
                  <p
                    className={`
                      mt-1
                      ${sizeConfig.desc}
                      text-neutral-600 dark:text-neutral-400
                    `}
                  >
                    {item.description}
                  </p>
                )}

                {item.content && <div className="mt-2">{item.content}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Horizontal Timeline variant
interface HorizontalTimelineProps {
  /** Timeline items */
  items: TimelineItem[];
  /** Size variant */
  size?: TimelineSize;
  /** Additional CSS classes */
  className?: string;
}

export function HorizontalTimeline({
  items,
  size = 'md',
  className = '',
}: HorizontalTimelineProps) {
  const sizeConfig = sizeClasses[size];

  return (
    <div className={`relative ${className}`}>
      {/* Horizontal line */}
      <div
        className="absolute left-0 right-0 top-3 h-0.5 bg-neutral-200 dark:bg-neutral-700"
        aria-hidden="true"
      />

      <div className="relative flex justify-between">
        {items.map((item) => {
          const status = item.status || 'default';
          const config = statusConfig[status];
          const IconComponent = config.icon;

          return (
            <div key={item.id} className="flex flex-col items-center text-center">
              {/* Icon/dot */}
              <div
                className={`
                  relative z-10
                  w-6 h-6 flex items-center justify-center
                  rounded-full
                  ${config.bg}
                `}
              >
                {item.icon || (
                  <IconComponent size={sizeConfig.icon} className={config.color} />
                )}
              </div>

              {/* Content */}
              <div className="mt-2 max-w-[100px]">
                <p
                  className={`
                    ${sizeConfig.title}
                    font-medium text-neutral-900 dark:text-white
                  `}
                >
                  {item.title}
                </p>
                {item.timestamp && (
                  <time
                    className={`
                      ${sizeConfig.desc}
                      text-neutral-500 dark:text-neutral-400
                    `}
                  >
                    {item.timestamp}
                  </time>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type {
  TimelineProps,
  TimelineItem,
  TimelineItemStatus,
  TimelineSize,
  HorizontalTimelineProps,
};

import React from 'react';

type DescriptionListSize = 'sm' | 'md' | 'lg';
type DescriptionListLayout = 'vertical' | 'horizontal' | 'grid';

interface DescriptionItem {
  /** Term/label */
  term: string;
  /** Description/value */
  description: React.ReactNode;
  /** Additional term CSS classes */
  termClassName?: string;
  /** Additional description CSS classes */
  descriptionClassName?: string;
}

interface DescriptionListProps {
  /** List items */
  items: DescriptionItem[];
  /** Layout variant */
  layout?: DescriptionListLayout;
  /** Size variant */
  size?: DescriptionListSize;
  /** Number of columns for grid layout */
  columns?: 1 | 2 | 3 | 4;
  /** Show dividers between items */
  dividers?: boolean;
  /** Striped rows (for horizontal layout) */
  striped?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses: Record<DescriptionListSize, { term: string; description: string; gap: string }> = {
  sm: { term: 'text-xs', description: 'text-sm', gap: 'gap-y-3' },
  md: { term: 'text-sm', description: 'text-sm', gap: 'gap-y-4' },
  lg: { term: 'text-sm', description: 'text-base', gap: 'gap-y-5' },
};

export default function DescriptionList({
  items,
  layout = 'vertical',
  size = 'md',
  columns = 1,
  dividers = false,
  striped = false,
  className = '',
}: DescriptionListProps) {
  const sizeConfig = sizeClasses[size];

  const colClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  };

  if (layout === 'grid') {
    return (
      <dl className={`grid ${colClasses[columns]} ${sizeConfig.gap} ${className}`}>
        {items.map((item, index) => (
          <div key={index} className="min-w-0">
            <dt
              className={`
                ${sizeConfig.term}
                font-medium text-neutral-500 dark:text-neutral-400
                ${item.termClassName || ''}
              `}
            >
              {item.term}
            </dt>
            <dd
              className={`
                mt-1
                ${sizeConfig.description}
                text-neutral-900 dark:text-white
                ${item.descriptionClassName || ''}
              `}
            >
              {item.description}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  if (layout === 'horizontal') {
    return (
      <dl className={`divide-y divide-neutral-200 dark:divide-neutral-800 ${className}`}>
        {items.map((item, index) => (
          <div
            key={index}
            className={`
              flex flex-col sm:flex-row sm:gap-4 py-3
              ${striped && index % 2 === 1 ? 'bg-neutral-50 dark:bg-neutral-900/50 -mx-4 px-4' : ''}
            `}
          >
            <dt
              className={`
                ${sizeConfig.term}
                font-medium text-neutral-500 dark:text-neutral-400
                sm:w-1/3 sm:flex-shrink-0
                ${item.termClassName || ''}
              `}
            >
              {item.term}
            </dt>
            <dd
              className={`
                mt-1 sm:mt-0
                ${sizeConfig.description}
                text-neutral-900 dark:text-white
                sm:w-2/3
                ${item.descriptionClassName || ''}
              `}
            >
              {item.description}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  // Vertical layout (default)
  return (
    <dl className={`${sizeConfig.gap} flex flex-col ${className}`}>
      {items.map((item, index) => (
        <div
          key={index}
          className={`
            ${dividers && index > 0 ? 'pt-4 border-t border-neutral-200 dark:border-neutral-800' : ''}
          `}
        >
          <dt
            className={`
              ${sizeConfig.term}
              font-medium text-neutral-500 dark:text-neutral-400
              ${item.termClassName || ''}
            `}
          >
            {item.term}
          </dt>
          <dd
            className={`
              mt-1
              ${sizeConfig.description}
              text-neutral-900 dark:text-white
              ${item.descriptionClassName || ''}
            `}
          >
            {item.description}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export type { DescriptionListProps, DescriptionItem, DescriptionListSize, DescriptionListLayout };

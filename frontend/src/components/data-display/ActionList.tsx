import React from 'react';
import { ChevronRight, Check } from 'lucide-react';

type ActionListSize = 'sm' | 'md' | 'lg';

interface ActionItem {
  /** Unique identifier */
  id: string;
  /** Item label */
  label: string;
  /** Item description */
  description?: string;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Right side content (e.g., badge, shortcut) */
  trailingContent?: React.ReactNode;
  /** Show trailing chevron */
  showChevron?: boolean;
  /** Is item selected (for selection lists) */
  selected?: boolean;
  /** Is item disabled */
  disabled?: boolean;
  /** Is item destructive (red text) */
  destructive?: boolean;
  /** Optional divider after this item */
  divider?: boolean;
  /** Click handler */
  onClick?: () => void;
}

interface ActionListProps {
  /** List items */
  items: ActionItem[];
  /** Size variant */
  size?: ActionListSize;
  /** Show selection checkmarks */
  selectionMode?: boolean;
  /** Bordered style */
  bordered?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeConfig: Record<ActionListSize, { 
  padding: string; 
  iconSize: number; 
  label: string; 
  desc: string;
  gap: string;
}> = {
  sm: { padding: 'px-3 py-2', iconSize: 16, label: 'text-sm', desc: 'text-xs', gap: 'gap-2' },
  md: { padding: 'px-4 py-2.5', iconSize: 18, label: 'text-sm', desc: 'text-xs', gap: 'gap-3' },
  lg: { padding: 'px-4 py-3', iconSize: 20, label: 'text-base', desc: 'text-sm', gap: 'gap-3' },
};

export default function ActionList({
  items,
  size = 'md',
  selectionMode = false,
  bordered = false,
  className = '',
}: ActionListProps) {
  const config = sizeConfig[size];

  return (
    <div
      role="menu"
      className={`
        ${bordered ? 'border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-800' : ''}
        ${className}
      `}
    >
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <button
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={item.onClick}
            className={`
              w-full flex items-center ${config.gap} ${config.padding}
              text-left
              ${item.disabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 focus:bg-neutral-100 dark:focus:bg-neutral-800'
              }
              ${item.selected ? 'bg-primary-50 dark:bg-primary-950/30' : ''}
              ${item.destructive && !item.disabled ? 'text-error-600 dark:text-error-400' : ''}
              transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500
            `}
          >
            {/* Selection checkmark */}
            {selectionMode && (
              <div className="w-5 flex-shrink-0">
                {item.selected && (
                  <Check size={config.iconSize} className="text-primary-500" />
                )}
              </div>
            )}

            {/* Icon */}
            {item.icon && (
              <div className={`flex-shrink-0 ${item.destructive ? '' : 'text-neutral-500 dark:text-neutral-400'}`}>
                {item.icon}
              </div>
            )}

            {/* Label & Description */}
            <div className="flex-1 min-w-0">
              <p 
                className={`
                  ${config.label} font-medium truncate
                  ${item.destructive ? '' : 'text-neutral-900 dark:text-white'}
                `}
              >
                {item.label}
              </p>
              {item.description && (
                <p className={`${config.desc} text-neutral-500 dark:text-neutral-400 truncate`}>
                  {item.description}
                </p>
              )}
            </div>

            {/* Trailing content */}
            {item.trailingContent && (
              <div className="flex-shrink-0">
                {item.trailingContent}
              </div>
            )}

            {/* Chevron */}
            {item.showChevron && (
              <ChevronRight 
                size={config.iconSize} 
                className="flex-shrink-0 text-neutral-400 dark:text-neutral-500" 
              />
            )}
          </button>

          {/* Divider */}
          {item.divider && index < items.length - 1 && !bordered && (
            <div className="my-1 border-t border-neutral-200 dark:border-neutral-800" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ActionList Group with header
interface ActionListGroupProps {
  /** Group title */
  title?: string;
  /** Group items */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function ActionListGroup({ title, children, className = '' }: ActionListGroupProps) {
  return (
    <div className={className}>
      {title && (
        <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

// ActionList Divider
export function ActionListDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`my-1 border-t border-neutral-200 dark:border-neutral-800 ${className}`} />
  );
}

export type { ActionListProps, ActionItem, ActionListSize, ActionListGroupProps };

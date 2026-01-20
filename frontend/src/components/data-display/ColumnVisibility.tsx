import { useState, useRef, useEffect } from 'react';
import { Columns, Check, Eye, EyeOff } from 'lucide-react';

interface ColumnVisibilityItem {
    /** Column ID */
    id: string;
    /** Column label */
    label: string;
    /** Whether column is visible */
    visible: boolean;
}

interface ColumnVisibilityProps {
    /** Column configurations */
    columns: ColumnVisibilityItem[];
    /** Callback when visibility changes */
    onChange: (columnId: string, visible: boolean) => void;
    /** Reset all to visible */
    onResetAll?: () => void;
    /** Button label */
    buttonLabel?: string;
    /** Additional CSS classes */
    className?: string;
}

export default function ColumnVisibility({
    columns,
    onChange,
    onResetAll,
    buttonLabel = 'Columns',
    className = '',
}: ColumnVisibilityProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const visibleCount = columns.filter((col) => col.visible).length;
    const allVisible = visibleCount === columns.length;

    return (
        <div className={`relative inline-block ${className}`} ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
          inline-flex items-center gap-2 px-3 py-2
          text-sm font-medium
          bg-white dark:bg-neutral-900
          border border-neutral-300 dark:border-neutral-700
          rounded-md
          hover:bg-neutral-50 dark:hover:bg-neutral-800
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
          transition-colors
        `}
            >
                <Columns size={16} className="text-neutral-500 dark:text-neutral-400" />
                <span className="text-neutral-700 dark:text-neutral-300">{buttonLabel}</span>
                {!allVisible && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full">
                        {visibleCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className={`
            absolute right-0 mt-1 z-50
            w-56 py-1
            bg-white dark:bg-neutral-900
            border border-neutral-200 dark:border-neutral-800
            rounded-md shadow-lg
            max-h-64 overflow-y-auto
          `}
                >
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                Toggle Columns
                            </span>
                            {onResetAll && !allVisible && (
                                <button
                                    type="button"
                                    onClick={onResetAll}
                                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                                >
                                    Show all
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Column list */}
                    <div className="py-1">
                        {columns.map((column) => (
                            <button
                                key={column.id}
                                type="button"
                                onClick={() => onChange(column.id, !column.visible)}
                                className={`
                  w-full flex items-center gap-3 px-3 py-2
                  text-sm text-left
                  hover:bg-neutral-50 dark:hover:bg-neutral-800
                  transition-colors
                `}
                            >
                                <div
                                    className={`
                    w-4 h-4 flex items-center justify-center
                    ${column.visible
                                            ? 'text-primary-500'
                                            : 'text-neutral-400 dark:text-neutral-600'
                                        }
                  `}
                                >
                                    {column.visible ? (
                                        <Eye size={16} />
                                    ) : (
                                        <EyeOff size={16} />
                                    )}
                                </div>
                                <span
                                    className={`
                    flex-1
                    ${column.visible
                                            ? 'text-neutral-900 dark:text-white'
                                            : 'text-neutral-500 dark:text-neutral-500'
                                        }
                  `}
                                >
                                    {column.label}
                                </span>
                                {column.visible && (
                                    <Check size={14} className="text-primary-500" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Hook for managing column visibility state
export function useColumnVisibility<T extends { id: string; header: string }>(
    columns: T[],
    initialHidden: string[] = []
): {
    visibleColumns: T[];
    hiddenColumnIds: Set<string>;
    toggleColumn: (columnId: string, visible: boolean) => void;
    resetColumns: () => void;
    columnVisibilityItems: ColumnVisibilityItem[];
} {
    const [hiddenColumnIds, setHiddenColumnIds] = useState<Set<string>>(
        new Set(initialHidden)
    );

    const visibleColumns = columns.filter((col) => !hiddenColumnIds.has(col.id));

    const toggleColumn = (columnId: string, visible: boolean) => {
        setHiddenColumnIds((prev) => {
            const next = new Set(prev);
            if (visible) {
                next.delete(columnId);
            } else {
                next.add(columnId);
            }
            return next;
        });
    };

    const resetColumns = () => {
        setHiddenColumnIds(new Set());
    };

    const columnVisibilityItems: ColumnVisibilityItem[] = columns.map((col) => ({
        id: col.id,
        label: col.header,
        visible: !hiddenColumnIds.has(col.id),
    }));

    return {
        visibleColumns,
        hiddenColumnIds,
        toggleColumn,
        resetColumns,
        columnVisibilityItems,
    };
}

export type { ColumnVisibilityProps, ColumnVisibilityItem };

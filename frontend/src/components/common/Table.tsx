import React from 'react';

interface Column<T> {
    key: string;
    header: string;
    render?: (item: T) => React.ReactNode;
    sortable?: boolean;
    width?: string;
}

interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyExtractor: (item: T) => string;
    onRowClick?: (item: T) => void;
    isLoading?: boolean;
    emptyMessage?: string;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
    onSort?: (column: string) => void;
}

export default function Table<T extends object>({
    columns,
    data,
    keyExtractor,
    onRowClick,
    isLoading = false,
    emptyMessage = 'No data available',
    sortColumn,
    sortDirection,
    onSort,
}: TableProps<T>) {
    const handleSort = (column: Column<T>) => {
        if (column.sortable && onSort) {
            onSort(column.key);
        }
    };

    if (isLoading) {
        return (
            <div className="w-full overflow-hidden rounded-xl border border-surface-200 dark:border-surface-700">
                <div className="p-8 flex items-center justify-center">
                    <div className="w-8 h-8 spinner" />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full overflow-hidden rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-surface-50 dark:bg-surface-800">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`
                                        px-4 py-3 text-left text-sm font-semibold
                                        text-surface-700 dark:text-surface-300
                                        ${column.sortable ? 'cursor-pointer select-none hover:bg-surface-100 dark:hover:bg-surface-700' : ''}
                                    `}
                                    style={{ width: column.width }}
                                    onClick={() => handleSort(column)}
                                >
                                    <div className="flex items-center gap-1">
                                        {column.header}
                                        {column.sortable && sortColumn === column.key && (
                                            <svg
                                                className={`w-4 h-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M5 15l7-7 7 7"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                        {data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-4 py-8 text-center text-surface-500 dark:text-surface-400"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            data.map((item) => (
                                <tr
                                    key={keyExtractor(item)}
                                    onClick={() => onRowClick?.(item)}
                                    className={`
                                        bg-white dark:bg-surface-900
                                        ${onRowClick ? 'cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800' : ''}
                                        transition-colors
                                    `}
                                >
                                    {columns.map((column) => (
                                        <td
                                            key={column.key}
                                            className="px-4 py-3 text-sm text-surface-700 dark:text-surface-300"
                                        >
                                            {column.render
                                                ? column.render(item)
                                                : String((item as Record<string, unknown>)[column.key] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Pagination component
interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
    pageSize?: number;
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    pageSize,
}: PaginationProps) {
    const startItem = totalItems ? (currentPage - 1) * (pageSize || 10) + 1 : 0;
    const endItem = totalItems
        ? Math.min(currentPage * (pageSize || 10), totalItems)
        : 0;

    return (
        <div className="flex items-center justify-between px-4 py-3">
            <div className="text-sm text-surface-600 dark:text-surface-400">
                {totalItems ? (
                    <>
                        Showing <span className="font-medium">{startItem}</span> to{' '}
                        <span className="font-medium">{endItem}</span> of{' '}
                        <span className="font-medium">{totalItems}</span> results
                    </>
                ) : (
                    <>
                        Page <span className="font-medium">{currentPage}</span> of{' '}
                        <span className="font-medium">{totalPages}</span>
                    </>
                )}
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg text-sm font-medium
                        bg-surface-100 dark:bg-surface-700
                        text-surface-600 dark:text-surface-300
                        hover:bg-surface-200 dark:hover:bg-surface-600
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors"
                >
                    Previous
                </button>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg text-sm font-medium
                        bg-surface-100 dark:bg-surface-700
                        text-surface-600 dark:text-surface-300
                        hover:bg-surface-200 dark:hover:bg-surface-600
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors"
                >
                    Next
                </button>
            </div>
        </div>
    );
}

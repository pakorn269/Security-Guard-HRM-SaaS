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
            <div className="w-full overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
                <div className="p-8 flex items-center justify-center">
                    <div className="w-8 h-8 spinner" />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-neutral-50 dark:bg-neutral-900">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`
                                        px-4 py-3 text-left text-sm font-semibold
                                        text-neutral-700 dark:text-neutral-300
                                        ${column.sortable ? 'cursor-pointer select-none hover:bg-neutral-100 dark:hover:bg-neutral-800' : ''}
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
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                        {data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400"
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
                                        bg-white dark:bg-neutral-900
                                        ${onRowClick ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800' : ''}
                                        transition-colors
                                    `}
                                >
                                    {columns.map((column) => (
                                        <td
                                            key={column.key}
                                            className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300"
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
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
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
                        bg-neutral-100 dark:bg-neutral-800
                        text-neutral-600 dark:text-neutral-300
                        hover:bg-neutral-200 dark:hover:bg-neutral-700
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors"
                >
                    Previous
                </button>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg text-sm font-medium
                        bg-neutral-100 dark:bg-neutral-800
                        text-neutral-600 dark:text-neutral-300
                        hover:bg-neutral-200 dark:hover:bg-neutral-700
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors"
                >
                    Next
                </button>
            </div>
        </div>
    );
}

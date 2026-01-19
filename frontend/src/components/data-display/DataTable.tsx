import React, { useCallback, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Inbox,
} from 'lucide-react';

// Column definition
export interface ColumnDef<T> {
  /** Unique column identifier */
  id: string;
  /** Column header text */
  header: string;
  /** Accessor key or function to get cell value */
  accessorKey?: keyof T;
  /** Custom cell renderer */
  cell?: (item: T, index: number) => React.ReactNode;
  /** Enable sorting for this column */
  sortable?: boolean;
  /** Column width */
  width?: string;
  /** Min column width */
  minWidth?: string;
  /** Align cell content */
  align?: 'left' | 'center' | 'right';
  /** Hide column on mobile */
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Table data */
  data: T[];
  /** Function to get unique key for each row */
  getRowId: (item: T) => string;
  /** Loading state */
  isLoading?: boolean;
  /** Show striped rows */
  isStriped?: boolean;
  /** Enable row hover effect */
  isHoverable?: boolean;
  /** Enable row selection */
  isSelectable?: boolean;
  /** Currently selected row IDs */
  selectedIds?: Set<string>;
  /** Selection change callback */
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** Row click callback */
  onRowClick?: (item: T) => void;
  /** Sort column */
  sortColumn?: string;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Sort change callback */
  onSortChange?: (column: string, direction: 'asc' | 'desc') => void;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state icon */
  emptyIcon?: React.ReactNode;
  /** Custom empty state component */
  emptyState?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export default function DataTable<T extends object>({
  columns,
  data,
  getRowId,
  isLoading = false,
  isStriped = false,
  isHoverable = true,
  isSelectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  onRowClick,
  sortColumn,
  sortDirection = 'asc',
  onSortChange,
  emptyMessage = 'No data available',
  emptyIcon,
  emptyState,
  className = '',
}: DataTableProps<T>) {
  // Check if all rows are selected
  const allSelected = useMemo(() => {
    if (data.length === 0) return false;
    return data.every((item) => selectedIds.has(getRowId(item)));
  }, [data, selectedIds, getRowId]);

  // Check if some rows are selected
  const someSelected = useMemo(() => {
    if (data.length === 0) return false;
    const selectedCount = data.filter((item) => selectedIds.has(getRowId(item))).length;
    return selectedCount > 0 && selectedCount < data.length;
  }, [data, selectedIds, getRowId]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;

    if (allSelected) {
      // Deselect all
      onSelectionChange(new Set());
    } else {
      // Select all
      const newSelected = new Set(data.map((item) => getRowId(item)));
      onSelectionChange(newSelected);
    }
  }, [data, getRowId, allSelected, onSelectionChange]);

  // Handle single row selection
  const handleSelectRow = useCallback(
    (id: string) => {
      if (!onSelectionChange) return;

      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      onSelectionChange(newSelected);
    },
    [selectedIds, onSelectionChange]
  );

  // Handle sort
  const handleSort = useCallback(
    (columnId: string) => {
      if (!onSortChange) return;

      if (sortColumn === columnId) {
        onSortChange(columnId, sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        onSortChange(columnId, 'asc');
      }
    },
    [sortColumn, sortDirection, onSortChange]
  );

  // Get cell value
  const getCellValue = (item: T, column: ColumnDef<T>, index: number): React.ReactNode => {
    if (column.cell) {
      return column.cell(item, index);
    }
    if (column.accessorKey) {
      const value = item[column.accessorKey];
      return value != null ? String(value) : '';
    }
    return '';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`w-full overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800 ${className}`}>
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 size={32} className="animate-spin text-primary-500" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    if (emptyState) {
      return (
        <div className={`w-full overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800 ${className}`}>
          {emptyState}
        </div>
      );
    }

    return (
      <div className={`w-full overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800 ${className}`}>
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          {emptyIcon || <Inbox size={40} className="text-neutral-300 dark:text-neutral-600" />}
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800 ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
            <tr>
              {/* Selection checkbox column */}
              {isSelectable && (
                <th className="w-12 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={`
                    px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider
                    text-neutral-600 dark:text-neutral-400
                    ${column.sortable ? 'cursor-pointer select-none hover:bg-neutral-100 dark:hover:bg-neutral-800' : ''}
                    ${column.hideOnMobile ? 'hidden sm:table-cell' : ''}
                    ${column.align === 'center' ? 'text-center' : ''}
                    ${column.align === 'right' ? 'text-right' : ''}
                  `}
                  style={{
                    width: column.width,
                    minWidth: column.minWidth,
                  }}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className={`flex items-center gap-1.5 ${column.align === 'right' ? 'justify-end' : ''} ${column.align === 'center' ? 'justify-center' : ''}`}>
                    <span>{column.header}</span>
                    {column.sortable && (
                      <span className="flex-shrink-0">
                        {sortColumn === column.id ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp size={14} className="text-primary-500" />
                          ) : (
                            <ArrowDown size={14} className="text-primary-500" />
                          )
                        ) : (
                          <ArrowUpDown size={14} className="text-neutral-400" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {data.map((item, index) => {
              const rowId = getRowId(item);
              const isSelected = selectedIds.has(rowId);

              return (
                <tr
                  key={rowId}
                  onClick={() => onRowClick?.(item)}
                  className={`
                    bg-white dark:bg-neutral-900
                    ${isStriped && index % 2 === 1 ? 'bg-neutral-25 dark:bg-neutral-900/50' : ''}
                    ${isHoverable ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50' : ''}
                    ${isSelected ? 'bg-primary-50 dark:bg-primary-950/30' : ''}
                    ${onRowClick ? 'cursor-pointer' : ''}
                    transition-colors
                  `}
                >
                  {/* Selection checkbox */}
                  {isSelectable && (
                    <td className="w-12 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRow(rowId);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                        aria-label={`Select row ${rowId}`}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={`
                        px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300
                        ${column.hideOnMobile ? 'hidden sm:table-cell' : ''}
                        ${column.align === 'center' ? 'text-center' : ''}
                        ${column.align === 'right' ? 'text-right' : ''}
                      `}
                    >
                      {getCellValue(item, column, index)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Pagination component
export interface PaginationProps {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Page change callback */
  onPageChange: (page: number) => void;
  /** Total number of items */
  totalItems?: number;
  /** Items per page */
  pageSize?: number;
  /** Show first/last page buttons */
  showFirstLast?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = 10,
  showFirstLast = true,
  className = '',
}: PaginationProps) {
  const startItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = totalItems ? Math.min(currentPage * pageSize, totalItems) : 0;

  return (
    <div className={`flex items-center justify-between px-4 py-3 ${className}`}>
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
      <div className="flex items-center gap-1">
        {showFirstLast && (
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="First page"
          >
            <ChevronsLeft size={18} className="text-neutral-600 dark:text-neutral-400" />
          </button>
        )}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft size={18} className="text-neutral-600 dark:text-neutral-400" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`
                  min-w-[32px] h-8 px-2 rounded text-sm font-medium transition-colors
                  ${currentPage === pageNum
                    ? 'bg-primary-500 text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }
                `}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight size={18} className="text-neutral-600 dark:text-neutral-400" />
        </button>
        {showFirstLast && (
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Last page"
          >
            <ChevronsRight size={18} className="text-neutral-600 dark:text-neutral-400" />
          </button>
        )}
      </div>
    </div>
  );
}

// Bulk actions toolbar
export interface BulkActionsProps {
  /** Number of selected items */
  selectedCount: number;
  /** Total number of items */
  totalCount: number;
  /** Action buttons/content */
  children: React.ReactNode;
  /** Clear selection callback */
  onClearSelection?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function BulkActions({
  selectedCount,
  totalCount,
  children,
  onClearSelection,
  className = '',
}: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={`
        flex items-center justify-between gap-4 px-4 py-3
        bg-primary-50 dark:bg-primary-950/30
        border-b border-primary-100 dark:border-primary-900
        ${className}
      `}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-primary-700 dark:text-primary-300">
          {selectedCount} of {totalCount} selected
        </span>
        {onClearSelection && (
          <button
            onClick={onClearSelection}
            className="text-primary-600 dark:text-primary-400 hover:underline"
          >
            Clear selection
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

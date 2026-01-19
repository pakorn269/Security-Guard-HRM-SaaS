import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  UserCheck,
  ChevronDown,
} from 'lucide-react';
import { Button, Badge, Avatar, Card } from '../../components/common';
import { PageHeader } from '../../components/layout';
import { DataTable, Pagination, BulkActions, type ColumnDef } from '../../components/data-display';
import { SearchInput } from '../../components/forms';
import { Menu, MenuItem, MenuDivider } from '../../components/navigation';
import { employeeService, type EmployeeWithUser, type ListEmployeesParams } from '../../services/employee.service';
import EmployeeFormModal from './EmployeeFormModal';

/**
 * Employees Page - Redesigned (Part 5.3)
 *
 * Changes from original:
 * - Collapsible advanced filters
 * - Enhanced data table with:
 *   - Column visibility toggle
 *   - Multi-select for bulk actions
 *   - Row actions dropdown
 *   - Sortable columns with indicators
 * - Consistent status badge component
 * - Lucide icons instead of inline SVGs
 */

// Status configuration
const STATUS_CONFIG = {
  active: { label: 'Active', labelTh: 'ทำงาน', variant: 'success' as const },
  on_leave: { label: 'On Leave', labelTh: 'ลาหยุด', variant: 'warning' as const },
  terminated: { label: 'Terminated', labelTh: 'พ้นสภาพ', variant: 'error' as const },
};

export default function EmployeesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<EmployeeWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithUser | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);

  const pageSize = 10;

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: ListEmployeesParams = {
        page: currentPage,
        pageSize,
        search: search || undefined,
        status: statusFilter as 'active' | 'on_leave' | 'terminated' | undefined,
      };

      const response = await employeeService.list(params);
      setEmployees(response.data || []);
      if (response.meta) {
        setTotalPages(response.meta.totalPages);
        setTotal(response.meta.total);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, statusFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Reset page when search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleRowClick = (employee: EmployeeWithUser) => {
    navigate(`/employees/${employee.id}`);
  };

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setIsFormOpen(true);
  };

  const handleEditEmployee = (employee: EmployeeWithUser) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingEmployee(null);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingEmployee(null);
    fetchEmployees();
  };

  const handleSortChange = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  const handleSelectionChange = (selected: Set<string>) => {
    setSelectedIds(selected);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Table columns definition
  const columns: ColumnDef<EmployeeWithUser>[] = [
    {
      id: 'employeeCode',
      header: t('employees.code', 'รหัสพนักงาน'),
      accessorKey: 'employeeCode',
      sortable: true,
      width: '120px',
    },
    {
      id: 'fullName',
      header: t('employees.name', 'ชื่อ-นามสกุล'),
      sortable: true,
      cell: (employee) => (
        <div className="flex items-center gap-3">
          <Avatar name={employee.fullName} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
              {employee.fullName}
            </p>
            {employee.fullNameTh && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {employee.fullNameTh}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'phone',
      header: t('employees.phone', 'โทรศัพท์'),
      cell: (employee) => (
        <span className="text-sm text-neutral-600 dark:text-neutral-300">
          {employee.phone || '-'}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      id: 'email',
      header: t('employees.email', 'อีเมล'),
      cell: (employee) => (
        <span className="text-sm text-neutral-600 dark:text-neutral-300 truncate block max-w-[180px]">
          {employee.email || '-'}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      id: 'status',
      header: t('employees.status', 'สถานะ'),
      cell: (employee) => {
        const config = STATUS_CONFIG[employee.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active;
        return (
          <Badge variant={config.variant} size="sm">
            {i18n.language === 'th' ? config.labelTh : config.label}
          </Badge>
        );
      },
    },
    {
      id: 'hasUser',
      header: t('employees.account', 'บัญชี'),
      cell: (employee) =>
        employee.user ? (
          <div className="flex items-center gap-1.5 text-success-600 dark:text-success-400">
            <UserCheck size={14} />
            <span className="text-xs font-medium">{employee.user.role}</span>
          </div>
        ) : (
          <span className="text-neutral-400 text-sm">-</span>
        ),
      hideOnMobile: true,
    },
    {
      id: 'actions',
      header: '',
      width: '48px',
      align: 'right',
      cell: (employee) => (
        <Menu
          trigger={
            <button className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <MoreHorizontal size={16} className="text-neutral-500" />
            </button>
          }
          placement="bottom-end"
        >
          <MenuItem icon={<Eye size={16} />} onClick={() => handleRowClick(employee)}>
            {t('common.view', 'ดูรายละเอียด')}
          </MenuItem>
          <MenuItem icon={<Pencil size={16} />} onClick={() => handleEditEmployee(employee)}>
            {t('common.edit', 'แก้ไข')}
          </MenuItem>
          <MenuDivider />
          <MenuItem icon={<Trash2 size={16} />} destructive>
            {t('common.delete', 'ลบ')}
          </MenuItem>
        </Menu>
      ),
    },
  ];

  const statusOptions = [
    { value: '', label: t('employees.allStatuses', 'ทุกสถานะ') },
    { value: 'active', label: t('employees.statusActive', 'ทำงาน') },
    { value: 'on_leave', label: t('employees.statusOnLeave', 'ลาหยุด') },
    { value: 'terminated', label: t('employees.statusTerminated', 'พ้นสภาพ') },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t('employees.title', 'พนักงาน')}
        description={t('employees.subtitle', 'จัดการข้อมูลพนักงานรักษาความปลอดภัย')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<Download size={16} />}>
              {t('common.export', 'ส่งออก')}
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={handleAddEmployee}>
              {t('employees.addEmployee', 'เพิ่มพนักงาน')}
            </Button>
          </div>
        }
      />

      {/* Search and Filters */}
      <Card variant="bordered" padding="md">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('employees.searchPlaceholder', 'ค้นหาชื่อ, รหัส, โทรศัพท์...')}
              debounceMs={300}
            />
          </div>

          {/* Quick filter buttons */}
          <div className="flex items-center gap-2">
            {/* Status filter dropdown */}
            <Menu
              trigger={
                <Button variant="outline" size="md" rightIcon={<ChevronDown size={16} />}>
                  {statusFilter
                    ? statusOptions.find((o) => o.value === statusFilter)?.label
                    : t('employees.status', 'สถานะ')}
                </Button>
              }
            >
              {statusOptions.map((option) => (
                <MenuItem
                  key={option.value}
                  checked={statusFilter === option.value}
                  onClick={() => {
                    setStatusFilter(option.value);
                    setCurrentPage(1);
                  }}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Menu>

            {/* Advanced filters toggle */}
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="md"
              leftIcon={<Filter size={16} />}
              onClick={() => setShowFilters(!showFilters)}
            >
              {t('common.filters', 'ตัวกรอง')}
            </Button>
          </div>
        </div>

        {/* Advanced filters (collapsible) */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  {t('employees.department', 'แผนก')}
                </label>
                <select className="w-full h-10 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm">
                  <option value="">{t('common.all', 'ทั้งหมด')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  {t('employees.position', 'ตำแหน่ง')}
                </label>
                <select className="w-full h-10 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm">
                  <option value="">{t('common.all', 'ทั้งหมด')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  {t('employees.hireDate', 'วันที่เริ่มงาน')}
                </label>
                <input
                  type="date"
                  className="w-full h-10 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <BulkActions
          selectedCount={selectedIds.size}
          totalCount={employees.length}
          onClearSelection={handleClearSelection}
        >
          <Button variant="outline" size="sm">
            {t('common.export', 'ส่งออก')}
          </Button>
          <Button variant="danger" size="sm">
            {t('common.delete', 'ลบ')}
          </Button>
        </BulkActions>
      )}

      {/* Employees Table */}
      <DataTable
        columns={columns}
        data={employees}
        getRowId={(employee) => employee.id}
        isLoading={isLoading}
        isHoverable
        isSelectable
        selectedIds={selectedIds}
        onSelectionChange={handleSelectionChange}
        onRowClick={handleRowClick}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        emptyMessage={t('employees.noEmployees', 'ไม่พบข้อมูลพนักงาน')}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={total}
          pageSize={pageSize}
        />
      )}

      {/* Employee Form Modal */}
      <EmployeeFormModal
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        employee={editingEmployee}
      />
    </div>
  );
}

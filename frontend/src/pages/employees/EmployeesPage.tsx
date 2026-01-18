import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Table, Pagination, Input, Select, Card } from '../../components/common';
import { employeeService, type EmployeeWithUser, type ListEmployeesParams } from '../../services/employee.service';
import EmployeeFormModal from './EmployeeFormModal';

// Status badge component
function StatusBadge({ status }: { status: string }) {
    const statusStyles: Record<string, string> = {
        active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        on_leave: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        terminated: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };

    const statusLabels: Record<string, string> = {
        active: 'Active',
        on_leave: 'On Leave',
        terminated: 'Terminated',
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || statusStyles.active}`}
        >
            {statusLabels[status] || status}
        </span>
    );
}

export default function EmployeesPage() {
    const { t } = useTranslation();
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

    // Debounced search
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

    const handleFormClose = () => {
        setIsFormOpen(false);
        setEditingEmployee(null);
    };

    const handleFormSuccess = () => {
        setIsFormOpen(false);
        setEditingEmployee(null);
        fetchEmployees();
    };

    const columns = [
        {
            key: 'employeeCode',
            header: t('employees.code', 'Employee Code'),
            sortable: true,
            width: '120px',
        },
        {
            key: 'fullName',
            header: t('employees.name', 'Name'),
            sortable: true,
            render: (employee: EmployeeWithUser) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 font-semibold">
                        {employee.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="font-medium text-surface-900 dark:text-white">
                            {employee.fullName}
                        </div>
                        {employee.fullNameTh && (
                            <div className="text-sm text-surface-500">{employee.fullNameTh}</div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'phone',
            header: t('employees.phone', 'Phone'),
            render: (employee: EmployeeWithUser) => employee.phone || '-',
        },
        {
            key: 'email',
            header: t('employees.email', 'Email'),
            render: (employee: EmployeeWithUser) => employee.email || '-',
        },
        {
            key: 'status',
            header: t('employees.status', 'Status'),
            render: (employee: EmployeeWithUser) => <StatusBadge status={employee.status} />,
        },
        {
            key: 'hasUser',
            header: t('employees.account', 'Account'),
            render: (employee: EmployeeWithUser) =>
                employee.user ? (
                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                            />
                        </svg>
                        {employee.user.role}
                    </span>
                ) : (
                    <span className="text-surface-400">-</span>
                ),
        },
    ];

    const statusOptions = [
        { value: '', label: t('employees.allStatuses', 'All Statuses') },
        { value: 'active', label: t('employees.statusActive', 'Active') },
        { value: 'on_leave', label: t('employees.statusOnLeave', 'On Leave') },
        { value: 'terminated', label: t('employees.statusTerminated', 'Terminated') },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
                        {t('employees.title', 'Employees')}
                    </h1>
                    <p className="text-surface-500 dark:text-surface-400 mt-1">
                        {t('employees.subtitle', 'Manage your team members and their information')}
                    </p>
                </div>
                <Button
                    onClick={handleAddEmployee}
                    leftIcon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                    }
                >
                    {t('employees.addEmployee', 'Add Employee')}
                </Button>
            </div>

            {/* Filters */}
            <Card padding="md">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder={t('employees.searchPlaceholder', 'Search by name, code, phone...')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            leftIcon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            }
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select
                            options={statusOptions}
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                </div>
            </Card>

            {/* Employees Table */}
            <div>
                <Table
                    columns={columns}
                    data={employees}
                    keyExtractor={(employee) => employee.id}
                    onRowClick={handleRowClick}
                    isLoading={isLoading}
                    emptyMessage={t('employees.noEmployees', 'No employees found')}
                />
                {totalPages > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={total}
                        pageSize={pageSize}
                    />
                )}
            </div>

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

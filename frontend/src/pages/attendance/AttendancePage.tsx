import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Table, Card, Input } from '../../components/common';
import {
    listAttendance,
    getDailyReport,
    type AttendanceLogWithDetails,
    type AttendanceSummary,
    type ListAttendanceQuery
} from '../../services/attendance.service';
import { employeeService, type EmployeeWithUser } from '../../services/employee.service';
import AttendanceDetailModal from './AttendanceDetailModal';

// Status badge component
function StatusBadge({ status }: { status: string }) {
    const getStatusConfig = () => {
        switch (status) {
            case 'on_time':
                return { label: 'ตรงเวลา', className: 'bg-success-100 text-success-800' };
            case 'late':
                return { label: 'สาย', className: 'bg-warning-100 text-warning-800' };
            case 'completed':
                return { label: 'เสร็จสิ้น', className: 'bg-primary-100 text-primary-800' };
            case 'early_leave':
                return { label: 'ออกก่อน', className: 'bg-warning-100 text-warning-800' };
            case 'no_show':
                return { label: 'ไม่มา', className: 'bg-error-100 text-error-800' };
            case 'pending':
                return { label: 'รอดำเนินการ', className: 'bg-surface-100 text-surface-800' };
            default:
                return { label: status, className: 'bg-surface-100 text-surface-800' };
        }
    };

    const config = getStatusConfig();

    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
            {config.label}
        </span>
    );
}

// Summary card component
function SummaryCard({
    title,
    value,
    icon,
    bgColor
}: {
    title: string;
    value: number;
    icon: string;
    bgColor: string;
}) {
    return (
        <div className={`${bgColor} rounded-xl p-4`}>
            <div className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-sm opacity-80">{title}</p>
                </div>
            </div>
        </div>
    );
}

export default function AttendancePage() {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);
    const [records, setRecords] = useState<AttendanceLogWithDetails[]>([]);
    const [employees, setEmployees] = useState<EmployeeWithUser[]>([]);
    const [summary, setSummary] = useState<AttendanceSummary | null>(null);
    const [selectedRecord, setSelectedRecord] = useState<AttendanceLogWithDetails | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [filters, setFilters] = useState<ListAttendanceQuery>({
        page: 1,
        pageSize: 20,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
    });
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
    });

    // Fetch data
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Fetch attendance records
            const result = await listAttendance(filters);
            setRecords(result.records);
            setPagination({
                page: filters.page || 1,
                pageSize: filters.pageSize || 20,
                total: result.total,
                totalPages: Math.ceil(result.total / (filters.pageSize || 20)),
            });

            // Fetch daily report for summary
            if (filters.startDate) {
                const report = await getDailyReport(filters.startDate);
                setSummary(report.summary);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load attendance');
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    // Fetch employees for filter
    const fetchEmployees = useCallback(async () => {
        try {
            const result = await employeeService.list({ pageSize: 100, status: 'active' });
            setEmployees(result.data || []);
        } catch (err) {
            console.error('Failed to load employees:', err);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    // Format time
    const formatTime = (timeStr: string | null | undefined): string => {
        if (!timeStr) return '-';
        const date = new Date(timeStr);
        return date.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Format date
    const formatDate = (dateStr: string | null | undefined): string => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    // Handle row click
    const handleRowClick = (record: AttendanceLogWithDetails) => {
        setSelectedRecord(record);
        setShowModal(true);
    };

    // Handle filter changes
    const handleFilterChange = (key: keyof ListAttendanceQuery, value: string | undefined) => {
        setFilters(prev => ({
            ...prev,
            [key]: value || undefined,
            page: 1, // Reset to first page when filters change
        }));
    };

    // Handle page change
    const handlePageChange = (page: number) => {
        setFilters(prev => ({ ...prev, page }));
    };

    // Table columns
    const columns = [
        {
            key: 'employee',
            header: 'พนักงาน',
            render: (record: AttendanceLogWithDetails) => (
                <div>
                    <p className="font-medium text-surface-800">
                        {record.employee?.fullName || '-'}
                    </p>
                    <p className="text-sm text-surface-500">
                        {record.employee?.employeeCode || '-'}
                    </p>
                </div>
            ),
        },
        {
            key: 'date',
            header: 'วันที่',
            render: (record: AttendanceLogWithDetails) => formatDate(record.clockInTime),
        },
        {
            key: 'clockInTime',
            header: 'เวลาเข้า',
            render: (record: AttendanceLogWithDetails) => (
                <span className="font-mono">{formatTime(record.clockInTime)}</span>
            ),
        },
        {
            key: 'clockOutTime',
            header: 'เวลาออก',
            render: (record: AttendanceLogWithDetails) => (
                <span className="font-mono">{formatTime(record.clockOutTime)}</span>
            ),
        },
        {
            key: 'totalHours',
            header: 'ชั่วโมง',
            render: (record: AttendanceLogWithDetails) => (
                <span className="font-semibold">
                    {record.totalHours ? `${record.totalHours} ชม.` : '-'}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'สถานะ',
            render: (record: AttendanceLogWithDetails) => (
                <StatusBadge status={record.status} />
            ),
        },
        {
            key: 'shift',
            header: 'กะ',
            render: (record: AttendanceLogWithDetails) => (
                record.shift ? (
                    <span className="text-sm text-surface-600">
                        {record.shift.startTime} - {record.shift.endTime}
                    </span>
                ) : (
                    <span className="text-surface-400">-</span>
                )
            ),
        },
    ];

    // Status options for filter
    const statusOptions = [
        { value: '', label: 'ทั้งหมด' },
        { value: 'on_time', label: 'ตรงเวลา' },
        { value: 'late', label: 'สาย' },
        { value: 'completed', label: 'เสร็จสิ้น' },
        { value: 'early_leave', label: 'ออกก่อน' },
        { value: 'no_show', label: 'ไม่มา' },
        { value: 'pending', label: 'รอดำเนินการ' },
    ];

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900">
                        {t('attendance.title', 'การลงเวลา')}
                    </h1>
                    <p className="text-surface-500 mt-1">
                        {t('attendance.subtitle', 'ดูและจัดการบันทึกการลงเวลาของพนักงาน')}
                    </p>
                </div>
                <Button
                    variant="primary"
                    onClick={fetchData}
                    disabled={isLoading}
                >
                    🔄 รีเฟรช
                </Button>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <SummaryCard
                        title="คาดว่าจะมา"
                        value={summary.expectedToWork}
                        icon="👥"
                        bgColor="bg-primary-50 text-primary-800"
                    />
                    <SummaryCard
                        title="ลงเวลาแล้ว"
                        value={summary.clockedIn}
                        icon="✅"
                        bgColor="bg-success-50 text-success-800"
                    />
                    <SummaryCard
                        title="ตรงเวลา"
                        value={summary.onTime}
                        icon="⏱️"
                        bgColor="bg-primary-50 text-primary-800"
                    />
                    <SummaryCard
                        title="สาย"
                        value={summary.late}
                        icon="⚠️"
                        bgColor="bg-warning-50 text-warning-800"
                    />
                    <SummaryCard
                        title="ไม่มา"
                        value={summary.noShow}
                        icon="❌"
                        bgColor="bg-error-50 text-error-800"
                    />
                    <SummaryCard
                        title="เสร็จสิ้น"
                        value={summary.completed}
                        icon="🏁"
                        bgColor="bg-surface-100 text-surface-800"
                    />
                </div>
            )}

            {/* Filters */}
            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Input
                        type="date"
                        label="วันที่เริ่มต้น"
                        value={filters.startDate || ''}
                        onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    />
                    <Input
                        type="date"
                        label="วันที่สิ้นสุด"
                        value={filters.endDate || ''}
                        onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    />
                    <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                            พนักงาน
                        </label>
                        <select
                            className="appearance-none block w-full rounded-xl border px-4 py-2.5 pr-10 bg-white dark:bg-surface-800 text-surface-900 dark:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent border-surface-300 dark:border-surface-600"
                            value={filters.employeeId || ''}
                            onChange={(e) => handleFilterChange('employeeId', e.target.value)}
                        >
                            <option value="">ทั้งหมด</option>
                            {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.fullName} ({emp.employeeCode})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                            สถานะ
                        </label>
                        <select
                            className="appearance-none block w-full rounded-xl border px-4 py-2.5 pr-10 bg-white dark:bg-surface-800 text-surface-900 dark:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent border-surface-300 dark:border-surface-600"
                            value={filters.status || ''}
                            onChange={(e) => handleFilterChange('status', e.target.value as ListAttendanceQuery['status'])}
                        >
                            {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Error State */}
            {error && (
                <div className="bg-error-50 border border-error-200 rounded-xl p-4">
                    <p className="text-error-700">⚠️ {error}</p>
                </div>
            )}

            {/* Table */}
            <Card>
                <Table
                    columns={columns}
                    data={records}
                    keyExtractor={(record) => record.id}
                    isLoading={isLoading}
                    onRowClick={handleRowClick}
                    emptyMessage="ไม่พบข้อมูลการลงเวลา"
                />

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="p-4 border-t border-surface-200">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-surface-500">
                                แสดง {(pagination.page - 1) * pagination.pageSize + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} จาก {pagination.total} รายการ
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page <= 1 || isLoading}
                                >
                                    ก่อนหน้า
                                </Button>
                                <span className="px-3 py-1 text-sm text-surface-600">
                                    หน้า {pagination.page} / {pagination.totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.totalPages || isLoading}
                                >
                                    ถัดไป
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Detail Modal */}
            {showModal && selectedRecord && (
                <AttendanceDetailModal
                    attendance={selectedRecord}
                    onClose={() => {
                        setShowModal(false);
                        setSelectedRecord(null);
                    }}
                    onUpdate={() => {
                        fetchData();
                        setShowModal(false);
                        setSelectedRecord(null);
                    }}
                />
            )}
        </div>
    );
}

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Flag,
  List,
  Map,
  MapPin,

  Filter,
  ChevronDown,
} from 'lucide-react';
import { Button, Card, Input, Badge, Avatar } from '../../components/common';
import { PageHeader } from '../../components/layout';
import { Stat } from '../../components/data-display';
import { Tabs, TabList, Tab, Menu, MenuItem } from '../../components/navigation';
import { DataTable, Pagination, type ColumnDef } from '../../components/data-display';
import {
  listAttendance,
  getDailyReport,
  type AttendanceLogWithDetails,
  type AttendanceSummary,
  type ListAttendanceQuery,
} from '../../services/attendance.service';
import { employeeService, type EmployeeWithUser } from '../../services/employee.service';
import AttendanceDetailModal from './AttendanceDetailModal';

/**
 * Attendance Page - Redesigned (Part 5.5)
 *
 * Changes from original:
 * - PageHeader with consistent layout
 * - Lucide icons instead of emojis
 * - Stat component for summary cards
 * - List + Map toggle view
 * - Location accuracy indicator
 * - Photo thumbnails in list
 * - Enhanced data table with DataTable component
 * - Improved filters with Menu dropdown
 */

// Status configuration
const STATUS_CONFIG = {
  on_time: { label: 'ตรงเวลา', variant: 'success' as const, icon: CheckCircle },
  late: { label: 'สาย', variant: 'warning' as const, icon: AlertTriangle },
  completed: { label: 'เสร็จสิ้น', variant: 'info' as const, icon: Flag },
  early_leave: { label: 'ออกก่อน', variant: 'warning' as const, icon: AlertTriangle },
  no_show: { label: 'ไม่มา', variant: 'error' as const, icon: XCircle },
  pending: { label: 'รอดำเนินการ', variant: 'neutral' as const, icon: Clock },
};

// Location accuracy indicator
function LocationAccuracy({ accuracy }: { accuracy?: number }) {
  if (!accuracy) return null;

  const getAccuracyLevel = () => {
    if (accuracy <= 10) return { label: 'แม่นยำมาก', color: 'text-success-600' };
    if (accuracy <= 30) return { label: 'แม่นยำ', color: 'text-success-500' };
    if (accuracy <= 100) return { label: 'ปานกลาง', color: 'text-warning-500' };
    return { label: 'ไม่แม่นยำ', color: 'text-error-500' };
  };

  const { label, color } = getAccuracyLevel();

  return (
    <div className={`flex items-center gap-1 text-xs ${color}`}>
      <MapPin size={12} />
      <span>±{accuracy}m ({label})</span>
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
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);

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
      const result = await listAttendance(filters);
      setRecords(result.records);
      setPagination({
        page: filters.page || 1,
        pageSize: filters.pageSize || 20,
        total: result.total,
        totalPages: Math.ceil(result.total / (filters.pageSize || 20)),
      });

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
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      page: 1,
    }));
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  // Status options for filter
  const statusOptions = [
    { value: '', label: t('common.all', 'ทั้งหมด') },
    { value: 'on_time', label: t('attendance.onTime', 'ตรงเวลา') },
    { value: 'late', label: t('attendance.late', 'สาย') },
    { value: 'completed', label: t('attendance.completed', 'เสร็จสิ้น') },
    { value: 'early_leave', label: t('attendance.earlyLeave', 'ออกก่อน') },
    { value: 'no_show', label: t('attendance.noShow', 'ไม่มา') },
    { value: 'pending', label: t('attendance.pending', 'รอดำเนินการ') },
  ];

  // Table columns with mobile card priorities
  const columns: ColumnDef<AttendanceLogWithDetails>[] = [
    {
      id: 'employee',
      header: t('attendance.employee', 'พนักงาน'),
      cell: (record) => (
        <div className="flex items-center gap-3">
          <Avatar name={record.employee?.fullName || ''} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
              {record.employee?.fullName || '-'}
            </p>
            <p className="text-xs text-neutral-500">{record.employee?.employeeCode || '-'}</p>
          </div>
        </div>
      ),
      cardPriority: 1,
    },
    {
      id: 'date',
      header: t('attendance.date', 'วันที่'),
      cell: (record) => (
        <span className="text-sm text-neutral-600 dark:text-neutral-300">{formatDate(record.clockInTime)}</span>
      ),
      hideOnMobile: true,
    },
    {
      id: 'clockIn',
      header: t('attendance.clockIn', 'เข้างาน'),
      cell: (record) => (
        <div className="space-y-1">
          <span className="font-mono text-sm font-medium text-neutral-800 dark:text-neutral-100">
            {formatTime(record.clockInTime)}
          </span>
          <LocationAccuracy accuracy={record.clockInAccuracy} />
        </div>
      ),
      cardPriority: 2, // Show clock in time in mobile card
    },
    {
      id: 'clockOut',
      header: t('attendance.clockOut', 'ออกงาน'),
      cell: (record) => (
        <div className="space-y-1">
          <span className="font-mono text-sm font-medium text-neutral-800 dark:text-neutral-100">
            {formatTime(record.clockOutTime)}
          </span>
          {record.clockOutTime && <LocationAccuracy accuracy={record.clockOutAccuracy} />}
        </div>
      ),
    },
    {
      id: 'hours',
      header: t('attendance.hours', 'ชั่วโมง'),
      cell: (record) => (
        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          {record.totalHours ? `${record.totalHours} ${t('attendance.hrs', 'ชม.')}` : '-'}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      id: 'status',
      header: t('attendance.status', 'สถานะ'),
      cell: (record) => {
        const config = STATUS_CONFIG[record.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
        return (
          <Badge variant={config.variant} size="sm">
            {config.label}
          </Badge>
        );
      },
    },
    {
      id: 'shift',
      header: t('attendance.shift', 'กะ'),
      cell: (record) =>
        record.shift ? (
          <span className="text-xs text-neutral-600 dark:text-neutral-300">
            {record.shift.startTime} - {record.shift.endTime}
          </span>
        ) : (
          <span className="text-neutral-400">-</span>
        ),
      hideOnMobile: true,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t('attendance.title', 'การลงเวลา')}
        description={t('attendance.subtitle', 'ดูและจัดการบันทึกการลงเวลาของพนักงาน')}
        actions={
          <div className="flex items-center gap-2">
            <Tabs
              activeTab={viewMode}
              onChange={(id) => setViewMode(id as 'list' | 'map')}
              variant="pills"
              size="sm"
            >
              <TabList>
                <Tab value="list" icon={<List size={16} />}>
                  {t('attendance.listView', 'รายการ')}
                </Tab>
                <Tab value="map" icon={<Map size={16} />}>
                  {t('attendance.mapView', 'แผนที่')}
                </Tab>
              </TabList>
            </Tabs>
            <Button variant="outline" size="sm" leftIcon={<RefreshCw size={16} />} onClick={fetchData} disabled={isLoading}>
              {t('common.refresh', 'รีเฟรช')}
            </Button>
          </div>
        }
      />

      {/* Summary Stats - horizontal scroll on mobile */}
      {summary && (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mobile-scroll-x">
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 min-w-[600px] sm:min-w-0">
            <Stat
              label={t('attendance.expected', 'คาดว่าจะมา')}
              value={summary.expectedToWork}
              icon={<Users size={20} />}
              variant="primary"
            />
            <Stat
              label={t('attendance.clockedIn', 'ลงเวลาแล้ว')}
              value={summary.clockedIn}
              icon={<CheckCircle size={20} />}
              variant="success"
            />
            <Stat
              label={t('attendance.onTime', 'ตรงเวลา')}
              value={summary.onTime}
              icon={<Clock size={20} />}
              variant="info"
            />
            <Stat
              label={t('attendance.late', 'สาย')}
              value={summary.late}
              icon={<AlertTriangle size={20} />}
              variant="warning"
            />
            <Stat
              label={t('attendance.noShow', 'ไม่มา')}
              value={summary.noShow}
              icon={<XCircle size={20} />}
              variant="error"
            />
            <Stat
              label={t('attendance.completed', 'เสร็จสิ้น')}
              value={summary.completed}
              icon={<Flag size={20} />}
              variant="neutral"
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <Card variant="bordered" padding="md" className="mobile-p-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Date Range - stack on mobile */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1">
            <Input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full sm:max-w-[160px]"
            />
            <span className="text-neutral-400 hidden sm:inline">-</span>
            <Input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full sm:max-w-[160px]"
            />
          </div>

          {/* Quick Filters - horizontal scroll on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto mobile-scroll-x -mx-2 px-2 sm:mx-0 sm:px-0">
            {/* Employee Filter */}
            <Menu
              trigger={
                <Button variant="outline" size="md" rightIcon={<ChevronDown size={16} />}>
                  {filters.employeeId
                    ? employees.find((e) => e.id === filters.employeeId)?.fullName || t('attendance.employee', 'พนักงาน')
                    : t('attendance.allEmployees', 'พนักงานทั้งหมด')}
                </Button>
              }
            >
              <MenuItem
                checked={!filters.employeeId}
                onClick={() => handleFilterChange('employeeId', '')}
              >
                {t('common.all', 'ทั้งหมด')}
              </MenuItem>
              {employees.map((emp) => (
                <MenuItem
                  key={emp.id}
                  checked={filters.employeeId === emp.id}
                  onClick={() => handleFilterChange('employeeId', emp.id)}
                >
                  {emp.fullName} ({emp.employeeCode})
                </MenuItem>
              ))}
            </Menu>

            {/* Status Filter */}
            <Menu
              trigger={
                <Button variant="outline" size="md" rightIcon={<ChevronDown size={16} />}>
                  {filters.status
                    ? statusOptions.find((o) => o.value === filters.status)?.label
                    : t('attendance.status', 'สถานะ')}
                </Button>
              }
            >
              {statusOptions.map((option) => (
                <MenuItem
                  key={option.value}
                  checked={filters.status === option.value}
                  onClick={() => handleFilterChange('status', option.value as ListAttendanceQuery['status'])}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Menu>

            {/* Advanced Filters Toggle */}
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

        {/* Advanced Filters (Collapsible) */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  {t('attendance.location', 'สถานที่')}
                </label>
                <select className="w-full h-10 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm">
                  <option value="">{t('common.all', 'ทั้งหมด')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  {t('attendance.accuracy', 'ความแม่นยำ GPS')}
                </label>
                <select className="w-full h-10 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm">
                  <option value="">{t('common.all', 'ทั้งหมด')}</option>
                  <option value="high">{t('attendance.highAccuracy', 'แม่นยำมาก (≤10m)')}</option>
                  <option value="medium">{t('attendance.mediumAccuracy', 'ปานกลาง (≤100m)')}</option>
                  <option value="low">{t('attendance.lowAccuracy', 'ไม่แม่นยำ (>100m)')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  {t('attendance.photoRequired', 'มีรูปถ่าย')}
                </label>
                <select className="w-full h-10 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm">
                  <option value="">{t('common.all', 'ทั้งหมด')}</option>
                  <option value="yes">{t('common.yes', 'มี')}</option>
                  <option value="no">{t('common.no', 'ไม่มี')}</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Error State */}
      {error && (
        <Card variant="bordered" padding="md" className="border-error-200 bg-error-50 dark:bg-error-900/20">
          <div className="flex items-center gap-3 text-error-700 dark:text-error-400">
            <AlertTriangle size={20} />
            <p>{error}</p>
          </div>
        </Card>
      )}

      {/* Content Area */}
      {viewMode === 'list' ? (
        <>
          {/* Attendance Table - with mobile card view */}
          <DataTable
            columns={columns}
            data={records}
            getRowId={(record) => record.id}
            isLoading={isLoading}
            isHoverable
            onRowClick={handleRowClick}
            emptyMessage={t('attendance.noRecords', 'ไม่พบข้อมูลการลงเวลา')}
            useMobileCards
          />

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              totalItems={pagination.total}
              pageSize={pagination.pageSize}
            />
          )}
        </>
      ) : (
        /* Map View Placeholder */
        <Card variant="bordered" padding="lg">
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <Map size={48} className="text-neutral-300 mb-4" />
            <h3 className="text-lg font-medium text-neutral-700 dark:text-neutral-200 mb-2">
              {t('attendance.mapViewTitle', 'แผนที่การลงเวลา')}
            </h3>
            <p className="text-sm text-center max-w-md">
              {t('attendance.mapViewDescription', 'ดูตำแหน่งการลงเวลาของพนักงานบนแผนที่ (อยู่ระหว่างพัฒนา)')}
            </p>
          </div>
        </Card>
      )}

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

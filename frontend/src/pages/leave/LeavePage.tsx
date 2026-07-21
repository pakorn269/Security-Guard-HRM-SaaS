import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {

  CheckCircle,
  XCircle,
  Hourglass,

  CalendarDays,
  List,
  Users,
  CalendarCheck,
  X,
  Check,
  Eye,
  AlertTriangle,
  ChevronDown,
  Filter,
  FileText,
  Download,
} from 'lucide-react';
import { Button, Card, Badge, Modal, Avatar, LoadingSpinner } from '../../components/common';
import { PageHeader } from '../../components/layout';
import { Stat } from '../../components/data-display';
import { Tabs, TabList, Tab, Menu, MenuItem } from '../../components/navigation';
import { DataTable, Pagination, type ColumnDef } from '../../components/data-display';
import ShiftConflictAlert from '../../components/leave/ShiftConflictAlert';
import ReplacementModal from '../../components/leave/ReplacementModal';
import leaveService, {
  type LeaveRequestWithDetails,
  type LeaveSummary,
  type ListLeaveRequestsQuery,
  type LeaveRequestStatus,
} from '../../services/leave.service';
import LeaveCalendar from '../../components/leave/LeaveCalendar';

/**
 * Leave Page - Redesigned (Part 5.6)
 *
 * Changes from original:
 * - PageHeader with consistent layout
 * - Lucide icons instead of emojis
 * - Stat component for summary cards
 * - List + Calendar toggle view
 * - Improved approval modal with Modal component
 * - Enhanced data table with DataTable component
 * - Status badges with Badge component
 */

// Status configuration
const STATUS_CONFIG = {
  pending: { label: 'รออนุมัติ', variant: 'warning' as const, icon: Hourglass },
  approved: { label: 'อนุมัติ', variant: 'success' as const, icon: CheckCircle },
  rejected: { label: 'ไม่อนุมัติ', variant: 'error' as const, icon: XCircle },
  cancelled: { label: 'ยกเลิก', variant: 'neutral' as const, icon: X },
};

// Approval modal component
function ApprovalModal({
  request,
  onClose,
  onApprove,
  onReject,
}: {
  request: LeaveRequestWithDetails;
  onClose: () => void;
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, notes: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  const [showReplacementModal, setShowReplacementModal] = useState(false);

  // Load document URL if document exists
  useEffect(() => {
    const loadDocumentUrl = async () => {
      if (request.documentUrl) {
        try {
          setLoadingDocument(true);
          const response = await leaveService.getLeaveDocumentUrl(request.id);
          setDocumentUrl(response?.url || null);
        } catch (err) {
          console.error('Error loading document URL:', err);
        } finally {
          setLoadingDocument(false);
        }
      }
    };
    loadDocumentUrl();
  }, [request.id, request.documentUrl]);

  // Load conflicts when approving
  const loadConflicts = async () => {
    try {
      setLoadingConflicts(true);
      const data = await leaveService.getLeaveRequestConflicts(request.id);
      setConflicts(data || []);
    } catch (err) {
      console.error('Error loading conflicts:', err);
      setConflicts([]);
    } finally {
      setLoadingConflicts(false);
    }
  };

  // Check for conflicts when user selects approve
  useEffect(() => {
    if (action === 'approve' && conflicts.length === 0 && !loadingConflicts) {
      loadConflicts();
    }
  }, [action]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action) return;

    if (action === 'reject' && !notes.trim()) {
      setError(t('leave.rejectReasonRequired', 'กรุณาระบุเหตุผลในการไม่อนุมัติ'));
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (action === 'approve') {
        // If there are conflicts, show replacement modal
        if (conflicts.length > 0) {
          setShowReplacementModal(true);
          setSubmitting(false);
          return;
        }
        // No conflicts, proceed with normal approval
        await onApprove(request.id, notes || undefined);
      } else {
        await onReject(request.id, notes);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error', 'เกิดข้อผิดพลาด'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveWithReplacements = async (replacements: any[], reviewNotes?: string) => {
    try {
      await leaveService.approveWithReplacements(request.id, {
        reviewNotes: reviewNotes || notes,
        replacements,
      });
      setShowReplacementModal(false);
      onClose();
      // Trigger data reload in parent
      await onApprove(request.id, reviewNotes || notes);
    } catch (err) {
      throw err; // Let ReplacementModal handle the error
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t('leave.requestDetails', 'รายละเอียดคำขอลา')} size="lg">
      <div className="space-y-6">
        {/* Request details */}
        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-neutral-500 mb-1">{t('leave.employee', 'พนักงาน')}</p>
              <div className="flex items-center gap-2">
                <Avatar name={request.employee?.fullName || ''} size="sm" />
                <div>
                  <p className="font-medium text-neutral-800 dark:text-neutral-100">
                    {request.employee?.fullName || '-'}
                  </p>
                  <p className="text-xs text-neutral-500">{request.employee?.employeeCode}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">{t('leave.type', 'ประเภทการลา')}</p>
              <p className="font-medium text-neutral-800 dark:text-neutral-100">
                {request.leaveType?.nameTh || request.leaveType?.name}
              </p>
              {request.leaveType?.isPaid && (
                <span className="text-xs text-success-600">{t('leave.paid', 'ได้รับเงินเดือน')}</span>
              )}
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">{t('leave.dates', 'วันที่ลา')}</p>
              <p className="font-medium text-neutral-800 dark:text-neutral-100">
                {formatDate(request.startDate)}
                {request.startDate !== request.endDate && <> - {formatDate(request.endDate)}</>}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">{t('leave.totalDays', 'จำนวนวัน')}</p>
              <p className="font-semibold text-lg text-neutral-800 dark:text-neutral-100">
                {request.totalDays} {t('leave.days', 'วัน')}
              </p>
            </div>
          </div>
          {request.reason && (
            <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <p className="text-xs text-neutral-500 mb-1">{t('leave.reason', 'เหตุผล')}</p>
              <p className="text-neutral-800 dark:text-neutral-100">{request.reason}</p>
            </div>
          )}
          {request.documentUrl && (
            <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <p className="text-xs text-neutral-500 mb-2">{t('leave.document', 'เอกสารแนบ')}</p>
              {loadingDocument ? (
                <div className="flex items-center gap-2 text-neutral-500">
                  <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                  <span className="text-sm">กำลังโหลดเอกสาร...</span>
                </div>
              ) : documentUrl ? (
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                >
                  <FileText size={18} />
                  {t('leave.viewDocument', 'ดูเอกสาร')}
                  <Download size={16} className="ml-1" />
                </a>
              ) : (
                <p className="text-sm text-error-600 dark:text-error-400">
                  {t('leave.documentLoadError', 'ไม่สามารถโหลดเอกสารได้')}
                </p>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 text-error-700 dark:text-error-400 px-4 py-3 rounded-lg">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {/* Action buttons */}
        {request.status === 'pending' && (
          <>
            {!action ? (
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={<Check size={18} />}
                  className="flex-1"
                  onClick={() => setAction('approve')}
                >
                  {t('leave.approve', 'อนุมัติ')}
                </Button>
                <Button
                  variant="danger"
                  size="lg"
                  leftIcon={<X size={18} />}
                  className="flex-1"
                  onClick={() => setAction('reject')}
                >
                  {t('leave.reject', 'ไม่อนุมัติ')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    {action === 'approve'
                      ? t('leave.notesOptional', 'หมายเหตุ (ถ้ามี)')
                      : t('leave.rejectReason', 'เหตุผลในการไม่อนุมัติ *')}
                  </label>
                  <textarea
                    className="w-full h-24 px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      action === 'approve'
                        ? t('leave.notesPlaceholder', 'ระบุหมายเหตุ...')
                        : t('leave.reasonPlaceholder', 'ระบุเหตุผล...')
                    }
                    required={action === 'reject'}
                  />
                </div>

                {/* Shift Conflicts Alert (shown when approving) */}
                {action === 'approve' && loadingConflicts && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                    <span>Checking for shift conflicts...</span>
                  </div>
                )}
                {action === 'approve' && !loadingConflicts && conflicts.length > 0 && (
                  <ShiftConflictAlert
                    conflicts={conflicts}
                    onAssignReplacements={() => setShowReplacementModal(true)}
                    showAssignButton={true}
                  />
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      setAction(null);
                      setNotes('');
                      setError(null);
                    }}
                    disabled={submitting}
                  >
                    {t('common.cancel', 'ยกเลิก')}
                  </Button>
                  <Button
                    type="submit"
                    variant={action === 'approve' ? 'primary' : 'danger'}
                    className="flex-1"
                    disabled={submitting}
                  >
                    {submitting
                      ? t('common.processing', 'กำลังดำเนินการ...')
                      : action === 'approve'
                        ? t('leave.confirmApprove', 'ยืนยันอนุมัติ')
                        : t('leave.confirmReject', 'ยืนยันไม่อนุมัติ')}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}

        {/* View-only mode for non-pending requests */}
        {request.status !== 'pending' && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              {t('common.close', 'ปิด')}
            </Button>
          </div>
        )}
      </div>

      {/* Replacement Modal */}
      {showReplacementModal && (
        <ReplacementModal
          isOpen={showReplacementModal}
          onClose={() => setShowReplacementModal(false)}
          conflicts={conflicts}
          onSubmit={handleApproveWithReplacements}
          leaveRequestId={request.id}
        />
      )}
    </Modal>
  );
}

export default function LeavePage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Data
  const [summary, setSummary] = useState<LeaveSummary | null>(null);
  const [requests, setRequests] = useState<LeaveRequestWithDetails[]>([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestWithDetails | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filters, setFilters] = useState<ListLeaveRequestsQuery>({
    page: 1,
    pageSize: 20,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryRes, requestsRes] = await Promise.all([
        leaveService.getLeaveSummary(),
        leaveService.listLeaveRequests(filters),
      ]);

      setSummary(summaryRes);
      setRequests(requestsRes.requests);
      setTotalRequests(requestsRes.total);
      setTotalPages(requestsRes.pagination?.totalPages || Math.ceil(requestsRes.total / (filters.pageSize || 20)));
    } catch (err) {
      console.error('Error loading leave data:', err);
      setError(err instanceof Error ? err.message : t('leave.loadError', 'ไม่สามารถโหลดข้อมูลการลาได้'));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle approve
  const handleApprove = async (id: string, notes?: string) => {
    await leaveService.approveLeaveRequest(id, notes);
    setSuccess(t('leave.approveSuccess', 'อนุมัติคำขอลาสำเร็จ'));
    await loadData();
    setTimeout(() => setSuccess(null), 3000);
  };

  // Handle reject
  const handleReject = async (id: string, notes: string) => {
    await leaveService.rejectLeaveRequest(id, notes);
    setSuccess(t('leave.rejectSuccess', 'ไม่อนุมัติคำขอลาสำเร็จ'));
    await loadData();
    setTimeout(() => setSuccess(null), 3000);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof ListLeaveRequestsQuery, value: string | undefined) => {
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
    { value: 'pending', label: t('leave.pending', 'รออนุมัติ') },
    { value: 'approved', label: t('leave.approved', 'อนุมัติแล้ว') },
    { value: 'rejected', label: t('leave.rejected', 'ไม่อนุมัติ') },
    { value: 'cancelled', label: t('leave.cancelled', 'ยกเลิก') },
  ];

  // Table columns
  const columns: ColumnDef<LeaveRequestWithDetails>[] = [
    {
      id: 'employee',
      header: t('leave.employee', 'พนักงาน'),
      cell: (request) => (
        <div className="flex items-center gap-3">
          <Avatar name={request.employee?.fullName || ''} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
              {request.employee?.fullName || '-'}
            </p>
            <p className="text-xs text-neutral-500">{request.employee?.employeeCode}</p>
          </div>
        </div>
      ),
      cardPriority: 1,
    },
    {
      id: 'type',
      header: t('leave.type', 'ประเภท'),
      cell: (request) => (
        <span className="text-sm text-neutral-700 dark:text-neutral-200">
          {request.leaveType?.nameTh || request.leaveType?.name || '-'}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      id: 'dates',
      header: t('leave.dates', 'วันที่'),
      cell: (request) => (
        <span className="text-sm text-neutral-700 dark:text-neutral-200">
          {formatDate(request.startDate)}
          {request.startDate !== request.endDate && <> - {formatDate(request.endDate)}</>}
        </span>
      ),
      cardPriority: 2,
    },
    {
      id: 'days',
      header: t('leave.days', 'วัน'),
      width: '80px',
      align: 'center',
      cell: (request) => (
        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{request.totalDays}</span>
      ),
    },
    {
      id: 'status',
      header: t('leave.status', 'สถานะ'),
      cell: (request) => {
        const config = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
        return (
          <Badge variant={config.variant} size="sm">
            {config.label}
          </Badge>
        );
      },
      cardPriority: 3,
    },
    {
      id: 'actions',
      header: '',
      width: '100px',
      align: 'right',
      cell: (request) => (
        <Button variant="ghost" size="sm" leftIcon={<Eye size={14} />} onClick={() => setSelectedRequest(request)}>
          {request.status === 'pending' ? t('leave.review', 'พิจารณา') : t('common.view', 'ดู')}
        </Button>
      ),
    },
  ];



  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t('leave.title', 'การจัดการลา')}
        description={t('leave.subtitle', 'อนุมัติและจัดการคำขอลาของพนักงาน')}
        hideDescriptionOnMobile
        actions={
          <Tabs
            activeTab={viewMode}
            onChange={(id) => setViewMode(id as 'list' | 'calendar')}
            variant="pills"
            size="sm"
          >
            <TabList>
              <Tab value="list" icon={<List size={16} />}>
                <span className="hidden xs:inline">{t('leave.listView', 'รายการ')}</span>
              </Tab>
              <Tab value="calendar" icon={<CalendarDays size={16} />}>
                <span className="hidden xs:inline">{t('leave.calendarView', 'ปฏิทิน')}</span>
              </Tab>
            </TabList>
          </Tabs>
        }
      />

      {/* Success/Error messages */}
      {success && (
        <Card variant="bordered" padding="md" className="border-success-200 bg-success-50 dark:bg-success-900/20">
          <div className="flex items-center gap-3 text-success-700 dark:text-success-400">
            <CheckCircle size={20} />
            <p>{success}</p>
          </div>
        </Card>
      )}
      {error && (
        <Card variant="bordered" padding="md" className="border-error-200 bg-error-50 dark:bg-error-900/20">
          <div className="flex items-center gap-3 text-error-700 dark:text-error-400">
            <AlertTriangle size={20} />
            <p>{error}</p>
          </div>
        </Card>
      )}

      {viewMode === 'calendar' ? (
        <LeaveCalendar />
      ) : (
        <>
          {/* Summary Stats - horizontal scroll on mobile */}
          {summary && (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mobile-scroll-x">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-[400px] sm:min-w-0">
                <Stat
                  label={t('leave.pendingRequests', 'รออนุมัติ')}
                  value={summary.pendingRequests}
                  icon={<Hourglass size={20} />}
                  variant="warning"
                />
                <Stat
                  label={t('leave.approvedThisMonth', 'อนุมัติเดือนนี้')}
                  value={summary.approvedThisMonth}
                  icon={<CheckCircle size={20} />}
                  variant="success"
                />
                <Stat
                  label={t('leave.onLeaveToday', 'ลาวันนี้')}
                  value={summary.employeesOnLeaveToday}
                  icon={<Users size={20} />}
                  variant="info"
                />
                <Stat
                  label={t('leave.upcomingLeaves', 'ลาสัปดาห์หน้า')}
                  value={summary.upcomingLeaves}
                  icon={<CalendarCheck size={20} />}
                  variant="primary"
                />
              </div>
            </div>
          )}

          {/* Filters */}
          <Card variant="bordered" padding="md" className="mobile-p-sm">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Quick Filters - horizontal scroll on mobile */}
              <div className="flex items-center gap-2 flex-1 overflow-x-auto mobile-scroll-x -mx-2 px-2 sm:mx-0 sm:px-0">
                {/* Status Filter */}
                <Menu
                  trigger={
                    <Button variant="outline" size="md" rightIcon={<ChevronDown size={16} />}>
                      {filters.status
                        ? statusOptions.find((o) => o.value === filters.status)?.label
                        : t('leave.status', 'สถานะ')}
                    </Button>
                  }
                >
                  {statusOptions.map((option) => (
                    <MenuItem
                      key={option.value}
                      checked={filters.status === option.value}
                      onClick={() => handleFilterChange('status', option.value as LeaveRequestStatus)}
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
                      {t('leave.startDate', 'วันที่เริ่มต้น')}
                    </label>
                    <input
                      type="date"
                      className="w-full h-10 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                      value={filters.startDate || ''}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      {t('leave.endDate', 'วันที่สิ้นสุด')}
                    </label>
                    <input
                      type="date"
                      className="w-full h-10 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                      value={filters.endDate || ''}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      {t('leave.leaveType', 'ประเภทการลา')}
                    </label>
                    <select className="w-full h-10 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm">
                      <option value="">{t('common.all', 'ทั้งหมด')}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Requests Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={requests}
                getRowId={(request) => request.id}
                isLoading={loading}
                isHoverable
                emptyMessage={t('leave.noRequests', 'ไม่พบคำขอลา')}
                useMobileCards
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={filters.page || 1}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={totalRequests}
                  pageSize={filters.pageSize || 20}
                />
              )}
            </>
          )}

          {/* Approval Modal */}
          {selectedRequest && (
            <ApprovalModal
              request={selectedRequest}
              onClose={() => setSelectedRequest(null)}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
        </>
      )}
    </div>
  );
}

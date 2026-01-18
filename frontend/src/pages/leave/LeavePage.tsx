import { useState, useEffect, useCallback } from 'react';
import leaveService, {
    type LeaveRequestWithDetails,
    type LeaveSummary,
    type ListLeaveRequestsQuery,
    type LeaveRequestStatus,
} from '../../services/leave.service';
import LeaveCalendar from '../../components/leave/LeaveCalendar';

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
    const [action, setAction] = useState<'approve' | 'reject' | null>(null);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!action) return;

        if (action === 'reject' && !notes.trim()) {
            setError('กรุณาระบุเหตุผลในการไม่อนุมัติ');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            if (action === 'approve') {
                await onApprove(request.id, notes || undefined);
            } else {
                await onReject(request.id, notes);
            }

            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
        } finally {
            setSubmitting(false);
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-surface-800">รายละเอียดคำขอลา</h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center hover:bg-surface-200"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Request details */}
                    <div className="space-y-4 mb-6">
                        <div className="bg-surface-50 rounded-xl p-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-surface-500">พนักงาน</p>
                                    <p className="font-medium text-surface-800">
                                        {request.employee?.fullName || '-'}
                                    </p>
                                    <p className="text-sm text-surface-500">
                                        {request.employee?.employeeCode}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-surface-500">ประเภทการลา</p>
                                    <p className="font-medium text-surface-800">
                                        {request.leaveType?.nameTh || request.leaveType?.name}
                                    </p>
                                    {request.leaveType?.isPaid && (
                                        <span className="text-xs text-success-600">ได้รับเงินเดือน</span>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-surface-500">วันที่ลา</p>
                                    <p className="font-medium text-surface-800">
                                        {formatDate(request.startDate)}
                                        {request.startDate !== request.endDate && (
                                            <> - {formatDate(request.endDate)}</>
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-surface-500">จำนวนวัน</p>
                                    <p className="font-medium text-surface-800 text-lg">
                                        {request.totalDays} วัน
                                    </p>
                                </div>
                            </div>
                            {request.reason && (
                                <div className="mt-4 pt-4 border-t border-surface-200">
                                    <p className="text-sm text-surface-500">เหตุผล</p>
                                    <p className="text-surface-800">{request.reason}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl mb-4">
                            {error}
                        </div>
                    )}

                    {/* Action buttons */}
                    {!action ? (
                        <div className="flex gap-4">
                            <button
                                onClick={() => setAction('approve')}
                                className="flex-1 btn-primary py-3"
                            >
                                ✓ อนุมัติ
                            </button>
                            <button
                                onClick={() => setAction('reject')}
                                className="flex-1 bg-error-500 hover:bg-error-600 text-white py-3 rounded-xl font-medium transition-colors"
                            >
                                ✕ ไม่อนุมัติ
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-2">
                                    {action === 'approve' ? 'หมายเหตุ (ถ้ามี)' : 'เหตุผลในการไม่อนุมัติ *'}
                                </label>
                                <textarea
                                    className="input-base"
                                    rows={3}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder={action === 'approve' ? 'ระบุหมายเหตุ...' : 'ระบุเหตุผล...'}
                                    required={action === 'reject'}
                                />
                            </div>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAction(null);
                                        setNotes('');
                                        setError(null);
                                    }}
                                    className="flex-1 btn-outline py-3"
                                    disabled={submitting}
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className={`flex-1 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 ${action === 'approve'
                                        ? 'bg-success-500 hover:bg-success-600 text-white'
                                        : 'bg-error-500 hover:bg-error-600 text-white'
                                        }`}
                                    disabled={submitting}
                                >
                                    {submitting ? 'กำลังดำเนินการ...' : action === 'approve' ? 'ยืนยันอนุมัติ' : 'ยืนยันไม่อนุมัติ'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function LeavePage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showCalendar, setShowCalendar] = useState(false);

    // Data
    const [summary, setSummary] = useState<LeaveSummary | null>(null);
    const [requests, setRequests] = useState<LeaveRequestWithDetails[]>([]);
    const [totalRequests, setTotalRequests] = useState(0);
    const [selectedRequest, setSelectedRequest] = useState<LeaveRequestWithDetails | null>(null);

    // Filters
    const [filters, setFilters] = useState<ListLeaveRequestsQuery>({
        page: 1,
        pageSize: 20,
        status: 'pending' as LeaveRequestStatus,
    });

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
        } catch (err) {
            console.error('Error loading leave data:', err);
            setError('ไม่สามารถโหลดข้อมูลการลาได้');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle approve
    const handleApprove = async (id: string, notes?: string) => {
        await leaveService.approveLeaveRequest(id, notes);
        setSuccess('อนุมัติคำขอลาสำเร็จ');
        await loadData();
        setTimeout(() => setSuccess(null), 3000);
    };

    // Handle reject
    const handleReject = async (id: string, notes: string) => {
        await leaveService.rejectLeaveRequest(id, notes);
        setSuccess('ไม่อนุมัติคำขอลาสำเร็จ');
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

    // Get status display
    const getStatusDisplay = (status: string) => {
        switch (status) {
            case 'pending':
                return { text: 'รออนุมัติ', className: 'bg-warning-100 text-warning-700' };
            case 'approved':
                return { text: 'อนุมัติ', className: 'bg-success-100 text-success-700' };
            case 'rejected':
                return { text: 'ไม่อนุมัติ', className: 'bg-error-100 text-error-700' };
            case 'cancelled':
                return { text: 'ยกเลิก', className: 'bg-surface-100 text-surface-600' };
            default:
                return { text: status, className: 'bg-surface-100 text-surface-600' };
        }
    };

    const totalPages = Math.ceil(totalRequests / (filters.pageSize || 20));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-800">การจัดการลา</h1>
                    <p className="text-surface-500">อนุมัติและจัดการคำขอลาของพนักงาน</p>
                </div>
                <div className="flex bg-surface-100 rounded-lg p-1">
                    <button
                        onClick={() => setShowCalendar(false)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!showCalendar
                                ? 'bg-white text-primary-600 shadow-sm'
                                : 'text-surface-600 hover:text-surface-800'
                            }`}
                    >
                        📋 รายการ
                    </button>
                    <button
                        onClick={() => setShowCalendar(true)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showCalendar
                                ? 'bg-white text-primary-600 shadow-sm'
                                : 'text-surface-600 hover:text-surface-800'
                            }`}
                    >
                        📅 ปฏิทิน
                    </button>
                </div>
            </div>

            {/* Success/Error messages */}
            {success && (
                <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-xl">
                    ✅ {success}
                </div>
            )}
            {error && (
                <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl">
                    ⚠️ {error}
                </div>
            )}

            {showCalendar ? (
                <LeaveCalendar />
            ) : (
                <>
                    {/* Summary cards */}
                    {summary && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="card p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-warning-100 flex items-center justify-center">
                                        <span className="text-2xl">⏳</span>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-warning-600">{summary.pendingRequests}</p>
                                        <p className="text-sm text-surface-500">รออนุมัติ</p>
                                    </div>
                                </div>
                            </div>
                            <div className="card p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center">
                                        <span className="text-2xl">✓</span>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-success-600">{summary.approvedThisMonth}</p>
                                        <p className="text-sm text-surface-500">อนุมัติเดือนนี้</p>
                                    </div>
                                </div>
                            </div>
                            <div className="card p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                                        <span className="text-2xl">🏖️</span>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-primary-600">{summary.employeesOnLeaveToday}</p>
                                        <p className="text-sm text-surface-500">ลาวันนี้</p>
                                    </div>
                                </div>
                            </div>
                            <div className="card p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center">
                                        <span className="text-2xl">📅</span>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-accent-600">{summary.upcomingLeaves}</p>
                                        <p className="text-sm text-surface-500">ลาสัปดาห์หน้า</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="card p-4">
                        <div className="flex flex-wrap gap-4">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-surface-700 mb-1">สถานะ</label>
                                <select
                                    className="input-base"
                                    value={filters.status || ''}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value as LeaveRequestStatus || undefined, page: 1 })}
                                >
                                    <option value="">ทั้งหมด</option>
                                    <option value="pending">รออนุมัติ</option>
                                    <option value="approved">อนุมัติแล้ว</option>
                                    <option value="rejected">ไม่อนุมัติ</option>
                                    <option value="cancelled">ยกเลิก</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-1">วันที่เริ่ม</label>
                                <input
                                    type="date"
                                    className="input-base"
                                    value={filters.startDate || ''}
                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined, page: 1 })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-1">วันที่สิ้นสุด</label>
                                <input
                                    type="date"
                                    className="input-base"
                                    value={filters.endDate || ''}
                                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined, page: 1 })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Requests table */}
                    <div className="card overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 spinner"></div>
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-4">📋</div>
                                <p className="text-surface-500">ไม่พบคำขอลา</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-surface-50 border-b border-surface-200">
                                            <tr>
                                                <th className="text-left px-4 py-3 text-sm font-medium text-surface-600">พนักงาน</th>
                                                <th className="text-left px-4 py-3 text-sm font-medium text-surface-600">ประเภท</th>
                                                <th className="text-left px-4 py-3 text-sm font-medium text-surface-600">วันที่</th>
                                                <th className="text-center px-4 py-3 text-sm font-medium text-surface-600">จำนวนวัน</th>
                                                <th className="text-center px-4 py-3 text-sm font-medium text-surface-600">สถานะ</th>
                                                <th className="text-right px-4 py-3 text-sm font-medium text-surface-600">การดำเนินการ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-surface-100">
                                            {requests.map((request) => {
                                                const statusDisplay = getStatusDisplay(request.status);
                                                return (
                                                    <tr key={request.id} className="hover:bg-surface-50">
                                                        <td className="px-4 py-3">
                                                            <div>
                                                                <p className="font-medium text-surface-800">
                                                                    {request.employee?.fullName || '-'}
                                                                </p>
                                                                <p className="text-sm text-surface-500">
                                                                    {request.employee?.employeeCode}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="text-surface-800">
                                                                {request.leaveType?.nameTh || request.leaveType?.name || '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="text-surface-800">
                                                                {formatDate(request.startDate)}
                                                                {request.startDate !== request.endDate && (
                                                                    <> - {formatDate(request.endDate)}</>
                                                                )}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="font-medium text-surface-800">
                                                                {request.totalDays}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusDisplay.className}`}>
                                                                {statusDisplay.text}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                onClick={() => setSelectedRequest(request)}
                                                                className="text-primary-600 hover:text-primary-800 font-medium text-sm"
                                                            >
                                                                {request.status === 'pending' ? 'พิจารณา' : 'ดูรายละเอียด'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-4 py-3 border-t border-surface-200">
                                        <p className="text-sm text-surface-500">
                                            แสดง {((filters.page || 1) - 1) * (filters.pageSize || 20) + 1} -{' '}
                                            {Math.min((filters.page || 1) * (filters.pageSize || 20), totalRequests)} จาก {totalRequests} รายการ
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                                                disabled={(filters.page || 1) <= 1}
                                                className="px-3 py-1 rounded-lg border border-surface-200 text-surface-600 hover:bg-surface-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                ก่อนหน้า
                                            </button>
                                            <button
                                                onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                                                disabled={(filters.page || 1) >= totalPages}
                                                className="px-3 py-1 rounded-lg border border-surface-200 text-surface-600 hover:bg-surface-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                ถัดไป
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Approval modal */}
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

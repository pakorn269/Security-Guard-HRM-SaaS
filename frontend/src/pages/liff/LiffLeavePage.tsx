import { useState, useEffect, useCallback } from 'react';
import {
    Palmtree,
    CheckCircle,
    AlertTriangle,
    Plus,
    Clock,
    X,
    Loader2,
} from 'lucide-react';
import leaveService, {
    type LeaveBalanceWithType,
    type LeaveRequestWithDetails,
    type MyLeaveDataResponse,
} from '../../services/leave.service';
import type { LeaveType } from '../../types/leave.types';

export default function LiffLeavePage() {
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Data
    const [leaveData, setLeaveData] = useState<MyLeaveDataResponse | null>(null);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        reason: '',
    });

    // Load data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [leaveDataRes, leaveTypesRes] = await Promise.all([
                leaveService.getMyLeaveData(),
                leaveService.listLeaveTypes(),
            ]);

            setLeaveData(leaveDataRes);
            setLeaveTypes(leaveTypesRes.filter(t => t.isActive));
        } catch (err) {
            console.error('Error loading leave data:', err);
            setError('ไม่สามารถโหลดข้อมูลการลาได้');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Calculate days between dates
    const calculateDays = (start: string, end: string): number => {
        if (!start || !end) return 0;
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    // Handle form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.leaveTypeId || !formData.startDate || !formData.endDate) {
            setError('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            await leaveService.createLeaveRequest({
                leaveTypeId: formData.leaveTypeId,
                startDate: formData.startDate,
                endDate: formData.endDate,
                reason: formData.reason || undefined,
            });

            setSuccess('ส่งคำขอลาสำเร็จ');
            setShowForm(false);
            setFormData({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });

            // Reload data
            await loadData();

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถส่งคำขอลาได้';
            setError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle cancel leave request
    const handleCancel = async (requestId: string) => {
        if (!confirm('คุณต้องการยกเลิกคำขอลานี้หรือไม่?')) return;

        try {
            await leaveService.cancelLeaveRequest(requestId);
            setSuccess('ยกเลิกคำขอลาสำเร็จ');
            await loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถยกเลิกคำขอลาได้';
            setError(errorMessage);
        }
    };

    // Format date for display
    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
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

    // Get color class based on leave type index
    const getBalanceColor = (index: number) => {
        const colors = ['primary', 'error', 'accent', 'success', 'warning'];
        return colors[index % colors.length];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={48} className="text-primary-500 animate-spin" />
                    <p className="text-surface-500">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="text-center py-2">
                <div className="flex items-center justify-center gap-2">
                    <Palmtree size={24} className="text-primary-500" />
                    <h1 className="text-xl font-bold text-surface-800">การลา</h1>
                </div>
            </div>

            {/* Success message */}
            {success && (
                <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-xl animate-fade-in flex items-center gap-2">
                    <CheckCircle size={18} />
                    {success}
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl animate-fade-in flex items-center gap-2">
                    <AlertTriangle size={18} />
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-error-500 hover:text-error-700"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Leave balances */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <h2 className="font-semibold text-surface-800 mb-3">วันลาคงเหลือ</h2>
                <div className="space-y-3">
                    {leaveData?.balances.map((balance: LeaveBalanceWithType, index: number) => {
                        const remaining = balance.remainingDays;
                        const total = balance.entitledDays;
                        const percentage = total > 0 ? (remaining / total) * 100 : 0;
                        const color = getBalanceColor(index);

                        return (
                            <div key={balance.id}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-surface-600">
                                        {balance.leaveType?.nameTh || balance.leaveType?.name || 'ประเภทการลา'}
                                    </span>
                                    <span className="font-medium text-surface-800">
                                        {remaining}/{total} วัน
                                        {balance.pendingDays > 0 && (
                                            <span className="text-warning-600 text-xs ml-1">
                                                (รอ {balance.pendingDays})
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full bg-${color}-500 rounded-full transition-all`}
                                        style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    {(!leaveData?.balances || leaveData.balances.length === 0) && (
                        <p className="text-surface-500 text-sm text-center py-2">
                            ไม่มีข้อมูลวันลา
                        </p>
                    )}
                </div>
            </div>

            {/* Request leave button */}
            <button
                onClick={() => setShowForm(true)}
                className="w-full btn-primary py-3 text-lg flex items-center justify-center gap-2"
            >
                <Plus size={20} />
                ขอลาใหม่
            </button>

            {/* Pending requests */}
            {leaveData?.pendingRequests && leaveData.pendingRequests.length > 0 && (
                <div className="bg-warning-50 rounded-xl p-4 border border-warning-200">
                    <h2 className="font-semibold text-warning-800 mb-3 flex items-center gap-2">
                        <Clock size={18} />
                        คำขอที่รออนุมัติ ({leaveData.pendingRequests.length})
                    </h2>
                    <div className="space-y-2">
                        {leaveData.pendingRequests.map((request: LeaveRequestWithDetails) => (
                            <div
                                key={request.id}
                                className="bg-white rounded-lg p-3 flex items-center justify-between"
                            >
                                <div>
                                    <p className="font-medium text-surface-800">
                                        {request.leaveType?.nameTh || request.leaveType?.name}
                                    </p>
                                    <p className="text-sm text-surface-500">
                                        {formatDate(request.startDate)}
                                        {request.startDate !== request.endDate && ` - ${formatDate(request.endDate)}`}
                                        <span className="ml-2 font-medium">({request.totalDays} วัน)</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleCancel(request.id)}
                                    className="text-error-600 hover:text-error-800 text-sm font-medium"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Leave history */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <h2 className="font-semibold text-surface-800 mb-3">ประวัติการลา</h2>
                <div className="space-y-3">
                    {leaveData?.recentRequests.map((request: LeaveRequestWithDetails) => {
                        const statusDisplay = getStatusDisplay(request.status);

                        return (
                            <div
                                key={request.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-surface-50"
                            >
                                <div>
                                    <p className="font-medium text-surface-800">
                                        {request.leaveType?.nameTh || request.leaveType?.name}
                                    </p>
                                    <p className="text-sm text-surface-500">
                                        {formatDate(request.startDate)}
                                        {request.startDate !== request.endDate && ` - ${formatDate(request.endDate)}`}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-surface-800">{request.totalDays} วัน</p>
                                    <span
                                        className={`text-xs px-2 py-1 rounded-full ${statusDisplay.className}`}
                                    >
                                        {statusDisplay.text}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    {(!leaveData?.recentRequests || leaveData.recentRequests.length === 0) && (
                        <p className="text-surface-500 text-sm text-center py-4">
                            ไม่มีประวัติการลา
                        </p>
                    )}
                </div>
            </div>

            {/* Leave request form modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-end z-50 animate-fade-in">
                    <div className="w-full bg-white rounded-t-3xl p-6 animate-slide-up max-h-[85vh] overflow-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-surface-800">ขอลาใหม่</h2>
                            <button
                                onClick={() => {
                                    setShowForm(false);
                                    setFormData({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
                                }}
                                className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-2">
                                    ประเภทการลา <span className="text-error-500">*</span>
                                </label>
                                <select
                                    className="input-base"
                                    value={formData.leaveTypeId}
                                    onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                                    required
                                >
                                    <option value="">เลือกประเภทการลา</option>
                                    {leaveTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.nameTh || type.name}
                                            {type.maxDaysPerYear && ` (สูงสุด ${type.maxDaysPerYear} วัน/ปี)`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-surface-700 mb-2">
                                        วันที่เริ่ม <span className="text-error-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        className="input-base"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        min={new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-surface-700 mb-2">
                                        วันที่สิ้นสุด <span className="text-error-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        className="input-base"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        min={formData.startDate || new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                </div>
                            </div>

                            {formData.startDate && formData.endDate && (
                                <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 text-center">
                                    <span className="text-primary-700 font-medium">
                                        จำนวนวันลา: {calculateDays(formData.startDate, formData.endDate)} วัน
                                    </span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-2">
                                    เหตุผล
                                </label>
                                <textarea
                                    className="input-base"
                                    rows={3}
                                    placeholder="ระบุเหตุผลการลา..."
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 size={20} className="animate-spin" />
                                        กำลังส่ง...
                                    </span>
                                ) : (
                                    'ส่งคำขอ'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

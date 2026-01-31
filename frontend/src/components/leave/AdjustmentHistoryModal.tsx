import { useState, useEffect } from 'react';
import { X, Clock, Download, Loader2, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import Modal from '../common/Modal';
import type { BalanceAdjustment, LeaveBalance } from '../../types/leave.types';

interface AdjustmentHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    balance: LeaveBalance;
    onLoadHistory: (balanceId: string) => Promise<BalanceAdjustment[]>;
}

const FIELD_LABELS: Record<string, { th: string; en: string }> = {
    entitled_days: { th: 'วันที่มีสิทธิ', en: 'Entitled Days' },
    used_days: { th: 'วันที่ใช้ไป', en: 'Used Days' },
    pending_days: { th: 'วันที่รออนุมัติ', en: 'Pending Days' },
};

const ADJUSTMENT_TYPE_LABELS: Record<string, { th: string; en: string }> = {
    manual: { th: 'ปรับด้วยตนเอง', en: 'Manual' },
    pro_rated: { th: 'คำนวณตามสัดส่วน', en: 'Pro-rated' },
    correction: { th: 'แก้ไขข้อผิดพลาด', en: 'Correction' },
    special_allowance: { th: 'สิทธิพิเศษ', en: 'Special Allowance' },
    carry_forward: { th: 'ยกยอดมา', en: 'Carry Forward' },
};

export default function AdjustmentHistoryModal({
    isOpen,
    onClose,
    balance,
    onLoadHistory,
}: AdjustmentHistoryModalProps) {
    const [adjustments, setAdjustments] = useState<BalanceAdjustment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load adjustment history when modal opens
    useEffect(() => {
        if (isOpen) {
            loadHistory();
        }
    }, [isOpen, balance.id]);

    const loadHistory = async () => {
        setLoading(true);
        setError(null);

        try {
            const history = await onLoadHistory(balance.id);
            setAdjustments(history);
        } catch (err) {
            console.error('Error loading adjustment history:', err);
            setError('ไม่สามารถโหลดประวัติการปรับยอดได้');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const exportToCSV = () => {
        const headers = [
            'วันที่',
            'ปรับโดย',
            'ฟิลด์',
            'ค่าเดิม',
            'ค่าใหม่',
            'การเปลี่ยนแปลง',
            'ประเภท',
            'เหตุผล',
        ];

        const rows = adjustments.map((adj) => [
            formatDate(adj.createdAt),
            adj.adjuster?.email || 'N/A',
            FIELD_LABELS[adj.fieldName]?.th || adj.fieldName,
            adj.previousValue,
            adj.newValue,
            adj.adjustmentAmount,
            ADJUSTMENT_TYPE_LABELS[adj.adjustmentType || 'manual']?.th || adj.adjustmentType,
            adj.reason,
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `adjustment-history-${balance.id}-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <div className="bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-primary p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Clock size={24} />
                            <div>
                                <h2 className="text-2xl font-bold">ประวัติการปรับยอด</h2>
                                <p className="text-sm text-white/80 mt-1">
                                    {balance.employee?.fullName} - {balance.leaveType?.nameTh || balance.leaveType?.name} ({balance.year})
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Actions */}
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-surface-600">
                            {adjustments.length > 0 ? `พบ ${adjustments.length} รายการ` : ''}
                        </p>
                        {adjustments.length > 0 && (
                            <button
                                onClick={exportToCSV}
                                className="flex items-center gap-2 px-4 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg transition-colors text-sm font-medium"
                            >
                                <Download size={16} />
                                ส่งออก CSV
                            </button>
                        )}
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={32} className="text-primary-500 animate-spin" />
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl">
                            {error}
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && !error && adjustments.length === 0 && (
                        <div className="text-center py-12">
                            <Clock size={48} className="text-surface-300 mx-auto mb-4" />
                            <p className="text-surface-600">ไม่มีประวัติการปรับยอด</p>
                            <p className="text-sm text-surface-500 mt-1">
                                ยอดคงเหลือนี้ยังไม่เคยถูกปรับแก้
                            </p>
                        </div>
                    )}

                    {/* Adjustment History Table */}
                    {!loading && !error && adjustments.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-surface-200 bg-surface-50">
                                        <th className="px-4 py-3 text-left text-xs font-medium text-surface-600 uppercase">
                                            วันที่/เวลา
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-surface-600 uppercase">
                                            ปรับโดย
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-surface-600 uppercase">
                                            ฟิลด์
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-surface-600 uppercase">
                                            การเปลี่ยนแปลง
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-surface-600 uppercase">
                                            ประเภท
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-surface-600 uppercase">
                                            เหตุผล
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-200">
                                    {adjustments.map((adjustment) => {
                                        const isIncrease = adjustment.adjustmentAmount > 0;
                                        const isDecrease = adjustment.adjustmentAmount < 0;

                                        return (
                                            <tr key={adjustment.id} className="hover:bg-surface-50">
                                                <td className="px-4 py-4 text-sm text-surface-800 whitespace-nowrap">
                                                    {formatDate(adjustment.createdAt)}
                                                </td>
                                                <td className="px-4 py-4 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-semibold">
                                                            {adjustment.adjuster?.email.charAt(0).toUpperCase() || 'A'}
                                                        </div>
                                                        <span className="text-surface-800">
                                                            {adjustment.adjuster?.email || 'Unknown'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-surface-600">
                                                    <div>
                                                        <p className="font-medium text-surface-800">
                                                            {FIELD_LABELS[adjustment.fieldName]?.th}
                                                        </p>
                                                        <p className="text-xs text-surface-500">
                                                            {FIELD_LABELS[adjustment.fieldName]?.en}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-sm">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="font-semibold text-surface-800">
                                                            {adjustment.previousValue}
                                                        </span>
                                                        <ArrowRight size={16} className="text-surface-400" />
                                                        <span className="font-semibold text-surface-800">
                                                            {adjustment.newValue}
                                                        </span>
                                                        <span className={`ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                            isIncrease ? 'bg-success-100 text-success-700' :
                                                            isDecrease ? 'bg-error-100 text-error-700' :
                                                            'bg-surface-100 text-surface-700'
                                                        }`}>
                                                            {isIncrease && <TrendingUp size={12} />}
                                                            {isDecrease && <TrendingDown size={12} />}
                                                            {isIncrease && '+'}
                                                            {adjustment.adjustmentAmount}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-sm">
                                                    <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                                                        {ADJUSTMENT_TYPE_LABELS[adjustment.adjustmentType || 'manual']?.th}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-surface-600 max-w-md">
                                                    <p className="line-clamp-2" title={adjustment.reason}>
                                                        {adjustment.reason}
                                                    </p>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-surface-200 px-6 py-4 bg-surface-50">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2.5 bg-white border border-surface-300 text-surface-700 rounded-xl hover:bg-surface-50 transition-colors font-medium"
                    >
                        ปิด
                    </button>
                </div>
            </div>
        </Modal>
    );
}

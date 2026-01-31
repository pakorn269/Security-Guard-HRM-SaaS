import { useState, useEffect } from 'react';
import { X, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Modal from '../common/Modal';
import type { LeaveBalance, AdjustBalanceRequest, AdjustmentFieldName, AdjustmentType } from '../../types/leave.types';

interface BalanceAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    balance: LeaveBalance;
    onSubmit: (data: AdjustBalanceRequest) => Promise<void>;
}

const ADJUSTMENT_TYPES: { value: AdjustmentType; label: string; labelTh: string }[] = [
    { value: 'manual', label: 'Manual Adjustment', labelTh: 'ปรับด้วยตนเอง' },
    { value: 'pro_rated', label: 'Pro-rated', labelTh: 'คำนวณตามสัดส่วน' },
    { value: 'correction', label: 'Correction', labelTh: 'แก้ไขข้อผิดพลาด' },
    { value: 'special_allowance', label: 'Special Allowance', labelTh: 'สิทธิพิเศษ' },
    { value: 'carry_forward', label: 'Carry Forward', labelTh: 'ยกยอดมา' },
];

const FIELD_OPTIONS: { value: AdjustmentFieldName; label: string; labelTh: string }[] = [
    { value: 'entitled_days', label: 'Entitled Days', labelTh: 'วันที่มีสิทธิ' },
    { value: 'used_days', label: 'Used Days', labelTh: 'วันที่ใช้ไป' },
    { value: 'pending_days', label: 'Pending Days', labelTh: 'วันที่รออนุมัติ' },
];

export default function BalanceAdjustmentModal({
    isOpen,
    onClose,
    balance,
    onSubmit,
}: BalanceAdjustmentModalProps) {
    const [fieldName, setFieldName] = useState<AdjustmentFieldName>('entitled_days');
    const [newValue, setNewValue] = useState('');
    const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('manual');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get current value based on selected field
    const currentValue = balance[fieldName as keyof LeaveBalance] as number;
    const newValueNum = parseFloat(newValue) || 0;
    const difference = newValueNum - currentValue;

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFieldName('entitled_days');
            setNewValue('');
            setAdjustmentType('manual');
            setReason('');
            setError(null);
        }
    }, [isOpen]);

    // Validation
    const validate = (): string | null => {
        if (!newValue || newValue.trim() === '') {
            return 'New value is required';
        }

        if (newValueNum < 0) {
            return 'Value cannot be negative';
        }

        if (newValueNum > 365) {
            return 'Value cannot exceed 365 days';
        }

        if (newValueNum === currentValue) {
            return 'New value must be different from current value';
        }

        if (!reason || reason.trim().length < 10) {
            return 'Reason must be at least 10 characters';
        }

        // Additional validation: Cannot reduce entitled_days below used_days
        if (fieldName === 'entitled_days' && newValueNum < balance.usedDays) {
            return `Cannot reduce entitled days below used days (${balance.usedDays})`;
        }

        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await onSubmit({
                fieldName,
                newValue: newValueNum,
                reason: reason.trim(),
                adjustmentType,
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to adjust balance');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <div className="bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-primary p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">ปรับยอดวันลา</h2>
                            <p className="text-sm text-white/80 mt-1">
                                {balance.employee?.fullName} - {balance.leaveType?.nameTh || balance.leaveType?.name}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl flex items-start gap-3">
                            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium">ข้อผิดพลาด</p>
                                <p className="text-sm mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Field Selection */}
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-2">
                            ฟิลด์ที่ต้องการปรับ <span className="text-error-500">*</span>
                        </label>
                        <select
                            value={fieldName}
                            onChange={(e) => setFieldName(e.target.value as AdjustmentFieldName)}
                            className="w-full px-4 py-2.5 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                            {FIELD_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.labelTh} ({option.label})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Current vs New Value Comparison */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-surface-50 rounded-xl p-4">
                            <p className="text-xs text-surface-500 mb-1">ค่าปัจจุบัน</p>
                            <p className="text-2xl font-bold text-surface-800">{currentValue}</p>
                            <p className="text-xs text-surface-500 mt-1">วัน</p>
                        </div>

                        <div className="flex items-center justify-center">
                            {difference > 0 && <TrendingUp size={32} className="text-success-500" />}
                            {difference < 0 && <TrendingDown size={32} className="text-error-500" />}
                            {difference === 0 && <Minus size={32} className="text-surface-400" />}
                        </div>

                        <div className={`rounded-xl p-4 ${
                            difference > 0 ? 'bg-success-50' :
                            difference < 0 ? 'bg-error-50' :
                            'bg-surface-50'
                        }`}>
                            <p className="text-xs text-surface-500 mb-1">ค่าใหม่</p>
                            <p className={`text-2xl font-bold ${
                                difference > 0 ? 'text-success-700' :
                                difference < 0 ? 'text-error-700' :
                                'text-surface-800'
                            }`}>
                                {newValueNum || 0}
                            </p>
                            <p className={`text-xs mt-1 font-medium ${
                                difference > 0 ? 'text-success-600' :
                                difference < 0 ? 'text-error-600' :
                                'text-surface-500'
                            }`}>
                                {difference !== 0 && (difference > 0 ? '+' : '')}{difference !== 0 ? difference : '—'} วัน
                            </p>
                        </div>
                    </div>

                    {/* New Value Input */}
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-2">
                            ค่าใหม่ <span className="text-error-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="365"
                            step="0.5"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            className="w-full px-4 py-2.5 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="0"
                        />
                        <p className="text-xs text-surface-500 mt-1">
                            ระบุจำนวนวันใหม่ (0-365)
                        </p>
                    </div>

                    {/* Adjustment Type */}
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-2">
                            ประเภทการปรับ
                        </label>
                        <select
                            value={adjustmentType}
                            onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
                            className="w-full px-4 py-2.5 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                            {ADJUSTMENT_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.labelTh} ({type.label})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-2">
                            เหตุผล <span className="text-error-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2.5 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                            placeholder="โปรดระบุเหตุผลในการปรับยอด (อย่างน้อย 10 ตัวอักษร)"
                        />
                        <p className="text-xs text-surface-500 mt-1">
                            {reason.length}/1000 ตัวอักษร (ต้องการอย่างน้อย 10 ตัวอักษร)
                        </p>
                    </div>

                    {/* Confirmation Message */}
                    {newValue && difference !== 0 && (
                        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                            <p className="text-sm text-primary-700">
                                <strong>ยืนยันการเปลี่ยนแปลง:</strong> คุณกำลังจะเปลี่ยน{' '}
                                {FIELD_OPTIONS.find(f => f.value === fieldName)?.labelTh}{' '}
                                จาก <strong>{currentValue}</strong> เป็น <strong>{newValueNum}</strong>{' '}
                                ({difference > 0 ? '+' : ''}{difference} วัน)
                            </p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-surface-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-surface-300 text-surface-700 rounded-xl hover:bg-surface-50 transition-colors font-medium"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !newValue || !reason}
                            className="flex-1 px-4 py-2.5 bg-gradient-primary text-white rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการปรับยอด'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

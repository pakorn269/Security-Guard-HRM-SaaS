import { useState } from 'react';
import { MapPin, AlertTriangle, Pencil } from 'lucide-react';
import { Modal, Button, Input } from '../../components/common';
import {
    adjustAttendance,
    type AttendanceLogWithDetails,
    type AdjustAttendanceRequest
} from '../../services/attendance.service';
import { formatThaiDateTime } from '../../utils/date.utils';

interface AttendanceDetailModalProps {
    attendance: AttendanceLogWithDetails;
    onClose: () => void;
    onUpdate: () => void;
}

export default function AttendanceDetailModal({
    attendance,
    onClose,
    onUpdate,
}: AttendanceDetailModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Edit form state
    const [editData, setEditData] = useState<AdjustAttendanceRequest>({
        clockInTime: attendance.clockInTime || undefined,
        clockOutTime: attendance.clockOutTime || undefined,
        status: attendance.status,
        notes: attendance.notes || undefined,
        adjustmentReason: '',
    });

    // Format time for display (using Thai Buddhist Era full format)
    const formatDateTimeDisplay = (timeStr: string | null | undefined): string => {
        if (!timeStr) return '-';
        // Use full format: "29 มกราคม 2569 08:00 น."
        return formatThaiDateTime(timeStr, false);
    };

    // Format datetime for datetime-local input (local time)
    const formatDateTimeForInput = (isoString: string | null | undefined): string => {
        if (!isoString) return '';
        const date = new Date(isoString);
        // Format as YYYY-MM-DDTHH:mm (local time)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Handle submit
    const handleSubmit = async () => {
        if (!editData.adjustmentReason.trim()) {
            setError('กรุณาระบุเหตุผลในการแก้ไข');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await adjustAttendance(attendance.id, editData);
            onUpdate();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'ไม่สามารถแก้ไขได้');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Status options
    const statusOptions = [
        { value: 'on_time', label: 'ตรงเวลา' },
        { value: 'late', label: 'สาย' },
        { value: 'completed', label: 'เสร็จสิ้น' },
        { value: 'early_leave', label: 'ออกก่อน' },
        { value: 'no_show', label: 'ไม่มา' },
        { value: 'pending', label: 'รอดำเนินการ' },
    ];

    // Get status label
    const getStatusLabel = (status: string): string => {
        const option = statusOptions.find(opt => opt.value === status);
        return option?.label || status;
    };

    // Get status color
    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'on_time':
                return 'text-success-600';
            case 'late':
                return 'text-warning-600';
            case 'completed':
                return 'text-primary-600';
            case 'early_leave':
                return 'text-warning-600';
            case 'no_show':
                return 'text-error-600';
            default:
                return 'text-neutral-600 dark:text-neutral-400';
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={isEditing ? 'แก้ไขการลงเวลา' : 'รายละเอียดการลงเวลา'}
            size="lg"
        >
            <div className="space-y-6">
                {/* Employee Info */}
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 dark:text-primary-300 font-bold text-lg">
                                {attendance.employee?.fullName?.charAt(0) || '?'}
                            </span>
                        </div>
                        <div>
                            <p className="font-semibold text-neutral-800 dark:text-neutral-100">
                                {attendance.employee?.fullName || '-'}
                            </p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                รหัส: {attendance.employee?.employeeCode || '-'}
                            </p>
                        </div>
                    </div>
                </div>

                {isEditing ? (
                    // Edit Form
                    <div className="space-y-4">
                        <div>
                            <Input
                                type="datetime-local"
                                label="เวลาเข้า"
                                value={formatDateTimeForInput(editData.clockInTime)}
                                onChange={(e) => setEditData(prev => ({
                                    ...prev,
                                    clockInTime: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                                }))}
                            />
                            {editData.clockInTime && (
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                    ตรงกับ: {formatThaiDateTime(editData.clockInTime, false)}
                                </p>
                            )}
                        </div>
                        <div>
                            <Input
                                type="datetime-local"
                                label="เวลาออก"
                                value={formatDateTimeForInput(editData.clockOutTime)}
                                onChange={(e) => setEditData(prev => ({
                                    ...prev,
                                    clockOutTime: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                                }))}
                            />
                            {editData.clockOutTime && (
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                    ตรงกับ: {formatThaiDateTime(editData.clockOutTime, false)}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                สถานะ
                            </label>
                            <select
                                className="appearance-none block w-full rounded-xl border px-4 py-2.5 pr-10 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent border-neutral-300 dark:border-neutral-600"
                                value={editData.status || ''}
                                onChange={(e) => setEditData(prev => ({
                                    ...prev,
                                    status: e.target.value as typeof attendance.status,
                                }))}
                            >
                                {statusOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Input
                            label="หมายเหตุ"
                            value={editData.notes || ''}
                            onChange={(e) => setEditData(prev => ({
                                ...prev,
                                notes: e.target.value,
                            }))}
                        />
                        <Input
                            label="เหตุผลในการแก้ไข *"
                            value={editData.adjustmentReason}
                            onChange={(e) => setEditData(prev => ({
                                ...prev,
                                adjustmentReason: e.target.value,
                            }))}
                            placeholder="ระบุเหตุผลในการแก้ไขข้อมูล"
                            error={error && !editData.adjustmentReason.trim() ? error : undefined}
                        />

                        {error && editData.adjustmentReason.trim() && (
                            <div className="bg-error-50 border border-error-200 rounded-lg p-3">
                                <p className="text-error-700 text-sm">{error}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    // View Details
                    <div className="space-y-4">
                        {/* Time Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-success-50 rounded-xl p-4">
                                <p className="text-sm text-success-700">เวลาเข้า</p>
                                <p className="text-lg font-semibold text-success-800">
                                    {formatDateTimeDisplay(attendance.clockInTime)}
                                </p>
                            </div>
                            <div className="bg-error-50 rounded-xl p-4">
                                <p className="text-sm text-error-700">เวลาออก</p>
                                <p className="text-lg font-semibold text-error-800">
                                    {formatDateTimeDisplay(attendance.clockOutTime)}
                                </p>
                            </div>
                        </div>

                        {/* Status & Hours */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">สถานะ</p>
                                <p className={`font-semibold ${getStatusColor(attendance.status)}`}>
                                    {getStatusLabel(attendance.status)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">รวมชั่วโมง</p>
                                <p className="font-semibold text-primary-600 dark:text-primary-400">
                                    {attendance.totalHours ? `${attendance.totalHours} ชม.` : '-'}
                                </p>
                            </div>
                        </div>

                        {/* Shift Info */}
                        {attendance.shift && (
                            <div>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">กะ</p>
                                <p className="font-medium text-neutral-800 dark:text-neutral-200">
                                    {attendance.shift.startTime} - {attendance.shift.endTime}
                                    {attendance.shift.location && ` @ ${attendance.shift.location}`}
                                </p>
                            </div>
                        )}

                        {/* GPS Locations */}
                        {(attendance.clockInLatitude || attendance.clockOutLatitude) && (
                            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 space-y-2">
                                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                                    <MapPin size={16} />
                                    ตำแหน่ง GPS
                                </p>
                                {attendance.clockInLatitude && (
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        เข้า: {attendance.clockInLatitude?.toFixed(6)}, {attendance.clockInLongitude?.toFixed(6)}
                                        {attendance.clockInAccuracy && ` (±${Math.round(attendance.clockInAccuracy)}m)`}
                                    </p>
                                )}
                                {attendance.clockOutLatitude && (
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        ออก: {attendance.clockOutLatitude?.toFixed(6)}, {attendance.clockOutLongitude?.toFixed(6)}
                                        {attendance.clockOutAccuracy && ` (±${Math.round(attendance.clockOutAccuracy)}m)`}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Notes */}
                        {attendance.notes && (
                            <div>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">หมายเหตุ</p>
                                <p className="text-neutral-700 dark:text-neutral-300">{attendance.notes}</p>
                            </div>
                        )}

                        {/* Adjustment Info */}
                        {attendance.adjustedBy && (
                            <div className="bg-warning-50 rounded-xl p-4">
                                <p className="text-sm text-warning-700 flex items-center gap-2">
                                    <AlertTriangle size={16} />
                                    มีการแก้ไขข้อมูล
                                </p>
                                {attendance.adjustmentReason && (
                                    <p className="text-sm text-warning-800 mt-1">
                                        เหตุผล: {attendance.adjustmentReason}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    {isEditing ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setIsEditing(false)}
                                disabled={isSubmitting}
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={onClose}>
                                ปิด
                            </Button>
                            <Button variant="primary" onClick={() => setIsEditing(true)} className="inline-flex items-center gap-2">
                                <Pencil size={16} />
                                แก้ไข
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
}

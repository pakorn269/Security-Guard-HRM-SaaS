import { useState, useEffect, useCallback } from 'react';
import leaveService, {
    type CreateLeaveTypeRequest,
    type UpdateLeaveTypeRequest,
} from '../../services/leave.service';
import type { LeaveType } from '../../types/leave.types';
import { useAuth } from '../../context/AuthContext';
import companyService from '../../services/company.service';
import type { CompanySettings } from '../../types/company.types';

// Leave type form modal
function LeaveTypeFormModal({
    leaveType,
    onClose,
    onSave,
}: {
    leaveType?: LeaveType | null;
    onClose: () => void;
    onSave: () => void;
}) {
    const [formData, setFormData] = useState<CreateLeaveTypeRequest>({
        name: '',
        nameTh: '',
        description: '',
        isPaid: true,
        maxDaysPerYear: undefined,
        requiresApproval: true,
        requiresDocument: false,
        isActive: true,
        sortOrder: 0,
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (leaveType) {
            setFormData({
                name: leaveType.name,
                nameTh: leaveType.nameTh || '',
                description: leaveType.description || '',
                isPaid: leaveType.isPaid,
                maxDaysPerYear: leaveType.maxDaysPerYear || undefined,
                requiresApproval: leaveType.requiresApproval,
                requiresDocument: leaveType.requiresDocument,
                isActive: leaveType.isActive,
                sortOrder: leaveType.sortOrder,
            });
        }
    }, [leaveType]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError('กรุณาระบุชื่อประเภทการลา');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            if (leaveType) {
                const updateData: UpdateLeaveTypeRequest = {
                    name: formData.name,
                    nameTh: formData.nameTh || null,
                    description: formData.description || null,
                    isPaid: formData.isPaid,
                    maxDaysPerYear: formData.maxDaysPerYear || null,
                    requiresApproval: formData.requiresApproval,
                    requiresDocument: formData.requiresDocument,
                    isActive: formData.isActive,
                    sortOrder: formData.sortOrder,
                };
                await leaveService.updateLeaveType(leaveType.id, updateData);
            } else {
                await leaveService.createLeaveType(formData);
            }

            onSave();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-surface-800">
                            {leaveType ? 'แก้ไขประเภทการลา' : 'เพิ่มประเภทการลา'}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center hover:bg-surface-200"
                        >
                            ✕
                        </button>
                    </div>

                    {error && (
                        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl mb-4">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-1">
                                    ชื่อ (English) <span className="text-error-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="input-base"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Annual Leave"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-1">
                                    ชื่อ (ภาษาไทย)
                                </label>
                                <input
                                    type="text"
                                    className="input-base"
                                    value={formData.nameTh}
                                    onChange={(e) => setFormData({ ...formData, nameTh: e.target.value })}
                                    placeholder="ลาพักร้อน"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">
                                รายละเอียด
                            </label>
                            <textarea
                                className="input-base"
                                rows={2}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="รายละเอียดเพิ่มเติม..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">
                                จำนวนวันสูงสุดต่อปี
                            </label>
                            <input
                                type="number"
                                className="input-base"
                                value={formData.maxDaysPerYear || ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    maxDaysPerYear: e.target.value ? parseInt(e.target.value) : undefined
                                })}
                                placeholder="เว้นว่างหากไม่จำกัด"
                                min={0}
                                max={365}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-1">
                                    ลำดับการแสดง
                                </label>
                                <input
                                    type="number"
                                    className="input-base"
                                    value={formData.sortOrder || 0}
                                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                                    min={0}
                                />
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                                    checked={formData.isPaid}
                                    onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                                />
                                <span className="text-surface-700">ได้รับเงินเดือนระหว่างลา</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                                    checked={formData.requiresApproval}
                                    onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                                />
                                <span className="text-surface-700">ต้องรออนุมัติ</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                                    checked={formData.requiresDocument}
                                    onChange={(e) => setFormData({ ...formData, requiresDocument: e.target.checked })}
                                />
                                <span className="text-surface-700">ต้องแนบเอกสาร</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                                <span className="text-surface-700">เปิดใช้งาน</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 btn-outline py-3"
                            disabled={submitting}
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            className="flex-1 btn-primary py-3 disabled:opacity-50"
                            disabled={submitting}
                        >
                            {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function LeaveTypesPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [settings, setSettings] = useState<CompanySettings | null>(null);
    const [updatingSettings, setUpdatingSettings] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingType, setEditingType] = useState<LeaveType | null>(null);
    const [includeInactive, setIncludeInactive] = useState(false);
    const { user } = useAuth();

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const promises: Promise<any>[] = [leaveService.listLeaveTypes(includeInactive)];
            if (user?.companyId) {
                promises.push(companyService.getSettings(user.companyId));
            }

            const [typesData, settingsData] = await Promise.all(promises);
            setLeaveTypes(typesData);
            if (settingsData) setSettings(settingsData);

        } catch (err) {
            console.error('Error loading data:', err);
            setError('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setLoading(false);
        }
    }, [includeInactive, user?.companyId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`คุณต้องการลบประเภทการลา "${name}" หรือไม่?`)) return;

        try {
            await leaveService.deleteLeaveType(id);
            setSuccess('ลบประเภทการลาสำเร็จ');
            await loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'ไม่สามารถลบประเภทการลาได้');
        }
    };

    const handleSave = async () => {
        setSuccess(editingType ? 'อัพเดทประเภทการลาสำเร็จ' : 'เพิ่มประเภทการลาสำเร็จ');
        await loadData();
        setTimeout(() => setSuccess(null), 3000);
    };

    const handleUpdateResetMonth = async (month: number) => {
        if (!user?.companyId) return;
        try {
            setUpdatingSettings(true);
            await companyService.updateSettings(user.companyId, { leaveResetMonth: month });
            setSettings(prev => prev ? { ...prev, leaveResetMonth: month } : null);
            setSuccess('อัพเดทเดือนรีเซ็ตวันลาสำเร็จ');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('ไม่สามารถอัพเดทการตั้งค่าได้');
        } finally {
            setUpdatingSettings(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-800">ประเภทการลา</h1>
                    <p className="text-surface-500">กำหนดประเภทการลาและจำนวนวันลาต่อปี</p>
                </div>
                <button
                    onClick={() => {
                        setEditingType(null);
                        setShowForm(true);
                    }}
                    className="btn-primary"
                >
                    + เพิ่มประเภทการลา
                </button>
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

            {/* General Settings */}
            {settings && (
                <div className="card p-6">
                    <h2 className="text-lg font-bold text-surface-800 mb-4">การตั้งค่าทั่วไป</h2>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 max-w-md">
                            <label className="block text-sm font-medium text-surface-700 mb-1">
                                เดือนที่รีเซ็ตวันลาประจำปี
                            </label>
                            <p className="text-sm text-surface-500 mb-2">
                                วันลาคงเหลือจะถูกรีเซ็ต (หรือยกยอดตามนโยบาย) ในวันที่ 1 ของเดือนนี้
                            </p>
                            <select
                                className="input-base"
                                value={settings.leaveResetMonth}
                                onChange={(e) => handleUpdateResetMonth(parseInt(e.target.value))}
                                disabled={updatingSettings}
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                    <option key={m} value={m}>
                                        {new Date(0, m - 1).toLocaleString('th-TH', { month: 'long' })} ({m})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter */}
            <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                        checked={includeInactive}
                        onChange={(e) => setIncludeInactive(e.target.checked)}
                    />
                    <span className="text-sm text-surface-600">แสดงประเภทที่ปิดใช้งาน</span>
                </label>
            </div>

            {/* Leave types list */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 spinner"></div>
                    </div>
                ) : leaveTypes.length === 0 ? (
                    <div className="card text-center py-12">
                        <div className="text-4xl mb-4">📋</div>
                        <p className="text-surface-500 mb-4">ยังไม่มีประเภทการลา</p>
                        <button
                            onClick={() => {
                                setEditingType(null);
                                setShowForm(true);
                            }}
                            className="btn-primary"
                        >
                            + เพิ่มประเภทการลา
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {leaveTypes.map((type) => (
                            <div
                                key={type.id}
                                className={`card p-4 ${!type.isActive ? 'opacity-60' : ''}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-surface-800">
                                                {type.nameTh || type.name}
                                            </h3>
                                            {type.nameTh && (
                                                <span className="text-sm text-surface-500">({type.name})</span>
                                            )}
                                            {!type.isActive && (
                                                <span className="text-xs bg-surface-200 text-surface-600 px-2 py-0.5 rounded-full">
                                                    ปิดใช้งาน
                                                </span>
                                            )}
                                        </div>
                                        {type.description && (
                                            <p className="text-sm text-surface-500 mb-2">{type.description}</p>
                                        )}
                                        <div className="flex flex-wrap gap-2 text-sm">
                                            <span className={`px-2 py-1 rounded-full ${type.isPaid
                                                ? 'bg-success-100 text-success-700'
                                                : 'bg-surface-100 text-surface-600'
                                                }`}>
                                                {type.isPaid ? '💰 ได้เงินเดือน' : '❌ ไม่ได้เงินเดือน'}
                                            </span>
                                            <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                                                📅 {type.maxDaysPerYear ? `${type.maxDaysPerYear} วัน/ปี` : 'ไม่จำกัด'}
                                            </span>
                                            {type.requiresApproval && (
                                                <span className="bg-warning-100 text-warning-700 px-2 py-1 rounded-full">
                                                    ✋ ต้องรออนุมัติ
                                                </span>
                                            )}
                                            {type.requiresDocument && (
                                                <span className="bg-accent-100 text-accent-700 px-2 py-1 rounded-full">
                                                    📎 ต้องแนบเอกสาร
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <button
                                            onClick={() => {
                                                setEditingType(type);
                                                setShowForm(true);
                                            }}
                                            className="p-2 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                            title="แก้ไข"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(type.id, type.nameTh || type.name)}
                                            className="p-2 rounded-lg text-surface-500 hover:text-error-600 hover:bg-error-50 transition-colors"
                                            title="ลบ"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Form modal */}
            {showForm && (
                <LeaveTypeFormModal
                    leaveType={editingType}
                    onClose={() => {
                        setShowForm(false);
                        setEditingType(null);
                    }}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

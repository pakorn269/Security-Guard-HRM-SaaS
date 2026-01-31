import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import leaveService from '../../services/leave.service';
import { useAuth } from '../../context/AuthContext';
import type {
    LeaveRequestTemplate,
    LeaveType,
    CreateTemplateRequest,
    UpdateTemplateRequest,
} from '../../types/leave.types';

export default function LeaveTemplatesPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<LeaveRequestTemplate[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [showInactive, setShowInactive] = useState(false);

    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<LeaveRequestTemplate | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletingTemplate, setDeletingTemplate] = useState<LeaveRequestTemplate | null>(null);

    // Form state
    const [formData, setFormData] = useState<CreateTemplateRequest>({
        name: '',
        nameTh: '',
        description: '',
        leaveTypeId: '',
        defaultDaysCount: undefined,
        defaultReason: '',
        isActive: true,
        sortOrder: 0,
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const isManager =
        user?.role === 'manager' || user?.role === 'company_admin' || user?.role === 'super_admin';

    useEffect(() => {
        loadData();
    }, [showInactive]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [templatesData, typesData] = await Promise.all([
                leaveService.listTemplates(showInactive),
                leaveService.listLeaveTypes(),
            ]);
            setTemplates(templatesData);
            setLeaveTypes(typesData);
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingTemplate(null);
        setFormData({
            name: '',
            nameTh: '',
            description: '',
            leaveTypeId: '',
            defaultDaysCount: undefined,
            defaultReason: '',
            isActive: true,
            sortOrder: templates.length,
        });
        setFormError(null);
        setModalOpen(true);
    };

    const handleOpenEdit = (template: LeaveRequestTemplate) => {
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            nameTh: template.nameTh || '',
            description: template.description || '',
            leaveTypeId: template.leaveTypeId,
            defaultDaysCount: template.defaultDaysCount || undefined,
            defaultReason: template.defaultReason || '',
            isActive: template.isActive,
            sortOrder: template.sortOrder,
        });
        setFormError(null);
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        // Validation
        if (!formData.name.trim()) {
            setFormError('กรุณากรอกชื่อเทมเพลต');
            return;
        }
        if (!formData.leaveTypeId) {
            setFormError('กรุณาเลือกประเภทการลา');
            return;
        }

        try {
            setSubmitting(true);

            if (editingTemplate) {
                // Update
                const updateData: UpdateTemplateRequest = {
                    name: formData.name,
                    nameTh: formData.nameTh || null,
                    description: formData.description || null,
                    leaveTypeId: formData.leaveTypeId,
                    defaultDaysCount: formData.defaultDaysCount || null,
                    defaultReason: formData.defaultReason || null,
                    isActive: formData.isActive,
                    sortOrder: formData.sortOrder,
                };
                await leaveService.updateTemplate(editingTemplate.id, updateData);
            } else {
                // Create
                await leaveService.createTemplate(formData);
            }

            await loadData();
            setModalOpen(false);
        } catch (err: any) {
            console.error('Error saving template:', err);
            setFormError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingTemplate) return;

        try {
            await leaveService.deleteTemplate(deletingTemplate.id);
            await loadData();
            setDeleteConfirmOpen(false);
            setDeletingTemplate(null);
        } catch (err) {
            console.error('Error deleting template:', err);
            alert('เกิดข้อผิดพลาดในการลบเทมเพลต');
        }
    };

    const handleToggleActive = async (template: LeaveRequestTemplate) => {
        try {
            await leaveService.updateTemplate(template.id, {
                isActive: !template.isActive,
            });
            await loadData();
        } catch (err) {
            console.error('Error toggling active status:', err);
            alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
        }
    };

    if (!isManager) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <h2 className="text-xl font-bold text-surface-900 mb-2">
                        ไม่มีสิทธิ์เข้าถึง
                    </h2>
                    <p className="text-surface-600">
                        หน้านี้สำหรับผู้จัดการและผู้ดูแลระบบเท่านั้น
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-800">
                        จัดการเทมเพลตคำขอลา
                    </h1>
                    <p className="text-surface-500">สร้างเทมเพลตสำหรับกรอกแบบฟอร์มด่วน</p>
                </div>
                <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    สร้างเทมเพลต
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-surface-200">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                        className="rounded"
                    />
                    <span className="text-sm text-surface-700">แสดงเทมเพลตที่ไม่ใช้งาน</span>
                </label>
            </div>

            {/* Templates List */}
            <div className="card">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="spinner w-8 h-8 mx-auto mb-2"></div>
                        <p className="text-surface-500">กำลังโหลด...</p>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-4xl mb-2">📋</div>
                        <p className="text-surface-500">ยังไม่มีเทมเพลต</p>
                        <button onClick={handleOpenCreate} className="btn-primary mt-4">
                            สร้างเทมเพลตแรก
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table w-full">
                            <thead>
                                <tr>
                                    <th>ชื่อเทมเพลต</th>
                                    <th>ประเภทการลา</th>
                                    <th className="text-center">จำนวนวัน</th>
                                    <th className="text-center">ลำดับ</th>
                                    <th className="text-center">สถานะ</th>
                                    <th className="text-center">การจัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {templates.map((template) => (
                                    <tr
                                        key={template.id}
                                        className={!template.isActive ? 'opacity-50' : ''}
                                    >
                                        <td>
                                            <div className="font-medium text-surface-900">
                                                {template.nameTh || template.name}
                                            </div>
                                            {template.nameTh &&
                                                template.name !== template.nameTh && (
                                                    <div className="text-xs text-surface-500">
                                                        {template.name}
                                                    </div>
                                                )}
                                            {template.description && (
                                                <div className="text-xs text-surface-500 mt-1">
                                                    {template.description}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={`w-2 h-2 rounded-full ${
                                                        template.leaveType?.isPaid
                                                            ? 'bg-success-500'
                                                            : 'bg-surface-400'
                                                    }`}
                                                />
                                                {template.leaveType?.nameTh ||
                                                    template.leaveType?.name}
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            {template.defaultDaysCount || '-'}
                                        </td>
                                        <td className="text-center">{template.sortOrder}</td>
                                        <td className="text-center">
                                            {template.isActive ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-success-100 text-success-700 rounded-md text-xs font-medium">
                                                    <Eye className="w-3 h-3" />
                                                    ใช้งาน
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface-100 text-surface-600 rounded-md text-xs font-medium">
                                                    <EyeOff className="w-3 h-3" />
                                                    ปิดใช้งาน
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleToggleActive(template)}
                                                    className="p-1.5 text-surface-600 hover:bg-surface-100 rounded transition-colors"
                                                    title={
                                                        template.isActive
                                                            ? 'ปิดใช้งาน'
                                                            : 'เปิดใช้งาน'
                                                    }
                                                >
                                                    {template.isActive ? (
                                                        <EyeOff className="w-4 h-4" />
                                                    ) : (
                                                        <Eye className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleOpenEdit(template)}
                                                    className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                                    title="แก้ไข"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setDeletingTemplate(template);
                                                        setDeleteConfirmOpen(true);
                                                    }}
                                                    className="p-1.5 text-error-600 hover:bg-error-50 rounded transition-colors"
                                                    title="ลบ"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setModalOpen(false)} />
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl">
                            <form onSubmit={handleSubmit}>
                                {/* Header */}
                                <div className="p-6 border-b border-surface-200">
                                    <h2 className="text-xl font-bold text-surface-900">
                                        {editingTemplate ? 'แก้ไขเทมเพลต' : 'สร้างเทมเพลตใหม่'}
                                    </h2>
                                </div>

                                {/* Content */}
                                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                                    {formError && (
                                        <div className="p-3 bg-error-50 border border-error-200 rounded-lg text-error-700 text-sm">
                                            {formError}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-surface-700 mb-1">
                                                ชื่อเทมเพลต (EN) <span className="text-error-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="input-base w-full"
                                                value={formData.name}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, name: e.target.value })
                                                }
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-surface-700 mb-1">
                                                ชื่อเทมเพลต (TH)
                                            </label>
                                            <input
                                                type="text"
                                                className="input-base w-full"
                                                value={formData.nameTh}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, nameTh: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-surface-700 mb-1">
                                            คำอธิบาย
                                        </label>
                                        <textarea
                                            className="input-base w-full"
                                            rows={2}
                                            value={formData.description}
                                            onChange={(e) =>
                                                setFormData({ ...formData, description: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-surface-700 mb-1">
                                                ประเภทการลา <span className="text-error-500">*</span>
                                            </label>
                                            <select
                                                className="input-base w-full"
                                                value={formData.leaveTypeId}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        leaveTypeId: e.target.value,
                                                    })
                                                }
                                                required
                                            >
                                                <option value="">เลือกประเภทการลา</option>
                                                {leaveTypes.map((type) => (
                                                    <option key={type.id} value={type.id}>
                                                        {type.nameTh || type.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-surface-700 mb-1">
                                                จำนวนวันเริ่มต้น
                                            </label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0.5"
                                                max="365"
                                                className="input-base w-full"
                                                value={formData.defaultDaysCount || ''}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        defaultDaysCount: e.target.value
                                                            ? Number(e.target.value)
                                                            : undefined,
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-surface-700 mb-1">
                                            เหตุผลเริ่มต้น
                                        </label>
                                        <textarea
                                            className="input-base w-full"
                                            rows={3}
                                            value={formData.defaultReason}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    defaultReason: e.target.value,
                                                })
                                            }
                                            placeholder="เหตุผลที่จะกรอกให้อัตโนมัติเมื่อใช้เทมเพลต"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-surface-700 mb-1">
                                                ลำดับการแสดงผล
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                className="input-base w-full"
                                                value={formData.sortOrder}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        sortOrder: Number(e.target.value),
                                                    })
                                                }
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-surface-700 mb-1">
                                                สถานะ
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer mt-2">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isActive}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            isActive: e.target.checked,
                                                        })
                                                    }
                                                    className="rounded"
                                                />
                                                <span className="text-sm text-surface-700">
                                                    เปิดใช้งาน
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="p-6 border-t border-surface-200 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="btn-outline"
                                        disabled={submitting}
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={submitting}
                                    >
                                        {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmOpen && deletingTemplate && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="fixed inset-0 bg-black bg-opacity-50" />
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                            <h2 className="text-xl font-bold text-surface-900 mb-4">
                                ยืนยันการลบเทมเพลต
                            </h2>
                            <p className="text-surface-600 mb-6">
                                คุณต้องการลบเทมเพลต "{deletingTemplate.nameTh || deletingTemplate.name}"
                                ใช่หรือไม่?
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setDeleteConfirmOpen(false);
                                        setDeletingTemplate(null);
                                    }}
                                    className="btn-outline"
                                >
                                    ยกเลิก
                                </button>
                                <button onClick={handleDelete} className="btn-error">
                                    ลบ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

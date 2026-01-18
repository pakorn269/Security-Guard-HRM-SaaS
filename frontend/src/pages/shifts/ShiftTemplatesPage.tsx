import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    listShiftTemplates,
    createShiftTemplate,
    updateShiftTemplate,
    deleteShiftTemplate,
} from '../../services/shift.service';
import type { ShiftTemplate, CreateShiftTemplateRequest } from '../../types/shift.types';
import { Button, Modal, LoadingSpinner, Card, Input } from '../../components/common';
import { useToast, ToastContainer } from '../../components/common/Toast';

// Predefined colors
const COLORS = [
    '#3B82F6', // Blue
    '#22C55E', // Green
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6366F1', // Indigo
];

export default function ShiftTemplatesPage() {
    const { t } = useTranslation();

    // State
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
    const toast = useToast();

    // Form state
    const [formData, setFormData] = useState<CreateShiftTemplateRequest>({
        name: '',
        nameTh: '',
        startTime: '08:00',
        endTime: '17:00',
        breakMinutes: 60,
        color: '#3B82F6',
        isOvernight: false,
    });

    // Load templates
    const loadTemplates = async () => {
        try {
            setLoading(true);
            const data = await listShiftTemplates(true);
            setTemplates(data);
        } catch (error) {
            console.error('Error loading templates:', error);
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    // Reset form
    const resetForm = () => {
        setFormData({
            name: '',
            nameTh: '',
            startTime: '08:00',
            endTime: '17:00',
            breakMinutes: 60,
            color: '#3B82F6',
            isOvernight: false,
        });
        setEditingTemplate(null);
    };

    // Open create modal
    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    // Open edit modal
    const openEditModal = (template: ShiftTemplate) => {
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            nameTh: template.nameTh || '',
            startTime: template.startTime,
            endTime: template.endTime,
            breakMinutes: template.breakMinutes,
            color: template.color,
            isOvernight: template.isOvernight,
        });
        setShowModal(true);
    };

    // Handle create
    const handleCreate = async () => {
        try {
            await createShiftTemplate(formData);
            setShowModal(false);
            toast.success('สร้างรูปแบบกะสำเร็จ');
            loadTemplates();
            resetForm();
        } catch (error) {
            console.error('Error creating template:', error);
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    // Handle update
    const handleUpdate = async () => {
        if (!editingTemplate) return;
        try {
            await updateShiftTemplate(editingTemplate.id, formData);
            setShowModal(false);
            toast.success('อัปเดตรูปแบบกะสำเร็จ');
            loadTemplates();
            resetForm();
        } catch (error) {
            console.error('Error updating template:', error);
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    // Handle delete
    const handleDelete = async (id: string) => {
        if (!confirm('ยืนยันการลบรูปแบบกะนี้?')) return;
        try {
            await deleteShiftTemplate(id);
            toast.success('ลบรูปแบบกะสำเร็จ');
            loadTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    // Handle toggle active status
    const handleToggleActive = async (template: ShiftTemplate) => {
        try {
            await updateShiftTemplate(template.id, { isActive: !template.isActive });
            toast.success(template.isActive ? 'ปิดใช้งานแล้ว' : 'เปิดใช้งานแล้ว');
            loadTemplates();
        } catch (error) {
            console.error('Error toggling template:', error);
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    // Calculate duration
    const calculateDuration = (startTime: string, endTime: string, isOvernight: boolean): string => {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);

        let duration = (endH * 60 + endM) - (startH * 60 + startM);
        if (isOvernight || duration < 0) {
            duration += 24 * 60;
        }

        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;

        return minutes > 0 ? `${hours} ชม. ${minutes} นาที` : `${hours} ชั่วโมง`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-800 dark:text-surface-100">
                        ⏰ {t('shiftTemplates.title', 'รูปแบบกะ')}
                    </h1>
                    <p className="text-surface-500 mt-1">
                        {t('shiftTemplates.subtitle', 'จัดการรูปแบบกะสำหรับการจัดตาราง')}
                    </p>
                </div>

                <Button onClick={openCreateModal}>
                    ➕ สร้างรูปแบบกะใหม่
                </Button>
            </div>

            {/* Templates Grid */}
            {templates.length === 0 ? (
                <Card className="p-12 text-center">
                    <div className="text-6xl mb-4">⏰</div>
                    <h2 className="text-xl font-semibold text-surface-700 dark:text-surface-200 mb-2">
                        ยังไม่มีรูปแบบกะ
                    </h2>
                    <p className="text-surface-500 mb-4">
                        สร้างรูปแบบกะเพื่อใช้ในการจัดตารางได้เร็วขึ้น
                    </p>
                    <Button onClick={openCreateModal}>
                        ➕ สร้างรูปแบบกะแรก
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                        <Card
                            key={template.id}
                            className={`p-4 border-l-4 transition-all hover:shadow-md ${!template.isActive ? 'opacity-60' : ''
                                }`}
                            style={{ borderLeftColor: template.color }}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-surface-800 dark:text-surface-100">
                                        {template.name}
                                    </h3>
                                    {template.nameTh && (
                                        <p className="text-sm text-surface-500">{template.nameTh}</p>
                                    )}
                                </div>
                                <div
                                    className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                                    style={{ backgroundColor: template.color }}
                                />
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-surface-600 dark:text-surface-300">
                                    <span>🕐</span>
                                    <span className="font-medium">
                                        {template.startTime} - {template.endTime}
                                    </span>
                                    {template.isOvernight && (
                                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                            ข้ามคืน
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-surface-500">
                                    <span>⏱️</span>
                                    <span>
                                        {calculateDuration(template.startTime, template.endTime, template.isOvernight)}
                                    </span>
                                </div>
                                {template.breakMinutes > 0 && (
                                    <div className="flex items-center gap-2 text-sm text-surface-500">
                                        <span>☕</span>
                                        <span>พัก {template.breakMinutes} นาที</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-surface-200 dark:border-surface-700">
                                <button
                                    className={`text-sm px-3 py-1 rounded-full transition-colors ${template.isActive
                                        ? 'bg-success-100 text-success-700 hover:bg-success-200'
                                        : 'bg-surface-100 text-surface-500 hover:bg-surface-200'
                                        }`}
                                    onClick={() => handleToggleActive(template)}
                                >
                                    {template.isActive ? '✓ ใช้งาน' : '○ ปิดใช้งาน'}
                                </button>

                                <div className="flex items-center gap-1">
                                    <button
                                        className="p-2 text-surface-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                        onClick={() => openEditModal(template)}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="p-2 text-surface-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors"
                                        onClick={() => handleDelete(template.id)}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    resetForm();
                }}
                title={editingTemplate ? 'แก้ไขรูปแบบกะ' : 'สร้างรูปแบบกะใหม่'}
            >
                <div className="space-y-4">
                    <Input
                        label="ชื่อรูปแบบกะ (อังกฤษ)"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="เช่น Day Shift"
                        required
                    />

                    <Input
                        label="ชื่อรูปแบบกะ (ไทย)"
                        value={formData.nameTh || ''}
                        onChange={(e) => setFormData({ ...formData, nameTh: e.target.value })}
                        placeholder="เช่น กะกลางวัน"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            type="time"
                            label="เวลาเริ่ม"
                            value={formData.startTime}
                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        />
                        <Input
                            type="time"
                            label="เวลาสิ้นสุด"
                            value={formData.endTime}
                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        />
                    </div>

                    <Input
                        type="number"
                        label="เวลาพัก (นาที)"
                        value={formData.breakMinutes || 0}
                        onChange={(e) => setFormData({ ...formData, breakMinutes: parseInt(e.target.value) || 0 })}
                        min={0}
                        max={480}
                    />

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isOvernight"
                            checked={formData.isOvernight}
                            onChange={(e) => setFormData({ ...formData, isOvernight: e.target.checked })}
                            className="w-4 h-4 text-primary-600 rounded border-surface-300"
                        />
                        <label htmlFor="isOvernight" className="text-sm text-surface-600 dark:text-surface-300">
                            กะข้ามคืน (เวลาสิ้นสุดอยู่ในวันถัดไป)
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-2">
                            สี
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map((color) => (
                                <button
                                    key={color}
                                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${formData.color === color ? 'border-surface-800 scale-110' : 'border-white'
                                        }`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setFormData({ ...formData, color })}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border-l-4" style={{ borderLeftColor: formData.color }}>
                        <p className="text-sm text-surface-500 mb-1">ตัวอย่าง:</p>
                        <p className="font-semibold text-surface-800 dark:text-surface-100">
                            {formData.name || 'ชื่อรูปแบบกะ'}
                        </p>
                        <p className="text-surface-600 dark:text-surface-300">
                            {formData.startTime} - {formData.endTime}
                            {formData.isOvernight && ' (ข้ามคืน)'}
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="ghost" onClick={() => {
                            setShowModal(false);
                            resetForm();
                        }}>
                            ยกเลิก
                        </Button>
                        <Button
                            onClick={editingTemplate ? handleUpdate : handleCreate}
                            disabled={!formData.name}
                        >
                            {editingTemplate ? 'บันทึก' : 'สร้าง'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Toast */}
            <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
        </div>
    );
}

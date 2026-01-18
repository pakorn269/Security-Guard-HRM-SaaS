import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    listShiftTemplates,
    listShifts,
    createShift,
    updateShift,
    deleteShift,
    publishShifts,
    copyShifts,
} from '../../services/shift.service';
import { employeeService } from '../../services/employee.service';
import type { ShiftTemplate, ShiftWithDetails, CreateShiftRequest } from '../../types/shift.types';
import { Button, Modal, LoadingSpinner, Card, Input, Select } from '../../components/common';
import { useToast, ToastContainer } from '../../components/common/Toast';

// Types
interface Employee {
    id: string;
    fullName: string;
    employeeCode: string;
    status: string;
}

// Helper functions
const getDaysInWeek = (date: Date): Date[] => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
    startOfWeek.setDate(diff);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        days.push(d);
    }
    return days;
};

const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
};

const getDayName = (date: Date): string => {
    return date.toLocaleDateString('th-TH', { weekday: 'short' });
};

const isToday = (date: Date): boolean => {
    const today = new Date();
    return formatDate(date) === formatDate(today);
};

export default function SchedulePage() {
    const { t } = useTranslation();

    // State
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [view, setView] = useState<'week' | 'month'>('week');
    const [shifts, setShifts] = useState<ShiftWithDetails[]>([]);
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [editingShift, setEditingShift] = useState<ShiftWithDetails | null>(null);

    // Form state for create/edit
    const [formData, setFormData] = useState<CreateShiftRequest>({
        employeeId: '',
        date: '',
        startTime: '08:00',
        endTime: '17:00',
        location: '',
    });

    // Copy modal state
    const [copySource, setCopySource] = useState<string>('');
    const [copyTarget, setCopyTarget] = useState<string>('');

    // Calculate week dates
    const weekDays = getDaysInWeek(currentDate);
    const weekStart = formatDate(weekDays[0]);
    const weekEnd = formatDate(weekDays[6]);

    // Load data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [templatesRes, shiftsRes, employeesRes] = await Promise.all([
                listShiftTemplates(),
                listShifts({
                    startDate: weekStart,
                    endDate: weekEnd,
                }),
                employeeService.list({ status: 'active' }),
            ]);

            setTemplates(templatesRes);
            setShifts(shiftsRes.shifts);
            setEmployees(employeesRes.data.map(e => ({ id: e.id, fullName: e.fullName, employeeCode: e.employeeCode, status: e.status })));
        } catch (error) {
            console.error('Error loading schedule data:', error);
            toast.error('Failed to load schedule');
        } finally {
            setLoading(false);
        }
    }, [weekStart, weekEnd]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Navigation
    const goToPreviousWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const goToNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // Get shifts for a specific date and employee
    const getShiftsForCell = (date: string, employeeId: string) => {
        return shifts.filter(s => s.date === date && s.employeeId === employeeId);
    };

    // Count stats
    const draftCount = shifts.filter(s => s.status === 'draft').length;
    const publishedCount = shifts.filter(s => s.status === 'published').length;

    // Handle shift creation
    const handleCreateShift = async () => {
        try {
            await createShift(formData);
            setShowCreateModal(false);
            toast.success('สร้างกะสำเร็จ');
            loadData();
            resetForm();
        } catch (error) {
            console.error('Error creating shift:', error);
            toast.error('เกิดข้อผิดพลาดในการสร้างกะ');
        }
    };

    // Handle shift update
    const handleUpdateShift = async () => {
        if (!editingShift) return;
        try {
            await updateShift(editingShift.id, {
                startTime: formData.startTime,
                endTime: formData.endTime,
                location: formData.location,
            });
            setShowCreateModal(false);
            setEditingShift(null);
            toast.success('อัปเดตกะสำเร็จ');
            loadData();
            resetForm();
        } catch (error) {
            console.error('Error updating shift:', error);
            toast.error('เกิดข้อผิดพลาดในการอัปเดตกะ');
        }
    };

    // Handle shift deletion
    const handleDeleteShift = async (shiftId: string) => {
        if (!confirm('ยืนยันการลบกะนี้?')) return;
        try {
            await deleteShift(shiftId);
            toast.success('ลบกะสำเร็จ');
            loadData();
        } catch (error) {
            console.error('Error deleting shift:', error);
            toast.error('เกิดข้อผิดพลาดในการลบกะ');
        }
    };

    // Handle publish
    const handlePublish = async () => {
        try {
            await publishShifts({ startDate: weekStart, endDate: weekEnd });
            setShowPublishModal(false);
            toast.success('ประกาศกะสำเร็จ');
            loadData();
        } catch (error) {
            console.error('Error publishing shifts:', error);
            toast.error('เกิดข้อผิดพลาดในการประกาศกะ');
        }
    };

    // Handle copy from previous week
    const handleCopy = async () => {
        try {
            await copyShifts({
                sourceStartDate: copySource,
                targetStartDate: copyTarget,
            });
            setShowCopyModal(false);
            toast.success('คัดลอกกะสำเร็จ');
            loadData();
        } catch (error) {
            console.error('Error copying shifts:', error);
            toast.error('เกิดข้อผิดพลาดในการคัดลอกกะ');
        }
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            employeeId: '',
            date: '',
            startTime: '08:00',
            endTime: '17:00',
            location: '',
        });
        setEditingShift(null);
    };

    // Open create modal
    const openCreateModal = (date: string, employeeId?: string) => {
        setFormData({
            ...formData,
            date,
            employeeId: employeeId || '',
        });
        setShowCreateModal(true);
    };

    // Open edit modal
    const openEditModal = (shift: ShiftWithDetails) => {
        setEditingShift(shift);
        setFormData({
            employeeId: shift.employeeId,
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
            location: shift.location || '',
        });
        setShowCreateModal(true);
    };

    // Apply template to form
    const applyTemplate = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setFormData({
                ...formData,
                templateId,
                startTime: template.startTime,
                endTime: template.endTime,
            });
        }
    };

    // Open copy modal with defaults
    const openCopyModal = () => {
        const prevWeek = new Date(weekDays[0]);
        prevWeek.setDate(prevWeek.getDate() - 7);
        setCopySource(formatDate(prevWeek));
        setCopyTarget(weekStart);
        setShowCopyModal(true);
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
                        📅 {t('schedule.title', 'ตารางเวร')}
                    </h1>
                    <p className="text-surface-500 mt-1">
                        {t('schedule.subtitle', 'จัดการตารางเวรของพนักงาน')}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={openCopyModal}>
                        📋 คัดลอกจากสัปดาห์ก่อน
                    </Button>
                    {draftCount > 0 && (
                        <Button onClick={() => setShowPublishModal(true)}>
                            ✅ ประกาศกะ ({draftCount})
                        </Button>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <Card className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={goToPreviousWeek}>
                            ← ก่อนหน้า
                        </Button>
                        <Button variant="ghost" onClick={goToToday}>
                            วันนี้
                        </Button>
                        <Button variant="ghost" onClick={goToNextWeek}>
                            ถัดไป →
                        </Button>
                    </div>

                    <h2 className="text-lg font-semibold text-surface-700 dark:text-surface-200">
                        {weekDays[0].toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                    </h2>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-surface-500">
                            ร่าง: <span className="font-medium text-warning-600">{draftCount}</span>
                        </span>
                        <span className="text-sm text-surface-500">|</span>
                        <span className="text-sm text-surface-500">
                            ประกาศแล้ว: <span className="font-medium text-success-600">{publishedCount}</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 rounded-lg p-1">
                        <button
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'week'
                                ? 'bg-white dark:bg-surface-700 text-primary-600 shadow-sm'
                                : 'text-surface-500 hover:text-surface-700'
                                }`}
                            onClick={() => setView('week')}
                        >
                            สัปดาห์
                        </button>
                        <button
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'month'
                                ? 'bg-white dark:bg-surface-700 text-primary-600 shadow-sm'
                                : 'text-surface-500 hover:text-surface-700'
                                }`}
                            onClick={() => setView('month')}
                        >
                            เดือน
                        </button>
                    </div>
                </div>
            </Card>

            {/* Calendar Grid */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        {/* Header */}
                        <thead>
                            <tr className="bg-surface-50 dark:bg-surface-800">
                                <th className="p-3 text-left font-medium text-surface-600 dark:text-surface-300 border-b border-r border-surface-200 dark:border-surface-700 w-48 sticky left-0 bg-surface-50 dark:bg-surface-800">
                                    พนักงาน
                                </th>
                                {weekDays.map((day) => (
                                    <th
                                        key={formatDate(day)}
                                        className={`p-3 text-center border-b border-surface-200 dark:border-surface-700 min-w-[120px] ${isToday(day) ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                                            }`}
                                    >
                                        <div className="text-sm font-medium text-surface-600 dark:text-surface-300">
                                            {getDayName(day)}
                                        </div>
                                        <div className={`text-lg font-bold ${isToday(day) ? 'text-primary-600' : 'text-surface-800 dark:text-surface-100'}`}>
                                            {formatDisplayDate(day)}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        {/* Body */}
                        <tbody>
                            {employees.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-surface-500">
                                        ไม่พบพนักงาน กรุณาเพิ่มพนักงานก่อน
                                    </td>
                                </tr>
                            ) : (
                                employees.map((employee) => (
                                    <tr key={employee.id} className="border-b border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/50">
                                        <td className="p-3 border-r border-surface-200 dark:border-surface-700 sticky left-0 bg-white dark:bg-surface-900">
                                            <div className="font-medium text-surface-800 dark:text-surface-100">
                                                {employee.fullName}
                                            </div>
                                            <div className="text-sm text-surface-500">
                                                {employee.employeeCode}
                                            </div>
                                        </td>
                                        {weekDays.map((day) => {
                                            const dateStr = formatDate(day);
                                            const cellShifts = getShiftsForCell(dateStr, employee.id);

                                            return (
                                                <td
                                                    key={dateStr}
                                                    className={`p-2 min-h-[80px] align-top ${isToday(day) ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                                                        }`}
                                                >
                                                    <div className="space-y-1">
                                                        {cellShifts.map((shift) => (
                                                            <div
                                                                key={shift.id}
                                                                className={`p-2 rounded-lg text-xs cursor-pointer transition-all hover:scale-[1.02] ${shift.status === 'published'
                                                                    ? 'bg-success-100 text-success-800 border border-success-200'
                                                                    : 'bg-warning-100 text-warning-800 border border-warning-200'
                                                                    }`}
                                                                style={{
                                                                    borderLeftWidth: '3px',
                                                                    borderLeftColor: shift.template?.color || '#3B82F6',
                                                                }}
                                                                onClick={() => openEditModal(shift)}
                                                            >
                                                                <div className="font-medium">
                                                                    {shift.startTime} - {shift.endTime}
                                                                </div>
                                                                {shift.location && (
                                                                    <div className="text-opacity-75 truncate">
                                                                        📍 {shift.location}
                                                                    </div>
                                                                )}
                                                                <div className="mt-1 flex items-center gap-1">
                                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${shift.status === 'published'
                                                                        ? 'bg-success-200 text-success-700'
                                                                        : 'bg-warning-200 text-warning-700'
                                                                        }`}>
                                                                        {shift.status === 'published' ? 'ประกาศแล้ว' : 'ร่าง'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {/* Add shift button */}
                                                        <button
                                                            className="w-full p-2 rounded-lg border-2 border-dashed border-surface-200 dark:border-surface-700 text-surface-400 hover:border-primary-300 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                                                            onClick={() => openCreateModal(dateStr, employee.id)}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Legend */}
            <div className="flex items-center gap-4 text-sm text-surface-500">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-warning-100 border border-warning-200"></span>
                    <span>ร่าง (ยังไม่ประกาศ)</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-success-100 border border-success-200"></span>
                    <span>ประกาศแล้ว</span>
                </div>
            </div>

            {/* Create/Edit Shift Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    resetForm();
                }}
                title={editingShift ? 'แก้ไขกะ' : 'สร้างกะใหม่'}
            >
                <div className="space-y-4">
                    {!editingShift && (
                        <Select
                            label="พนักงาน"
                            value={formData.employeeId}
                            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                            options={employees.map(e => ({ value: e.id, label: `${e.fullName} (${e.employeeCode})` }))}
                            placeholder="เลือกพนักงาน"
                        />
                    )}

                    <Input
                        type="date"
                        label="วันที่"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        disabled={!!editingShift}
                    />

                    {templates.length > 0 && !editingShift && (
                        <Select
                            label="รูปแบบกะ (ตัวเลือก)"
                            value={formData.templateId || ''}
                            onChange={(e) => applyTemplate(e.target.value)}
                            options={[
                                { value: '', label: 'กำหนดเอง' },
                                ...templates.map(t => ({
                                    value: t.id,
                                    label: `${t.name} (${t.startTime}-${t.endTime})`,
                                })),
                            ]}
                        />
                    )}

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
                        label="สถานที่ (ตัวเลือก)"
                        value={formData.location || ''}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="เช่น อาคาร A"
                    />

                    <div className="flex justify-between pt-4">
                        <div>
                            {editingShift && (
                                <Button
                                    variant="ghost"
                                    className="text-error-600"
                                    onClick={() => {
                                        handleDeleteShift(editingShift.id);
                                        setShowCreateModal(false);
                                        resetForm();
                                    }}
                                >
                                    🗑️ ลบกะ
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => {
                                setShowCreateModal(false);
                                resetForm();
                            }}>
                                ยกเลิก
                            </Button>
                            <Button onClick={editingShift ? handleUpdateShift : handleCreateShift}>
                                {editingShift ? 'บันทึก' : 'สร้างกะ'}
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Publish Modal */}
            <Modal
                isOpen={showPublishModal}
                onClose={() => setShowPublishModal(false)}
                title="ยืนยันการประกาศกะ"
            >
                <div className="space-y-4">
                    <p className="text-surface-600 dark:text-surface-300">
                        คุณต้องการประกาศกะทั้งหมด <span className="font-bold text-primary-600">{draftCount} กะ</span> ในสัปดาห์นี้หรือไม่?
                    </p>
                    <p className="text-sm text-surface-500">
                        พนักงานจะได้รับการแจ้งเตือนเกี่ยวกับตารางเวรของพวกเขา
                    </p>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="ghost" onClick={() => setShowPublishModal(false)}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handlePublish}>
                            ✅ ประกาศกะ
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Copy Modal */}
            <Modal
                isOpen={showCopyModal}
                onClose={() => setShowCopyModal(false)}
                title="📋 คัดลอกกะจากสัปดาห์ก่อน"
            >
                <div className="space-y-4">
                    <Input
                        type="date"
                        label="จากวันจันทร์ของสัปดาห์ต้นทาง"
                        value={copySource}
                        onChange={(e) => setCopySource(e.target.value)}
                    />
                    <Input
                        type="date"
                        label="ไปยังวันจันทร์ของสัปดาห์ปลายทาง"
                        value={copyTarget}
                        onChange={(e) => setCopyTarget(e.target.value)}
                    />
                    <p className="text-sm text-surface-500">
                        กะที่ซ้ำหรือทับซ้อนจะถูกข้ามไปโดยอัตโนมัติ
                    </p>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="ghost" onClick={() => setShowCopyModal(false)}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleCopy}>
                            📋 คัดลอกกะ
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Toast */}
            <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
        </div>
    );
}

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Copy,
  Send,
  Plus,
  MapPin,
  Clock,
  Trash2,
  CalendarDays,
  LayoutGrid,
} from 'lucide-react';
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
import { Button, Modal, LoadingSpinner, Card, Input, Select, Badge, Avatar } from '../../components/common';
import { PageHeader } from '../../components/layout';
import { Tabs, TabList, Tab } from '../../components/navigation';
import { useToast, ToastContainer } from '../../components/common/Toast';

/**
 * Schedule Page - Redesigned (Part 5.4)
 *
 * Changes from original:
 * - PageHeader with consistent layout
 * - Lucide icons instead of emojis
 * - Professional calendar grid
 * - Color-coded shift types (left border)
 * - Tabs for week/month view
 * - Improved shift cards with status badges
 */

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
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
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

// Shift status configuration
const SHIFT_STATUS_CONFIG = {
  draft: { label: 'ร่าง', variant: 'warning' as const },
  published: { label: 'ประกาศแล้ว', variant: 'success' as const },
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
      setEmployees(
        employeesRes.data.map((e) => ({
          id: e.id,
          fullName: e.fullName,
          employeeCode: e.employeeCode,
          status: e.status,
        }))
      );
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
    return shifts.filter((s) => s.date === date && s.employeeId === employeeId);
  };

  // Count stats
  const draftCount = shifts.filter((s) => s.status === 'draft').length;
  const publishedCount = shifts.filter((s) => s.status === 'published').length;

  // Handle shift creation
  const handleCreateShift = async () => {
    try {
      await createShift(formData);
      setShowCreateModal(false);
      toast.success(t('schedule.createSuccess', 'สร้างกะสำเร็จ'));
      loadData();
      resetForm();
    } catch (error) {
      console.error('Error creating shift:', error);
      toast.error(t('schedule.createError', 'เกิดข้อผิดพลาดในการสร้างกะ'));
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
      toast.success(t('schedule.updateSuccess', 'อัปเดตกะสำเร็จ'));
      loadData();
      resetForm();
    } catch (error) {
      console.error('Error updating shift:', error);
      toast.error(t('schedule.updateError', 'เกิดข้อผิดพลาดในการอัปเดตกะ'));
    }
  };

  // Handle shift deletion
  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm(t('schedule.deleteConfirm', 'ยืนยันการลบกะนี้?'))) return;
    try {
      await deleteShift(shiftId);
      toast.success(t('schedule.deleteSuccess', 'ลบกะสำเร็จ'));
      loadData();
    } catch (error) {
      console.error('Error deleting shift:', error);
      toast.error(t('schedule.deleteError', 'เกิดข้อผิดพลาดในการลบกะ'));
    }
  };

  // Handle publish
  const handlePublish = async () => {
    try {
      await publishShifts({ startDate: weekStart, endDate: weekEnd });
      setShowPublishModal(false);
      toast.success(t('schedule.publishSuccess', 'ประกาศกะสำเร็จ'));
      loadData();
    } catch (error) {
      console.error('Error publishing shifts:', error);
      toast.error(t('schedule.publishError', 'เกิดข้อผิดพลาดในการประกาศกะ'));
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
      toast.success(t('schedule.copySuccess', 'คัดลอกกะสำเร็จ'));
      loadData();
    } catch (error) {
      console.error('Error copying shifts:', error);
      toast.error(t('schedule.copyError', 'เกิดข้อผิดพลาดในการคัดลอกกะ'));
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
    const template = templates.find((t) => t.id === templateId);
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
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t('schedule.title', 'ตารางเวร')}
        description={t('schedule.subtitle', 'จัดการตารางเวรของพนักงาน')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<Copy size={16} />} onClick={openCopyModal}>
              {t('schedule.copyWeek', 'คัดลอกจากสัปดาห์ก่อน')}
            </Button>
            {draftCount > 0 && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Send size={16} />}
                onClick={() => setShowPublishModal(true)}
              >
                {t('schedule.publish', 'ประกาศกะ')} ({draftCount})
              </Button>
            )}
          </div>
        }
      />

      {/* Navigation & View Controls */}
      <Card variant="bordered" padding="md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Week Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft size={18} />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              {t('schedule.today', 'วันนี้')}
            </Button>
            <Button variant="ghost" size="sm" onClick={goToNextWeek}>
              <ChevronRight size={18} />
            </Button>
            <span className="ml-2 text-base font-semibold text-neutral-800 dark:text-neutral-100">
              {weekDays[0].toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-500">{t('schedule.draft', 'ร่าง')}:</span>
              <Badge variant="warning" size="sm">
                {draftCount}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-500">{t('schedule.published', 'ประกาศแล้ว')}:</span>
              <Badge variant="success" size="sm">
                {publishedCount}
              </Badge>
            </div>
          </div>

          {/* View Toggle */}
          <Tabs
            activeTab={view}
            onChange={(id) => setView(id as 'week' | 'month')}
            variant="pills"
            size="sm"
          >
            <TabList>
              <Tab value="week" icon={<CalendarDays size={16} />}>
                {t('schedule.weekView', 'สัปดาห์')}
              </Tab>
              <Tab value="month" icon={<LayoutGrid size={16} />}>
                {t('schedule.monthView', 'เดือน')}
              </Tab>
            </TabList>
          </Tabs>
        </div>
      </Card>

      {/* Calendar Grid */}
      <Card variant="bordered" padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            {/* Header */}
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                <th className="p-3 text-left text-sm font-medium text-neutral-600 dark:text-neutral-300 border-b border-r border-neutral-200 dark:border-neutral-700 w-52 sticky left-0 bg-neutral-50 dark:bg-neutral-800/50 z-10">
                  {t('schedule.employee', 'พนักงาน')}
                </th>
                {weekDays.map((day) => (
                  <th
                    key={formatDate(day)}
                    className={`p-3 text-center border-b border-neutral-200 dark:border-neutral-700 min-w-[130px] ${
                      isToday(day) ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                    }`}
                  >
                    <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                      {getDayName(day)}
                    </div>
                    <div
                      className={`text-base font-semibold mt-0.5 ${
                        isToday(day) ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-800 dark:text-neutral-100'
                      }`}
                    >
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
                  <td colSpan={8} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-neutral-500">
                      <Calendar size={40} className="text-neutral-300" />
                      <p>{t('schedule.noEmployees', 'ไม่พบพนักงาน กรุณาเพิ่มพนักงานก่อน')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30"
                  >
                    {/* Employee Cell */}
                    <td className="p-3 border-r border-neutral-200 dark:border-neutral-700 sticky left-0 bg-white dark:bg-neutral-900 z-10">
                      <div className="flex items-center gap-3">
                        <Avatar name={employee.fullName} size="sm" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                            {employee.fullName}
                          </div>
                          <div className="text-xs text-neutral-500">{employee.employeeCode}</div>
                        </div>
                      </div>
                    </td>

                    {/* Day Cells */}
                    {weekDays.map((day) => {
                      const dateStr = formatDate(day);
                      const cellShifts = getShiftsForCell(dateStr, employee.id);

                      return (
                        <td
                          key={dateStr}
                          className={`p-2 min-h-[90px] align-top ${
                            isToday(day) ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''
                          }`}
                        >
                          <div className="space-y-1.5">
                            {cellShifts.map((shift) => {
                              const statusConfig = SHIFT_STATUS_CONFIG[shift.status as keyof typeof SHIFT_STATUS_CONFIG];
                              return (
                                <div
                                  key={shift.id}
                                  className={`
                                    p-2 rounded-md text-xs cursor-pointer transition-all
                                    hover:shadow-sm hover:scale-[1.01]
                                    ${
                                      shift.status === 'published'
                                        ? 'bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800'
                                        : 'bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800'
                                    }
                                  `}
                                  style={{
                                    borderLeftWidth: '3px',
                                    borderLeftColor: shift.template?.color || '#3B82F6',
                                  }}
                                  onClick={() => openEditModal(shift)}
                                >
                                  {/* Time */}
                                  <div className="flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-200">
                                    <Clock size={12} />
                                    {shift.startTime} - {shift.endTime}
                                  </div>

                                  {/* Location */}
                                  {shift.location && (
                                    <div className="flex items-center gap-1 mt-1 text-neutral-500 dark:text-neutral-400 truncate">
                                      <MapPin size={10} />
                                      <span className="truncate">{shift.location}</span>
                                    </div>
                                  )}

                                  {/* Status badge */}
                                  <div className="mt-1.5">
                                    <Badge variant={statusConfig.variant} size="sm">
                                      {statusConfig.label}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Add shift button */}
                            <button
                              className="
                                w-full p-2 rounded-md
                                border-2 border-dashed border-neutral-200 dark:border-neutral-700
                                text-neutral-400 hover:border-primary-300 hover:text-primary-500
                                hover:bg-primary-50 dark:hover:bg-primary-900/20
                                transition-colors
                              "
                              onClick={() => openCreateModal(dateStr, employee.id)}
                            >
                              <Plus size={16} className="mx-auto" />
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
      <div className="flex items-center gap-6 text-sm text-neutral-500">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-warning-100 border border-warning-200"></span>
          <span>{t('schedule.draftLegend', 'ร่าง (ยังไม่ประกาศ)')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-success-100 border border-success-200"></span>
          <span>{t('schedule.publishedLegend', 'ประกาศแล้ว')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1 h-3 rounded-sm bg-primary-500"></span>
          <span>{t('schedule.colorCodeLegend', 'สีแสดงประเภทกะ')}</span>
        </div>
      </div>

      {/* Create/Edit Shift Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title={editingShift ? t('schedule.editShift', 'แก้ไขกะ') : t('schedule.createShift', 'สร้างกะใหม่')}
      >
        <div className="space-y-4">
          {!editingShift && (
            <Select
              label={t('schedule.employee', 'พนักงาน')}
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              options={employees.map((e) => ({
                value: e.id,
                label: `${e.fullName} (${e.employeeCode})`,
              }))}
              placeholder={t('schedule.selectEmployee', 'เลือกพนักงาน')}
            />
          )}

          <Input
            type="date"
            label={t('schedule.date', 'วันที่')}
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            disabled={!!editingShift}
          />

          {templates.length > 0 && !editingShift && (
            <Select
              label={t('schedule.template', 'รูปแบบกะ (ตัวเลือก)')}
              value={formData.templateId || ''}
              onChange={(e) => applyTemplate(e.target.value)}
              options={[
                { value: '', label: t('schedule.custom', 'กำหนดเอง') },
                ...templates.map((t) => ({
                  value: t.id,
                  label: `${t.name} (${t.startTime}-${t.endTime})`,
                })),
              ]}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="time"
              label={t('schedule.startTime', 'เวลาเริ่ม')}
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            />
            <Input
              type="time"
              label={t('schedule.endTime', 'เวลาสิ้นสุด')}
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            />
          </div>

          <Input
            label={t('schedule.location', 'สถานที่ (ตัวเลือก)')}
            value={formData.location || ''}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder={t('schedule.locationPlaceholder', 'เช่น อาคาร A')}
          />

          <div className="flex justify-between pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div>
              {editingShift && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Trash2 size={16} />}
                  className="text-error-600 hover:text-error-700 hover:bg-error-50"
                  onClick={() => {
                    handleDeleteShift(editingShift.id);
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  {t('common.delete', 'ลบกะ')}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                {t('common.cancel', 'ยกเลิก')}
              </Button>
              <Button variant="primary" onClick={editingShift ? handleUpdateShift : handleCreateShift}>
                {editingShift ? t('common.save', 'บันทึก') : t('schedule.createShift', 'สร้างกะ')}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Publish Modal */}
      <Modal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        title={t('schedule.confirmPublish', 'ยืนยันการประกาศกะ')}
      >
        <div className="space-y-4">
          <p className="text-neutral-600 dark:text-neutral-300">
            {t('schedule.publishConfirmText', 'คุณต้องการประกาศกะทั้งหมด')}{' '}
            <span className="font-semibold text-primary-600">{draftCount} {t('schedule.shifts', 'กะ')}</span>{' '}
            {t('schedule.inThisWeek', 'ในสัปดาห์นี้หรือไม่?')}
          </p>
          <p className="text-sm text-neutral-500">
            {t('schedule.publishNote', 'พนักงานจะได้รับการแจ้งเตือนเกี่ยวกับตารางเวรของพวกเขา')}
          </p>
          <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <Button variant="ghost" onClick={() => setShowPublishModal(false)}>
              {t('common.cancel', 'ยกเลิก')}
            </Button>
            <Button variant="primary" leftIcon={<Send size={16} />} onClick={handlePublish}>
              {t('schedule.publish', 'ประกาศกะ')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Copy Modal */}
      <Modal
        isOpen={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        title={t('schedule.copyFromPrevious', 'คัดลอกกะจากสัปดาห์ก่อน')}
      >
        <div className="space-y-4">
          <Input
            type="date"
            label={t('schedule.sourceWeek', 'จากวันจันทร์ของสัปดาห์ต้นทาง')}
            value={copySource}
            onChange={(e) => setCopySource(e.target.value)}
          />
          <Input
            type="date"
            label={t('schedule.targetWeek', 'ไปยังวันจันทร์ของสัปดาห์ปลายทาง')}
            value={copyTarget}
            onChange={(e) => setCopyTarget(e.target.value)}
          />
          <p className="text-sm text-neutral-500">
            {t('schedule.copyNote', 'กะที่ซ้ำหรือทับซ้อนจะถูกข้ามไปโดยอัตโนมัติ')}
          </p>
          <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <Button variant="ghost" onClick={() => setShowCopyModal(false)}>
              {t('common.cancel', 'ยกเลิก')}
            </Button>
            <Button variant="primary" leftIcon={<Copy size={16} />} onClick={handleCopy}>
              {t('schedule.copyShifts', 'คัดลอกกะ')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}

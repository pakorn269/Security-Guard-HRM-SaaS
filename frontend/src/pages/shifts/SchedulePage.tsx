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
  GripHorizontal,
} from 'lucide-react';
import {
  DndContext,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useDraggable, useDroppable } from '@dnd-kit/core';
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

// Draggable Shift Component
interface DraggableShiftProps {
  shift: ShiftWithDetails;
  onClick: (shift: ShiftWithDetails) => void;
  statusConfig: typeof SHIFT_STATUS_CONFIG[keyof typeof SHIFT_STATUS_CONFIG];
}

const DraggableShift = ({ shift, onClick, statusConfig }: DraggableShiftProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shift.id,
    data: shift,
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        p-2 rounded-md text-xs cursor-grab active:cursor-grabbing transition-all
        hover:shadow-sm hover:scale-[1.01] relative group
        ${shift.status === 'published'
          ? 'bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800'
          : 'bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800'
        }
      `}
      {...listeners}
      {...attributes}
    >
      <div
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/10 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onClick(shift);
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <GripHorizontal size={14} className="text-neutral-400" />
      </div>

      <div style={{
        borderLeftWidth: '3px',
        borderLeftColor: shift.template?.color || '#3B82F6',
        height: '100%',
        paddingLeft: '6px',
        marginLeft: '-6px'
      }}
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
    </div>
  );
};

// Droppable Cell Component
interface DroppableCellProps {
  date: string;
  employeeId: string;
  children: React.ReactNode;
  isToday: boolean;
}

const DroppableCell = ({ date, employeeId, children, isToday }: DroppableCellProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `${date}::${employeeId}`,
    data: { date, employeeId },
  });

  return (
    <td
      ref={setNodeRef}
      className={`p-2 min-h-[90px] align-top transition-colors ${isOver ? 'bg-primary-100/50 dark:bg-primary-900/40 ring-2 ring-inset ring-primary-400' : ''
        } ${isToday ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''
        }`}
    >
      <div className="space-y-1.5 h-full min-h-[80px]">
        {children}
      </div>
    </td>
  );
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
  const [isMobile, setIsMobile] = useState(false);
  const toast = useToast();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftWithDetails | null>(null);
  const [activeDragShift, setActiveDragShift] = useState<ShiftWithDetails | null>(null);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

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

  // Drag and Drop Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragShift(active.data.current as ShiftWithDetails);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragShift(null);

    if (!over) return;

    const shift = active.data.current as ShiftWithDetails;
    const [targetDate, targetEmployeeId] = (over.id as string).split('::');

    // If dropped on same day and same employee, do nothing
    if (shift.date === targetDate && shift.employeeId === targetEmployeeId) {
      return;
    }

    // Confirm reschedule if employee changes
    if (shift.employeeId !== targetEmployeeId && !confirm(t('schedule.confirmReassign', 'Assign this shift to another employee?'))) {
      return;
    }

    // Optimistic update (optional, but let's just use loading state for now or simple toast)
    try {
      // Don't modify start/end times, just the date and employee

      // Calculate new start/end times if we needed to preserve "time of day" but here we just keep the string HH:mm
      // Use existing HH:mm

      await updateShift(shift.id, {
        date: targetDate,
        employeeId: targetEmployeeId,
      });

      toast.success(t('schedule.rescheduleSuccess', 'Moved shift successfully'));
      loadData(); // Refresh data
    } catch (error) {
      console.error('Failed to reschedule:', error);
      toast.error(t('schedule.rescheduleError', 'Failed to move shift'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t('schedule.title', 'ตารางเวร')}
        description={t('schedule.subtitle', 'จัดการตารางเวรของพนักงาน')}
        hideDescriptionOnMobile
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Copy size={16} />}
              onClick={openCopyModal}
              className="hidden sm:inline-flex"
            >
              {t('schedule.copyWeek', 'คัดลอกจากสัปดาห์ก่อน')}
            </Button>
            {draftCount > 0 && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Send size={16} />}
                onClick={() => setShowPublishModal(true)}
              >
                <span className="hidden xs:inline">{t('schedule.publish', 'ประกาศกะ')}</span>
                <span className="xs:hidden">ประกาศ</span>
                <span className="ml-1">({draftCount})</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Navigation & View Controls */}
      <Card variant="bordered" padding="md" className="mobile-p-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <Button variant="ghost" size="sm" onClick={goToPreviousWeek} className="touch-target">
              <ChevronLeft size={18} />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday} className="touch-target">
              {t('schedule.today', 'วันนี้')}
            </Button>
            <Button variant="ghost" size="sm" onClick={goToNextWeek} className="touch-target">
              <ChevronRight size={18} />
            </Button>
            <span className="text-sm sm:text-base font-semibold text-neutral-800 dark:text-neutral-100 ml-1 sm:ml-2 truncate">
              {weekDays[0].toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })}
            </span>
          </div>

          {/* Stats - horizontal scroll on mobile */}
          <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto mobile-scroll-x -mx-2 px-2 sm:mx-0 sm:px-0">
            <div className="flex items-center gap-2 text-sm flex-shrink-0">
              <span className="text-neutral-500">{t('schedule.draft', 'ร่าง')}:</span>
              <Badge variant="warning" size="sm">
                {draftCount}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm flex-shrink-0">
              <span className="text-neutral-500">{t('schedule.published', 'ประกาศแล้ว')}:</span>
              <Badge variant="success" size="sm">
                {publishedCount}
              </Badge>
            </div>
          </div>

          {/* View Toggle - hidden on mobile, we use agenda view */}
          <div className="hidden md:block">
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
        </div>
      </Card>

      {/* Mobile Agenda View */}
      {isMobile ? (
        <div className="space-y-4">
          {weekDays.map((day) => {
            const dateStr = formatDate(day);
            const dayShifts = shifts.filter((s) => s.date === dateStr);
            const isTodayDate = isToday(day);

            return (
              <Card key={dateStr} variant="bordered" padding="none" className={isTodayDate ? 'ring-2 ring-primary-400' : ''}>
                {/* Day Header */}
                <div className={`px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 ${isTodayDate ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-neutral-50 dark:bg-neutral-800/50'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                        {getDayName(day)}
                      </span>
                      <div className={`text-lg font-semibold ${isTodayDate ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-800 dark:text-neutral-100'}`}>
                        {formatDisplayDate(day)}
                      </div>
                    </div>
                    <Badge variant={isTodayDate ? 'primary' : 'neutral'} size="sm">
                      {dayShifts.length} {t('schedule.shifts', 'กะ')}
                    </Badge>
                  </div>
                </div>

                {/* Shifts List */}
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {dayShifts.length === 0 ? (
                    <div className="p-4 text-center text-neutral-400 text-sm">
                      {t('schedule.noShifts', 'ไม่มีกะงาน')}
                    </div>
                  ) : (
                    dayShifts.map((shift) => {
                      const statusConfig = SHIFT_STATUS_CONFIG[shift.status as keyof typeof SHIFT_STATUS_CONFIG];
                      return (
                        <div
                          key={shift.id}
                          className="p-4 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 active:bg-neutral-100 dark:active:bg-neutral-800/50 transition-colors cursor-pointer"
                          onClick={() => openEditModal(shift)}
                          style={{ borderLeftWidth: '4px', borderLeftColor: shift.template?.color || '#3B82F6' }}
                        >
                          <Avatar name={shift.employee?.fullName || ''} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                              {shift.employee?.fullName || '-'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                              <Clock size={12} />
                              <span className="font-mono">{shift.startTime} - {shift.endTime}</span>
                              {shift.location && (
                                <>
                                  <MapPin size={12} />
                                  <span className="truncate">{shift.location}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge variant={statusConfig.variant} size="sm">
                            {statusConfig.label}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Desktop Calendar Grid */
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
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
                        className={`p-3 text-center border-b border-neutral-200 dark:border-neutral-700 min-w-[130px] ${isToday(day) ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                          }`}
                      >
                        <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                          {getDayName(day)}
                        </div>
                        <div
                          className={`text-base font-semibold mt-0.5 ${isToday(day) ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-800 dark:text-neutral-100'
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
                            <DroppableCell
                              key={dateStr}
                              date={dateStr}
                              employeeId={employee.id}
                              isToday={isToday(day)}
                            >
                              {cellShifts.map((shift) => (
                                <DraggableShift
                                  key={shift.id}
                                  shift={shift}
                                  onClick={openEditModal}
                                  statusConfig={SHIFT_STATUS_CONFIG[shift.status as keyof typeof SHIFT_STATUS_CONFIG]}
                                />
                              ))}

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
                            </DroppableCell>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <DragOverlay>
            {activeDragShift ? (
              <div
                className={`
               p-2 rounded-md text-xs shadow-lg opacity-80 rotate-3 scale-105 cursor-grabbing w-[120px] bg-white dark:bg-neutral-800
               ${activeDragShift.status === 'published'
                    ? 'bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800'
                    : 'bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800'
                  }
             `}
                style={{
                  borderLeftWidth: '3px',
                  borderLeftColor: activeDragShift.template?.color || '#3B82F6',
                }}
              >
                <div className="flex items-center gap-1 font-medium text-neutral-900 dark:text-neutral-100">
                  <Clock size={12} />
                  {activeDragShift.startTime} - {activeDragShift.endTime}
                </div>
                {activeDragShift.location && (
                  <div className="flex items-center gap-1 mt-1 text-neutral-600 dark:text-neutral-400 truncate">
                    <MapPin size={10} />
                    <span className="truncate">{activeDragShift.location}</span>
                  </div>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Legend - hidden on mobile */}
      <div className="hidden sm:flex items-center gap-6 text-sm text-neutral-500">
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

      {/* Mobile FAB for adding shifts */}
      {isMobile && (
        <button
          onClick={() => {
            const today = formatDate(currentDate);
            setFormData({ ...formData, date: today });
            setShowCreateModal(true);
          }}
          className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-primary-500 hover:bg-primary-600 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 safe-area-bottom"
          aria-label={t('schedule.addShift', 'เพิ่มกะ')}
        >
          <Plus size={24} />
        </button>
      )}

      {/* Toast */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}

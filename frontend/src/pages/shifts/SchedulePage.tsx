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
  LayoutTemplate,
  GripHorizontal,
  AlertTriangle,
  AlertCircle,
  Square,
  CheckSquare,
  X,
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
  bulkPublishShifts,
  bulkDeleteShifts,
} from '../../services/shift.service';
import { employeeService } from '../../services/employee.service';
import type { Employee as FullEmployee } from '../../types/employee.types';
import { listLeaveRequests, type LeaveRequestWithDetails } from '../../services/leave.service';
import { sitesService, type Site } from '../../services/sites.service';
import type { ShiftTemplate, ShiftWithDetails, CreateShiftRequest } from '../../types/shift.types';
import { calculateWeeklyCost, calculateShiftCost, calculateShiftHours, formatCurrency, formatHours } from '../../utils/shiftCost';
import { validateShift, getMostSevereWarning, isPastShift, type ShiftWarning } from '../../utils/shiftValidation';
import { Button, Modal, LoadingSpinner, Card, Input, Select, Badge, Avatar } from '../../components/common';
import { PageHeader } from '../../components/layout';
import { Tabs, TabList, Tab } from '../../components/navigation';
import { useToast, ToastContainer } from '../../components/common/Toast';
import Tooltip from '../../components/ui/Tooltip';
import Alert from '../../components/feedback/Alert';
import ShiftTemplateSidebar from '../../components/shifts/ShiftTemplateSidebar';

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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  onDuplicate: (shift: ShiftWithDetails) => void;
  statusConfig: typeof SHIFT_STATUS_CONFIG[keyof typeof SHIFT_STATUS_CONFIG];
  warnings?: ShiftWarning[];
  isSelected?: boolean;
  onToggleSelect?: (shiftId: string) => void;
}

const DraggableShift = ({ shift, onClick, onDuplicate, statusConfig, warnings = [], isSelected = false, onToggleSelect }: DraggableShiftProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shift.id,
    data: shift,
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  } : undefined;

  const mostSevereWarning = getMostSevereWarning(warnings);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        p-2 rounded-md text-xs cursor-grab active:cursor-grabbing transition-all
        hover:shadow-sm hover:scale-[1.01] relative group
        ${isSelected
          ? 'ring-2 ring-primary-500 ring-offset-1 dark:ring-offset-neutral-900'
          : ''
        }
        ${shift.status === 'published'
          ? 'bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800'
          : 'bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800'
        }
      `}
      {...listeners}
      {...attributes}
    >
      {/* Selection checkbox */}
      {onToggleSelect && (
        <div
          className="absolute top-1 left-1 z-20 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(shift.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {isSelected ? (
            <CheckSquare size={16} className="text-primary-600 dark:text-primary-400" />
          ) : (
            <Square size={16} className="text-neutral-400 dark:text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      )}

      {/* Warning indicator */}
      {mostSevereWarning && (
        <div className="absolute top-1 left-1 z-10">
          <Tooltip
            content={
              <div className="max-w-xs whitespace-normal">
                {mostSevereWarning.messageTh}
              </div>
            }
            placement="top"
          >
            <div className={`
              flex items-center justify-center w-5 h-5 rounded-full
              ${mostSevereWarning.severity === 'error'
                ? 'bg-error-100 dark:bg-error-900/30 text-error-600 dark:text-error-400'
                : 'bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400'
              }
            `}>
              {mostSevereWarning.severity === 'error' ? (
                <AlertCircle size={14} />
              ) : (
                <AlertTriangle size={14} />
              )}
            </div>
          </Tooltip>
        </div>
      )}

      {/* Action buttons */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
        {/* Duplicate button */}
        <div
          className="p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(shift);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          title="Duplicate shift"
        >
          <Copy size={14} className="text-blue-500" />
        </div>

        {/* Edit/drag handle */}
        <div
          className="p-0.5 rounded hover:bg-black/10 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onClick(shift);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <GripHorizontal size={14} className="text-neutral-400" />
        </div>
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

        {/* Duration */}
        <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
          {(() => {
            const hours = calculateShiftHours(shift.startTime, shift.endTime, 0);
            const breakdown = calculateShiftCost(shift, 250);
            return (
              <>
                {formatHours(hours)} hrs
                {breakdown.overtimeHours > 0 && (
                  <span className="text-warning-600 dark:text-warning-400 ml-1">
                    (+{formatHours(breakdown.overtimeHours)} OT)
                  </span>
                )}
              </>
            );
          })()}
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
  const [employees, setEmployees] = useState<FullEmployee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestWithDetails[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
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
  const [showCostModal, setShowCostModal] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftWithDetails | null>(null);
  const [activeDragShift, setActiveDragShift] = useState<ShiftWithDetails | null>(null);

  // Multi-select state
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());

  // Template sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    siteId: '',
    zoneId: '',
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
      const [templatesRes, shiftsRes, employeesRes, leaveRes, sitesRes] = await Promise.all([
        listShiftTemplates(),
        listShifts({
          startDate: weekStart,
          endDate: weekEnd,
        }),
        employeeService.list({ status: 'active' }),
        listLeaveRequests({
          status: 'approved',
          startDate: weekStart,
          endDate: weekEnd,
        }),
        sitesService.list(),
      ]);

      setTemplates(templatesRes);
      setShifts(shiftsRes.shifts);
      setEmployees(employeesRes.data); // Use full Employee objects for validation
      setLeaveRequests(leaveRes.requests);
      setSites(sitesRes.data.filter(s => s.isActive));
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

  // Calculate weekly cost summary
  const weeklyCost = calculateWeeklyCost(shifts, 250); // Default 250 THB/hour

  // Handle shift creation
  const handleCreateShift = async () => {
    try {
      await createShift(formData);
      setShowCreateModal(false);
      toast.success(t('schedule.createSuccess', 'สร้างกะสำเร็จ'));
      loadData();
      resetForm();
    } catch (error: any) {
      console.error('Error creating shift:', error);

      // Display specific error message from backend
      const errorMessage = error?.message_th || error?.message || t('schedule.createError', 'เกิดข้อผิดพลาดในการสร้างกะ');
      toast.error(errorMessage);
    }
  };

  // Handle shift update
  const handleUpdateShift = async () => {
    if (!editingShift) return;

    // Check if this is a past shift (retroactive edit)
    const isPast = isPastShift(formData.date, formData.endTime);

    // If shift is published, show confirmation dialog
    if (editingShift.status === 'published') {
      const employeeName = editingShift.employee?.fullName || 'พนักงาน';

      let confirmMessage: string;
      if (isPast) {
        // Retroactive edit warning
        confirmMessage = t(
          'schedule.confirmUpdatePastPublished',
          `⚠️ การแก้ไขกะย้อนหลัง\n\nคุณกำลังแก้ไขกะที่ผ่านไปแล้วของ ${employeeName}\n\n• อาจส่งผลต่อการคำนวณเงินเดือนและ OT\n• จะไม่มีการส่งการแจ้งเตือนไปยังพนักงาน\n\nยืนยันการแก้ไข?`
        );
      } else {
        // Future shift edit
        confirmMessage = t(
          'schedule.confirmUpdatePublished',
          `แก้ไขกะที่เผยแพร่แล้วสำหรับ ${employeeName}?\n\nพนักงานจะได้รับการแจ้งเตือนเกี่ยวกับการเปลี่ยนแปลงผ่าน LINE`
        );
      }

      const confirmed = window.confirm(confirmMessage);

      if (!confirmed) {
        return; // User cancelled
      }
    }

    try {
      await updateShift(editingShift.id, {
        startTime: formData.startTime,
        endTime: formData.endTime,
        siteId: formData.siteId || null,
        zoneId: formData.zoneId || null,
        location: formData.location || null,
        notes: formData.notes || null,
      });
      setShowCreateModal(false);
      setEditingShift(null);

      // Success toast message varies based on whether it's a past shift
      if (editingShift.status === 'published') {
        if (isPast) {
          toast.success(
            t('schedule.updatePastSuccess', 'อัปเดตกะย้อนหลังสำเร็จ (ไม่มีการส่งการแจ้งเตือน)')
          );
        } else {
          toast.success(
            t('schedule.updatePublishedSuccess', `อัปเดตกะสำเร็จ ส่งการแจ้งเตือนไปยัง ${editingShift.employee?.fullName || 'พนักงาน'} แล้ว`)
          );
        }
      } else {
        toast.success(t('schedule.updateSuccess', 'อัปเดตกะสำเร็จ'));
      }

      loadData();
      resetForm();
    } catch (error: any) {
      console.error('Error updating shift:', error);

      // Display specific error message from backend
      const errorMessage = error?.message_th || error?.message || t('schedule.updateError', 'เกิดข้อผิดพลาดในการอัปเดตกะ');
      toast.error(errorMessage);
    }
  };

  // Handle shift deletion
  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm(t('schedule.deleteConfirm', 'ยืนยันการลบกะนี้?'))) return;
    try {
      await deleteShift(shiftId);
      toast.success(t('schedule.deleteSuccess', 'ลบกะสำเร็จ'));
      loadData();
    } catch (error: any) {
      console.error('Error deleting shift:', error);

      // Display specific error message from backend
      const errorMessage = error?.message_th || error?.message || t('schedule.deleteError', 'เกิดข้อผิดพลาดในการลบกะ');
      toast.error(errorMessage);
    }
  };

  // Handle publish
  const handlePublish = async () => {
    try {
      await publishShifts({ startDate: weekStart, endDate: weekEnd });
      setShowPublishModal(false);
      toast.success(t('schedule.publishSuccess', 'ประกาศกะสำเร็จ'));
      loadData();
    } catch (error: any) {
      console.error('Error publishing shifts:', error);

      // Display specific error message from backend
      const errorMessage = error?.message_th || error?.message || t('schedule.publishError', 'เกิดข้อผิดพลาดในการประกาศกะ');
      toast.error(errorMessage);
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
    } catch (error: any) {
      console.error('Error copying shifts:', error);

      // Display specific error message from backend
      const errorMessage = error?.message_th || error?.message || t('schedule.copyError', 'เกิดข้อผิดพลาดในการคัดลอกกะ');
      toast.error(errorMessage);
    }
  };

  // Multi-select handlers
  const toggleShiftSelection = (shiftId: string) => {
    setSelectedShiftIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shiftId)) {
        newSet.delete(shiftId);
      } else {
        newSet.add(shiftId);
      }
      return newSet;
    });
  };

  const selectAllVisibleShifts = () => {
    const allVisibleShiftIds = shifts.map(s => s.id);
    setSelectedShiftIds(new Set(allVisibleShiftIds));
  };

  const clearSelection = () => {
    setSelectedShiftIds(new Set());
  };

  // Handle bulk publish
  const handleBulkPublish = async () => {
    const shiftIds = Array.from(selectedShiftIds);
    if (shiftIds.length === 0) return;

    if (!confirm(t('schedule.bulkPublishConfirm', `ยืนยันการประกาศ ${shiftIds.length} กะ?`))) return;

    try {
      const result = await bulkPublishShifts(shiftIds);
      clearSelection();

      let message = `ประกาศ ${result.successCount} กะสำเร็จ`;
      if (result.notificationSentCount > 0) {
        message += ` (ส่งการแจ้งเตือน ${result.notificationSentCount} กะ`;
        if (result.skippedPastCount > 0) {
          message += `, ข้าม ${result.skippedPastCount} กะที่ผ่านมาแล้ว`;
        }
        message += ')';
      }

      toast.success(message);
      loadData();
    } catch (error: any) {
      console.error('Error bulk publishing shifts:', error);
      const errorMessage = error?.message_th || error?.message || t('schedule.bulkPublishError', 'เกิดข้อผิดพลาดในการประกาศกะ');
      toast.error(errorMessage);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    const shiftIds = Array.from(selectedShiftIds);
    if (shiftIds.length === 0) return;

    if (!confirm(t('schedule.bulkDeleteConfirm', `คุณแน่ใจหรือไม่ที่จะลบ ${shiftIds.length} กะ?`))) return;

    try {
      const result = await bulkDeleteShifts(shiftIds);
      clearSelection();

      if (result.skippedCount === 0) {
        toast.success(`ลบ ${result.deletedCount} กะสำเร็จ`);
      } else {
        toast.warning(
          `ลบ ${result.deletedCount} กะสำเร็จ ข้าม ${result.skippedCount} กะที่มีบันทึกการเข้า-ออกงาน`
        );
      }

      loadData();
    } catch (error: any) {
      console.error('Error bulk deleting shifts:', error);
      const errorMessage = error?.message_th || error?.message || t('schedule.bulkDeleteError', 'เกิดข้อผิดพลาดในการลบกะ');
      toast.error(errorMessage);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      employeeId: '',
      date: '',
      startTime: '08:00',
      endTime: '17:00',
      siteId: '',
      zoneId: '',
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
      siteId: shift.siteId || '',
      zoneId: shift.zoneId || '',
      location: shift.location || '',
      notes: shift.notes || '',
    });
    setShowCreateModal(true);
  };

  // Duplicate shift
  const duplicateShift = (shift: ShiftWithDetails) => {
    setEditingShift(null); // Not editing, creating new
    setFormData({
      employeeId: shift.employeeId,
      date: shift.date, // Same date by default, user can change
      startTime: shift.startTime,
      endTime: shift.endTime,
      siteId: shift.siteId || '',
      zoneId: shift.zoneId || '',
      location: shift.location || '',
      notes: shift.notes || '',
    });
    setShowCreateModal(true);
    toast.success(t('schedule.duplicateReady', 'Shift copied. Modify date/employee as needed.'));
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

  // Check if employee has approved leave on a specific date
  const isEmployeeOnLeave = (employeeId: string, date: string): LeaveRequestWithDetails | undefined => {
    return leaveRequests.find(
      (leave) =>
        leave.employeeId === employeeId &&
        leave.startDate <= date &&
        leave.endDate >= date
    );
  };

  // Calculate employee weekly hours
  const getEmployeeWeeklyHours = (employeeId: string): number => {
    return shifts
      .filter(s => s.employeeId === employeeId && s.status !== 'cancelled')
      .reduce((total, shift) => {
        return total + calculateShiftHours(shift.startTime, shift.endTime, 0);
      }, 0);
  };

  // Get employee shift count
  const getEmployeeShiftCount = (employeeId: string): number => {
    return shifts.filter(s => s.employeeId === employeeId && s.status !== 'cancelled').length;
  };

  // Calculate warnings for a shift
  const getShiftWarnings = (shift: ShiftWithDetails): ShiftWarning[] => {
    return validateShift({
      shift,
      allShifts: shifts,
      employees,
      leaveRequests,
    });
  };

  // Get all conflicts across the schedule
  const getAllConflicts = (): { errors: number; warnings: number; details: Array<{ shift: ShiftWithDetails; warning: ShiftWarning }> } => {
    const conflicts: Array<{ shift: ShiftWithDetails; warning: ShiftWarning }> = [];
    let errorCount = 0;
    let warningCount = 0;

    shifts.forEach(shift => {
      const warnings = getShiftWarnings(shift);
      warnings.forEach(warning => {
        conflicts.push({ shift, warning });
        if (warning.severity === 'error') {
          errorCount++;
        } else {
          warningCount++;
        }
      });
    });

    return { errors: errorCount, warnings: warningCount, details: conflicts };
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

    const draggedData = active.data.current;
    const [targetDate, targetEmployeeId] = (over.id as string).split('::');

    // Check if dragging a template (ID starts with 'template-')
    if (typeof active.id === 'string' && active.id.startsWith('template-')) {
      // Template Quick Apply
      const template = draggedData?.template as ShiftTemplate;
      if (!template) return;

      try {
        const newShift: CreateShiftRequest = {
          employeeId: targetEmployeeId,
          templateId: template.id,
          date: targetDate,
          startTime: template.startTime,
          endTime: template.endTime,
        };

        await createShift(newShift);
        toast.success(t('schedule.templateApplied', `สร้างกะ "${template.nameTh || template.name}" สำเร็จ`));
        loadData();
      } catch (error: any) {
        console.error('Failed to create shift from template:', error);
        const errorMessage = error?.message_th || error?.message || t('schedule.createShiftError', 'เกิดข้อผิดพลาดในการสร้างกะ');
        toast.error(errorMessage);
      }
      return;
    }

    // Regular shift reschedule
    const shift = draggedData as ShiftWithDetails;
    if (!shift || !shift.id) return;

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
              variant={isSidebarOpen ? 'primary' : 'outline'}
              size="sm"
              leftIcon={<LayoutTemplate size={16} />}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:inline-flex"
            >
              {t('schedule.templates', 'กะสำเร็จรูป')}
            </Button>
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

      {/* Conflicts Summary Alert */}
      {(() => {
        const conflicts = getAllConflicts();
        if (conflicts.errors === 0 && conflicts.warnings === 0) return null;

        return (
          <Alert
            variant={conflicts.errors > 0 ? 'error' : 'warning'}
            title={
              conflicts.errors > 0
                ? `พบข้อผิดพลาด ${conflicts.errors} รายการ`
                : `พบคำเตือน ${conflicts.warnings} รายการ`
            }
            dismissible={false}
          >
            <div className="text-sm space-y-1">
              {conflicts.errors > 0 && (
                <div>
                  • <strong>{conflicts.errors}</strong> กะมีข้อผิดพลาดที่ต้องแก้ไข (ระยะพักไม่เพียงพอ, เกินชั่วโมงต่อสัปดาห์, พนักงานลา)
                </div>
              )}
              {conflicts.warnings > 0 && (
                <div>
                  • <strong>{conflicts.warnings}</strong> กะมีคำเตือน (ใกล้เกินชั่วโมงต่อสัปดาห์)
                </div>
              )}
              <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-2">
                💡 ชี้เมาส์ที่ไอคอนคำเตือนบนกะเพื่อดูรายละเอียด
              </div>
            </div>
          </Alert>
        );
      })()}

      {/* Navigation & View Controls */}
      <Card variant="bordered" padding="md" className="mobile-p-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <Button variant="ghost" size="sm" onClick={goToPreviousWeek} className="touch-target">
              <ChevronLeft size={18} />
            </Button>

            {/* Date Picker for Quick Jump */}
            <input
              type="date"
              value={formatDate(currentDate)}
              onChange={(e) => setCurrentDate(new Date(e.target.value))}
              className="px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 cursor-pointer hover:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              title={t('schedule.jumpToDate', 'เลือกวันที่')}
            />

            <Button variant="outline" size="sm" onClick={goToToday} className="touch-target">
              {t('schedule.today', 'วันนี้')}
            </Button>
            <Button variant="ghost" size="sm" onClick={goToNextWeek} className="touch-target">
              <ChevronRight size={18} />
            </Button>
            <span className="hidden sm:inline text-sm font-semibold text-neutral-800 dark:text-neutral-100 ml-1 truncate">
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
            {/* Cost Summary */}
            {weeklyCost.totalShifts > 0 && (
              <button
                onClick={() => setShowCostModal(true)}
                className="flex items-center gap-2 text-sm flex-shrink-0 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                title={t('schedule.viewCostBreakdown', 'ดูรายละเอียดค่าใช้จ่าย')}
              >
                <span className="text-primary-700 dark:text-primary-300">💰</span>
                <div className="flex flex-col items-start">
                  <span className="text-xs text-primary-600 dark:text-primary-400">
                    {t('schedule.weekCost', 'ค่าใช้จ่าย')}
                  </span>
                  <span className="font-semibold text-primary-700 dark:text-primary-300">
                    {formatCurrency(weeklyCost.totalCost)}
                  </span>
                </div>
              </button>
            )}
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

      {/* Month View - Coming Soon Placeholder */}
      {view === 'month' && !isMobile ? (
        <Card variant="bordered">
          <div className="flex flex-col items-center justify-center min-h-96 text-center p-12">
            <Calendar size={64} className="text-neutral-400 dark:text-neutral-500 mb-4" />
            <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              {t('schedule.monthViewComingSoon', 'มุมมองรายเดือนกำลังพัฒนา')}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md">
              {t(
                'schedule.monthViewMessage',
                'ฟีเจอร์นี้กำลังอยู่ระหว่างการพัฒนา กรุณาใช้มุมมองรายสัปดาห์ในขณะนี้'
              )}
            </p>
          </div>
        </Card>
      ) : null}

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
      ) : view === 'week' ? (
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
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                                {employee.fullName}
                              </div>
                              <div className="text-xs text-neutral-500">{employee.employeeCode}</div>

                              {/* Workload Indicator */}
                              {(() => {
                                const weeklyHours = getEmployeeWeeklyHours(employee.id);
                                const shiftCount = getEmployeeShiftCount(employee.id);
                                const percentage = Math.min((weeklyHours / 48) * 100, 100);
                                const status = weeklyHours > 48 ? 'over' : weeklyHours >= 40 ? 'high' : 'normal';

                                const warningMessage =
                                  status === 'over'
                                    ? `เกินจำนวนชั่วโมงต่อสัปดาห์ (${weeklyHours.toFixed(1)} / 48 ชม.)`
                                    : status === 'high'
                                    ? `ใกล้ถึงขีดจำกัดชั่วโมงต่อสัปดาห์ (${weeklyHours.toFixed(1)} / 48 ชม.)`
                                    : undefined;

                                return (
                                  <div className="mt-1">
                                    <div className="flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400 mb-0.5">
                                      <span className={status === 'over' ? 'text-error-600 dark:text-error-400 font-medium' : status === 'high' ? 'text-warning-600 dark:text-warning-400 font-medium' : ''}>
                                        {formatHours(weeklyHours)}/48h
                                      </span>
                                      <span>•</span>
                                      <span>{shiftCount} shifts</span>
                                      {(status === 'over' || status === 'high') && warningMessage && (
                                        <Tooltip content={warningMessage} placement="top">
                                          <div className="inline-flex">
                                            {status === 'over' ? (
                                              <AlertCircle size={12} className="text-error-600 dark:text-error-400" />
                                            ) : (
                                              <AlertTriangle size={12} className="text-warning-600 dark:text-warning-400" />
                                            )}
                                          </div>
                                        </Tooltip>
                                      )}
                                    </div>
                                    <div className="h-1 w-full bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full transition-all ${
                                          status === 'over' ? 'bg-error-500' :
                                          status === 'high' ? 'bg-warning-500' :
                                          'bg-success-500'
                                        }`}
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </td>

                        {/* Day Cells */}
                        {weekDays.map((day) => {
                          const dateStr = formatDate(day);
                          const cellShifts = getShiftsForCell(dateStr, employee.id);
                          const employeeLeave = isEmployeeOnLeave(employee.id, dateStr);

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
                                  onDuplicate={duplicateShift}
                                  statusConfig={SHIFT_STATUS_CONFIG[shift.status as keyof typeof SHIFT_STATUS_CONFIG]}
                                  warnings={getShiftWarnings(shift)}
                                  isSelected={selectedShiftIds.has(shift.id)}
                                  onToggleSelect={toggleShiftSelection}
                                />
                              ))}

                              {/* Leave indicator */}
                              {employeeLeave && (
                                <div
                                  className="w-full p-2 rounded-md bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-700 text-warning-700 dark:text-warning-300 text-xs text-center cursor-help"
                                  title={t('schedule.onLeave', `ลาพักร้อน: ${employeeLeave.startDate} - ${employeeLeave.endDate}`)}
                                >
                                  🏖️ {t('schedule.onLeaveShort', 'ลาพักร้อน')}
                                </div>
                              )}

                              {/* Add shift button - disabled if on leave */}
                              {!employeeLeave && (
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
                              )}
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
      ) : null}

      {/* Legend - hidden on mobile, only show in week view */}
      {view === 'week' && (
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
      )}

      {/* Template Sidebar (Fixed Overlay) */}
      <div className={`
        fixed top-0 right-0 h-screen w-80 bg-white dark:bg-neutral-900 shadow-2xl z-50
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <ShiftTemplateSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Overlay backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

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
          {/* Warning banner for published shifts */}
          {editingShift && editingShift.status === 'published' && (
            <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg flex items-start gap-2">
              <div className="flex-shrink-0 text-warning-600 mt-0.5">⚠️</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-warning-900">
                  {t('schedule.editPublishedWarningTitle', 'กะนี้ถูกประกาศแล้ว')}
                </p>
                <p className="text-xs text-warning-700 mt-1">
                  {t('schedule.editPublishedWarningText', 'การเปลี่ยนแปลงจะแจ้งเตือนพนักงานทันที')}
                </p>
              </div>
            </div>
          )}

          {/* Attendance Integrity Warning */}
          {editingShift && editingShift.hasAttendance && (
            <div className="p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-700 rounded-lg flex items-start gap-2">
              <div className="flex-shrink-0 text-error-600 dark:text-error-400 mt-0.5">🔒</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-error-900 dark:text-error-100">
                  {t('schedule.attendanceExistsWarningTitle', 'มีบันทึกการเข้า-ออกงานแล้ว')}
                </p>
                <p className="text-xs text-error-700 dark:text-error-300 mt-1">
                  {t('schedule.attendanceExistsWarningText', 'การเปลี่ยนแปลงเวลาอาจส่งผลต่อการคำนวณเงินเดือนและ OT กรุณาตรวจสอบบันทึกเวลาก่อนบันทึก')}
                </p>
              </div>
            </div>
          )}

          {editingShift ? (
            // Show locked employee field when editing
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {t('schedule.employee', 'พนักงาน')}
              </label>
              <div className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                {editingShift.employee?.fullName} ({editingShift.employee?.employeeCode})
                {editingShift.hasAttendance && (
                  <span className="ml-2 text-xs text-warning-600 dark:text-warning-400">
                    🔒 {t('schedule.attendanceLocked', 'ล็อกแล้ว: มีบันทึกเวลาเข้า-ออกงาน')}
                  </span>
                )}
              </div>
              {editingShift.hasAttendance && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {t('schedule.cannotChangeEmployee', 'ไม่สามารถเปลี่ยนพนักงานได้เนื่องจากมีบันทึกการเข้า-ออกงานแล้ว')}
                </p>
              )}
            </div>
          ) : (
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

          {/* Cost Estimate */}
          {formData.startTime && formData.endTime && (
            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-primary-700 dark:text-primary-300">💰</span>
                  <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                    {t('schedule.estimatedCost', 'ค่าใช้จ่ายประมาณการ')}
                  </span>
                </div>
                <div className="text-right">
                  {(() => {
                    const hours = calculateShiftHours(formData.startTime, formData.endTime, 0);
                    const mockShift = {
                      startTime: formData.startTime,
                      endTime: formData.endTime,
                    } as ShiftWithDetails;
                    const breakdown = calculateShiftCost(mockShift, 250);

                    return (
                      <>
                        <p className="text-lg font-bold text-primary-700 dark:text-primary-300">
                          {formatCurrency(breakdown.totalCost)}
                        </p>
                        <p className="text-xs text-primary-600 dark:text-primary-400">
                          {formatHours(hours)} {t('schedule.hrs', 'ชม.')}
                          {breakdown.overtimeHours > 0 && (
                            <span className="text-warning-600 dark:text-warning-400">
                              {' '}(+{formatHours(breakdown.overtimeHours)} OT)
                            </span>
                          )}
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Site Selector */}
          <Select
            label={t('schedule.site', 'สถานที่')}
            value={formData.siteId || ''}
            onChange={(e) => {
              const selectedSite = sites.find(s => s.id === e.target.value);
              setFormData({
                ...formData,
                siteId: e.target.value,
                zoneId: '', // Reset zone when site changes
                location: selectedSite?.name || '' // Auto-populate location
              });
            }}
            options={[
              { value: '', label: t('schedule.customLocation', 'กำหนดเอง / Custom') },
              ...sites.map(s => ({
                value: s.id,
                label: `${s.name}${s.address ? ` - ${s.address}` : ''}`,
              })),
            ]}
            placeholder={t('schedule.selectSite', 'เลือกสถานที่')}
          />

          {/* Zone Selector - Only show when site is selected and has zones */}
          {formData.siteId && sites.find(s => s.id === formData.siteId)?.zones && sites.find(s => s.id === formData.siteId)!.zones!.length > 0 && (
            <Select
              label={t('schedule.zone', 'จุดตรวจ / Zone (ตัวเลือก)')}
              value={formData.zoneId || ''}
              onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
              options={[
                { value: '', label: t('schedule.noZone', 'ไม่ระบุ') },
                ...(sites.find(s => s.id === formData.siteId)?.zones || [])
                  .filter(z => z.isActive)
                  .map(z => ({
                    value: z.id,
                    label: `${z.name}${z.code ? ` (${z.code})` : ''}`,
                  })),
              ]}
            />
          )}

          {/* Custom Location - Only show when no site is selected */}
          {!formData.siteId && (
            <Input
              label={t('schedule.customLocationInput', 'ระบุสถานที่')}
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder={t('schedule.locationPlaceholder', 'เช่น อาคาร A')}
            />
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {t('schedule.notes', 'หมายเหตุ (ตัวเลือก)')}
            </label>
            <textarea
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('schedule.notesPlaceholder', 'เช่น นำอุปกรณ์รักษาความปลอดภัย')}
              maxLength={1000}
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {(formData.notes || '').length}/1000
            </p>
          </div>

          <div className="flex justify-between pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div>
              {editingShift && (
                <Tooltip
                  content={
                    editingShift.hasAttendance
                      ? t('schedule.cannotDeleteWithAttendance', 'ไม่สามารถลบกะได้เนื่องจากมีบันทึกการเข้า-ออกงานแล้ว')
                      : ''
                  }
                  disabled={!editingShift.hasAttendance}
                >
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
                    disabled={editingShift.hasAttendance}
                  >
                    {t('common.delete', 'ลบกะ')}
                    {editingShift.hasAttendance && ' 🔒'}
                  </Button>
                </Tooltip>
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

      {/* Cost Breakdown Modal */}
      <Modal
        isOpen={showCostModal}
        onClose={() => setShowCostModal(false)}
        title={t('schedule.costBreakdown', 'รายละเอียดค่าใช้จ่าย')}
      >
        <div className="space-y-4">
          {/* Summary Card */}
          <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-700">
            <h3 className="text-sm font-medium text-primary-700 dark:text-primary-300 mb-3">
              {t('schedule.weekSummary', 'สรุปค่าใช้จ่ายสัปดาห์')} ({formatDate(weekDays[0])} - {formatDate(weekDays[6])})
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-neutral-500">{t('schedule.totalShifts', 'จำนวนกะ')}</p>
                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {weeklyCost.totalShifts}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">{t('schedule.totalHours', 'ชั่วโมงรวม')}</p>
                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatHours(weeklyCost.totalHours)}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">{t('schedule.regularHours', 'ชั่วโมงปกติ')}</p>
                <p className="text-base font-medium text-neutral-700 dark:text-neutral-300">
                  {formatHours(weeklyCost.regularHours)}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">{t('schedule.overtimeHours', 'ชั่วโมง OT (1.25x)')}</p>
                <p className="text-base font-medium text-warning-600 dark:text-warning-400">
                  {formatHours(weeklyCost.overtimeHours)}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-primary-200 dark:border-primary-700">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('schedule.totalCost', 'ค่าใช้จ่ายรวม')}
                </span>
                <span className="text-xl font-bold text-primary-700 dark:text-primary-300">
                  {formatCurrency(weeklyCost.totalCost)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-neutral-500">
                  {t('schedule.avgPerShift', 'เฉลี่ยต่อกะ')}
                </span>
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  {formatCurrency(weeklyCost.averageCostPerShift)}
                </span>
              </div>
            </div>
          </div>

          {/* Employee Breakdown Table */}
          <div>
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t('schedule.employeeBreakdown', 'รายละเอียดตามพนักงาน')}
            </h3>
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800">
                  <tr>
                    <th className="text-left p-2 font-medium text-neutral-700 dark:text-neutral-300">
                      {t('schedule.employee', 'พนักงาน')}
                    </th>
                    <th className="text-right p-2 font-medium text-neutral-700 dark:text-neutral-300">
                      {t('schedule.shifts', 'กะ')}
                    </th>
                    <th className="text-right p-2 font-medium text-neutral-700 dark:text-neutral-300">
                      {t('schedule.hours', 'ชม.')}
                    </th>
                    <th className="text-right p-2 font-medium text-neutral-700 dark:text-neutral-300">
                      {t('schedule.cost', 'ค่าใช้จ่าย')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {weeklyCost.employeeBreakdown.map((emp) => (
                    <tr key={emp.employeeId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <td className="p-2 text-neutral-900 dark:text-neutral-100">
                        {emp.employeeName}
                      </td>
                      <td className="p-2 text-right text-neutral-700 dark:text-neutral-300">
                        {emp.shifts}
                      </td>
                      <td className="p-2 text-right text-neutral-700 dark:text-neutral-300">
                        {formatHours(emp.hours)}
                        {emp.overtimeHours > 0 && (
                          <span className="text-xs text-warning-600 dark:text-warning-400 ml-1">
                            (+{formatHours(emp.overtimeHours)} OT)
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-right font-medium text-neutral-900 dark:text-neutral-100">
                        {formatCurrency(emp.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Note about 2026 rules */}
          <div className="text-xs text-neutral-500 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p>
              💡 {t('schedule.costNote', 'ค่าใช้จ่ายคำนวณตามกฎหมาย 2026: ชั่วโมงปกติ (≤8 ชม.) = อัตรา 1.0x, OT (>8 ชม.) = อัตรา 1.25x')}
            </p>
            <p className="mt-1">
              {t('schedule.defaultRate', 'อัตราค่าจ้างเริ่มต้น: ฿250/ชั่วโมง')}
            </p>
          </div>

          <div className="flex justify-end pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <Button variant="ghost" onClick={() => setShowCostModal(false)}>
              {t('common.close', 'ปิด')}
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

      {/* Bulk Action Bar */}
      {selectedShiftIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-4 flex items-center gap-4">
            {/* Selection info */}
            <div className="flex items-center gap-2">
              <CheckSquare size={20} className="text-primary-600 dark:text-primary-400" />
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {selectedShiftIds.size} {t('schedule.shiftsSelected', 'กะที่เลือก')}
              </span>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-600" />

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllVisibleShifts}
              >
                {t('schedule.selectAll', 'เลือกทั้งหมด')}
              </Button>

              <Button
                variant="primary"
                size="sm"
                leftIcon={<Send size={16} />}
                onClick={handleBulkPublish}
              >
                {t('schedule.publish', 'ประกาศ')}
              </Button>

              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 size={16} />}
                onClick={handleBulkDelete}
              >
                {t('common.delete', 'ลบ')}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                leftIcon={<X size={16} />}
                onClick={clearSelection}
              >
                {t('common.cancel', 'ยกเลิก')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}

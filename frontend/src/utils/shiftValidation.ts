import type { ShiftWithDetails } from '../types/shift.types';
import type { Employee } from '../types/employee.types';

export interface ShiftWarning {
  type: 'rest_period' | 'weekly_hours' | 'approved_leave' | 'employee_status';
  severity: 'error' | 'warning';
  message: string;
  messageTh: string;
  details?: {
    currentHours?: number;
    maxHours?: number;
    restHours?: number;
    minRestHours?: number;
  };
}

interface ValidationContext {
  shift: ShiftWithDetails | {
    employeeId: string;
    date: string;
    startTime: string;
    endTime: string;
    id?: string;
  };
  allShifts: ShiftWithDetails[];
  employees?: Employee[]; // Full Employee type with all fields
  leaveRequests?: any[]; // Leave requests data
}

/**
 * Calculate shift duration in hours
 */
function calculateShiftDuration(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;

  // Handle overnight shifts
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return (endMinutes - startMinutes) / 60;
}

/**
 * Get the Monday of the week for a given date
 */
function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Get all shifts in the same week
 */
function getWeekShifts(
  employeeId: string,
  date: string,
  allShifts: ShiftWithDetails[],
  excludeShiftId?: string
): ShiftWithDetails[] {
  const weekStart = getWeekStart(date);
  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEnd = weekEndDate.toISOString().split('T')[0];

  return allShifts.filter(s =>
    s.employeeId === employeeId &&
    s.date >= weekStart &&
    s.date <= weekEnd &&
    s.status !== 'cancelled' &&
    s.id !== excludeShiftId
  );
}

/**
 * Check weekly hours constraint (48-hour limit)
 */
export function checkWeeklyHours(context: ValidationContext): ShiftWarning | null {
  const { shift, allShifts } = context;

  const weekShifts = getWeekShifts(shift.employeeId, shift.date, allShifts, shift.id);

  // Calculate total hours for existing shifts
  let totalHours = 0;
  weekShifts.forEach(s => {
    totalHours += calculateShiftDuration(s.startTime, s.endTime);
  });

  // Add current shift hours
  const currentShiftHours = calculateShiftDuration(shift.startTime, shift.endTime);
  const newTotal = totalHours + currentShiftHours;

  if (newTotal > 48) {
    return {
      type: 'weekly_hours',
      severity: 'error',
      message: `Weekly hours limit exceeded (${newTotal.toFixed(1)} / 48 hrs)`,
      messageTh: `เกินจำนวนชั่วโมงต่อสัปดาห์ (${newTotal.toFixed(1)} / 48 ชม.)`,
      details: {
        currentHours: newTotal,
        maxHours: 48,
      },
    };
  }

  // Warning when approaching limit (> 44 hours = 90%+)
  if (newTotal > 44) {
    return {
      type: 'weekly_hours',
      severity: 'warning',
      message: `Approaching weekly hours limit (${newTotal.toFixed(1)} / 48 hrs)`,
      messageTh: `ใกล้ถึงขีดจำกัดชั่วโมงต่อสัปดาห์ (${newTotal.toFixed(1)} / 48 ชม.)`,
      details: {
        currentHours: newTotal,
        maxHours: 48,
      },
    };
  }

  return null;
}

/**
 * Check rest period constraint (12-hour minimum between shifts)
 */
export function checkRestPeriod(context: ValidationContext): ShiftWarning | null {
  const { shift, allShifts } = context;

  // Get shifts within 24 hours before and after
  const shiftDate = new Date(shift.date);
  const dayBefore = new Date(shiftDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const dayAfter = new Date(shiftDate);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const adjacentShifts = allShifts.filter(s =>
    s.employeeId === shift.employeeId &&
    s.status !== 'cancelled' &&
    s.id !== shift.id &&
    (s.date === shift.date ||
     s.date === dayBefore.toISOString().split('T')[0] ||
     s.date === dayAfter.toISOString().split('T')[0])
  );

  // Calculate current shift start/end DateTime
  const currentStart = new Date(`${shift.date}T${shift.startTime}`);
  let currentEnd = new Date(`${shift.date}T${shift.endTime}`);
  if (shift.endTime < shift.startTime) {
    currentEnd.setDate(currentEnd.getDate() + 1);
  }

  for (const adjacent of adjacentShifts) {
    const adjStart = new Date(`${adjacent.date}T${adjacent.startTime}`);
    let adjEnd = new Date(`${adjacent.date}T${adjacent.endTime}`);
    if (adjacent.endTime < adjacent.startTime) {
      adjEnd.setDate(adjEnd.getDate() + 1);
    }

    // Check gap: existing shift ends -> current shift starts
    if (adjEnd <= currentStart) {
      const gapMs = currentStart.getTime() - adjEnd.getTime();
      const gapHours = gapMs / (1000 * 60 * 60);

      if (gapHours < 12) {
        return {
          type: 'rest_period',
          severity: 'error',
          message: `Insufficient rest period (${gapHours.toFixed(1)} hrs) after previous shift`,
          messageTh: `ระยะพักไม่เพียงพอ (${gapHours.toFixed(1)} ชม.) หลังกะก่อนหน้า (ต้องพักอย่างน้อย 12 ชม.)`,
          details: {
            restHours: gapHours,
            minRestHours: 12,
          },
        };
      }
    }

    // Check gap: current shift ends -> existing shift starts
    if (currentEnd <= adjStart) {
      const gapMs = adjStart.getTime() - currentEnd.getTime();
      const gapHours = gapMs / (1000 * 60 * 60);

      if (gapHours < 12) {
        return {
          type: 'rest_period',
          severity: 'error',
          message: `Insufficient rest period (${gapHours.toFixed(1)} hrs) before next shift`,
          messageTh: `ระยะพักไม่เพียงพอ (${gapHours.toFixed(1)} ชม.) ก่อนกะถัดไป (ต้องพักอย่างน้อย 12 ชม.)`,
          details: {
            restHours: gapHours,
            minRestHours: 12,
          },
        };
      }
    }
  }

  return null;
}

/**
 * Check employee status (terminated, on_leave)
 */
export function checkEmployeeStatus(context: ValidationContext): ShiftWarning | null {
  const { shift, employees } = context;

  if (!employees) return null;

  const employee = employees.find(e => e.id === shift.employeeId);
  if (!employee) return null;

  if (employee.status === 'terminated') {
    return {
      type: 'employee_status',
      severity: 'error',
      message: 'Employee is terminated',
      messageTh: 'พนักงานถูกเลิกจ้างแล้ว',
    };
  }

  // Note: 'on_leave' status is a general employment status, different from approved leave requests
  // We check approved leave requests separately in checkApprovedLeave()

  return null;
}

/**
 * Check for approved leave on the shift date
 */
export function checkApprovedLeave(context: ValidationContext): ShiftWarning | null {
  const { shift, leaveRequests } = context;

  if (!leaveRequests) return null;

  const conflictingLeave = leaveRequests.find(leave =>
    leave.employeeId === shift.employeeId &&
    leave.status === 'approved' &&
    leave.startDate <= shift.date &&
    leave.endDate >= shift.date
  );

  if (conflictingLeave) {
    const leaveTypeName = conflictingLeave.leaveType?.nameTh || conflictingLeave.leaveType?.name || 'ลา';
    return {
      type: 'approved_leave',
      severity: 'error',
      message: `Employee has approved leave on this date: ${leaveTypeName}`,
      messageTh: `พนักงานมีการลาที่อนุมัติแล้วในวันนี้: ${leaveTypeName}`,
    };
  }

  return null;
}

/**
 * Validate a shift and return all warnings/errors
 */
export function validateShift(context: ValidationContext): ShiftWarning[] {
  const warnings: ShiftWarning[] = [];

  // Check employee status first
  const statusWarning = checkEmployeeStatus(context);
  if (statusWarning) warnings.push(statusWarning);

  // Check approved leave
  const leaveWarning = checkApprovedLeave(context);
  if (leaveWarning) warnings.push(leaveWarning);

  // Check rest period
  const restWarning = checkRestPeriod(context);
  if (restWarning) warnings.push(restWarning);

  // Check weekly hours
  const hoursWarning = checkWeeklyHours(context);
  if (hoursWarning) warnings.push(hoursWarning);

  return warnings;
}

/**
 * Check if warnings contain any errors (severity: 'error')
 */
export function hasErrors(warnings: ShiftWarning[]): boolean {
  return warnings.some(w => w.severity === 'error');
}

/**
 * Get the most severe warning for display
 */
export function getMostSevereWarning(warnings: ShiftWarning[]): ShiftWarning | null {
  if (warnings.length === 0) return null;

  // Errors first
  const error = warnings.find(w => w.severity === 'error');
  if (error) return error;

  // Then warnings
  return warnings[0];
}

/**
 * Check if a shift is in the past (for retroactive edit warnings)
 * A shift is considered "past" if its endTime has already occurred
 */
export function isPastShift(date: string, endTime: string): boolean {
  const now = new Date();
  const shiftEnd = new Date(`${date}T${endTime}`);
  return shiftEnd < now;
}

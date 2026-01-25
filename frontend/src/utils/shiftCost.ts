import type { ShiftWithDetails } from '../types/shift.types';

/**
 * Cost Calculation Utilities for Thai Security Guard Shifts
 * Implements 2026 labor law changes with 1.25x OT multiplier
 */

export interface ShiftCostBreakdown {
  regularHours: number;
  overtimeHours: number;
  regularCost: number;
  overtimeCost: number;
  totalCost: number;
  totalHours: number;
}

export interface WeeklyCostSummary {
  totalShifts: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  totalCost: number;
  averageCostPerShift: number;
  employeeBreakdown: Array<{
    employeeId: string;
    employeeName: string;
    shifts: number;
    hours: number;
    regularHours: number;
    overtimeHours: number;
    cost: number;
  }>;
}

/**
 * Calculate shift duration in hours
 * Handles overnight shifts that cross midnight
 */
export function calculateShiftHours(
  startTime: string,
  endTime: string,
  breakMinutes: number = 0
): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

  // Handle overnight shifts
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }

  // Subtract break time
  totalMinutes -= breakMinutes;

  return totalMinutes / 60;
}

/**
 * Calculate cost for a single shift using 2026 Thai labor law rules
 * - Regular hours (≤8): 1.0x hourly rate
 * - Overtime hours (>8): 1.25x hourly rate
 */
export function calculateShiftCost(
  shift: ShiftWithDetails,
  hourlyRate: number = 250
): ShiftCostBreakdown {
  const totalHours = calculateShiftHours(shift.startTime, shift.endTime, 0);

  let regularHours = 0;
  let overtimeHours = 0;

  if (totalHours <= 8) {
    regularHours = totalHours;
    overtimeHours = 0;
  } else {
    regularHours = 8;
    overtimeHours = totalHours - 8;
  }

  const regularCost = regularHours * hourlyRate;
  const overtimeCost = overtimeHours * hourlyRate * 1.25;
  const totalCost = regularCost + overtimeCost;

  return {
    regularHours,
    overtimeHours,
    regularCost,
    overtimeCost,
    totalCost,
    totalHours,
  };
}

/**
 * Calculate weekly cost summary for all shifts
 */
export function calculateWeeklyCost(
  shifts: ShiftWithDetails[],
  defaultHourlyRate: number = 250
): WeeklyCostSummary {
  const employeeMap = new Map<
    string,
    {
      employeeId: string;
      employeeName: string;
      shifts: number;
      totalHours: number;
      regularHours: number;
      overtimeHours: number;
      totalCost: number;
    }
  >();

  let totalShifts = 0;
  let totalHours = 0;
  let totalRegularHours = 0;
  let totalOvertimeHours = 0;
  let totalCost = 0;

  for (const shift of shifts) {
    // Skip cancelled shifts
    if (shift.status === 'cancelled') continue;

    const breakdown = calculateShiftCost(shift, defaultHourlyRate);

    totalShifts++;
    totalHours += breakdown.totalHours;
    totalRegularHours += breakdown.regularHours;
    totalOvertimeHours += breakdown.overtimeHours;
    totalCost += breakdown.totalCost;

    // Update employee breakdown
    const employeeId = shift.employeeId;
    const employeeName = shift.employee?.fullName || 'Unknown';

    const existing = employeeMap.get(employeeId);
    if (existing) {
      existing.shifts++;
      existing.totalHours += breakdown.totalHours;
      existing.regularHours += breakdown.regularHours;
      existing.overtimeHours += breakdown.overtimeHours;
      existing.totalCost += breakdown.totalCost;
    } else {
      employeeMap.set(employeeId, {
        employeeId,
        employeeName,
        shifts: 1,
        totalHours: breakdown.totalHours,
        regularHours: breakdown.regularHours,
        overtimeHours: breakdown.overtimeHours,
        totalCost: breakdown.totalCost,
      });
    }
  }

  const employeeBreakdown = Array.from(employeeMap.values()).map((emp) => ({
    employeeId: emp.employeeId,
    employeeName: emp.employeeName,
    shifts: emp.shifts,
    hours: emp.totalHours,
    regularHours: emp.regularHours,
    overtimeHours: emp.overtimeHours,
    cost: emp.totalCost,
  }));

  // Sort by cost descending
  employeeBreakdown.sort((a, b) => b.cost - a.cost);

  return {
    totalShifts,
    totalHours,
    regularHours: totalRegularHours,
    overtimeHours: totalOvertimeHours,
    totalCost,
    averageCostPerShift: totalShifts > 0 ? totalCost / totalShifts : 0,
    employeeBreakdown,
  };
}

/**
 * Format cost in Thai Baht with thousand separators
 */
export function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Format hours with one decimal place
 */
export function formatHours(hours: number): string {
  return hours.toFixed(1);
}

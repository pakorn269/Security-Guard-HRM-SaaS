import {
  Copy,
  Clock,
  MapPin,
  AlertTriangle,
  AlertCircle,
  Square,
  CheckSquare,
  GripHorizontal,
} from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { ShiftWithDetails } from '../../types/shift.types';
import type { ShiftWarning } from '../../utils/shiftValidation';
import { getMostSevereWarning } from '../../utils/shiftValidation';
import { calculateShiftCost, calculateShiftHours, formatHours } from '../../utils/shiftCost';
import { Badge } from '../common';
import Tooltip from '../ui/Tooltip';

// Shift status configuration
export const SHIFT_STATUS_CONFIG = {
  draft: { label: 'ร่าง', variant: 'warning' as const },
  published: { label: 'ประกาศแล้ว', variant: 'success' as const },
};

export interface ShiftCardProps {
  /** The shift data to display */
  shift: ShiftWithDetails;
  /** Callback when the shift card is clicked (for editing) */
  onClick: (shift: ShiftWithDetails) => void;
  /** Callback when the duplicate button is clicked */
  onDuplicate: (shift: ShiftWithDetails) => void;
  /** Status configuration for the badge */
  statusConfig: (typeof SHIFT_STATUS_CONFIG)[keyof typeof SHIFT_STATUS_CONFIG];
  /** Validation warnings for this shift */
  warnings?: ShiftWarning[];
  /** Whether this shift is currently selected */
  isSelected?: boolean;
  /** Callback when the selection checkbox is toggled */
  onToggleSelect?: (shiftId: string) => void;
  /** Default hourly rate for cost calculation */
  hourlyRate?: number;
}

/**
 * ShiftCard - Displays an individual shift card within the calendar grid
 *
 * Features:
 * - Drag and drop support via @dnd-kit
 * - Time range and duration display (including OT logic)
 * - Location/site name display
 * - Status colors (Draft vs Published)
 * - Conflict indicators (Red/Yellow icons for rest period/weekly limit)
 * - Selection checkbox (visible on hover or when selected)
 * - Copy button (visible on hover)
 */
export default function ShiftCard({
  shift,
  onClick,
  onDuplicate,
  statusConfig,
  warnings = [],
  isSelected = false,
  onToggleSelect,
  hourlyRate = 250,
}: ShiftCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shift.id,
    data: shift,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 'auto',
      }
    : undefined;

  const mostSevereWarning = getMostSevereWarning(warnings);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        p-2 rounded-md text-xs cursor-grab active:cursor-grabbing transition-all
        hover:shadow-sm hover:scale-[1.01] relative group
        ${
          isSelected
            ? 'ring-2 ring-primary-500 ring-offset-1 dark:ring-offset-neutral-900'
            : ''
        }
        ${
          shift.status === 'published'
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
            <Square
              size={16}
              className="text-neutral-400 dark:text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          )}
        </div>
      )}

      {/* Warning indicator */}
      {mostSevereWarning && (
        <div className="absolute top-1 left-1 z-10">
          <Tooltip
            content={
              <div className="max-w-xs whitespace-normal">{mostSevereWarning.messageTh}</div>
            }
            placement="top"
          >
            <div
              className={`
              flex items-center justify-center w-5 h-5 rounded-full
              ${
                mostSevereWarning.severity === 'error'
                  ? 'bg-error-100 dark:bg-error-900/30 text-error-600 dark:text-error-400'
                  : 'bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400'
              }
            `}
            >
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

      <div
        style={{
          borderLeftWidth: '3px',
          borderLeftColor: shift.template?.color || '#3B82F6',
          height: '100%',
          paddingLeft: '6px',
          marginLeft: '-6px',
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
            const breakdown = calculateShiftCost(shift, hourlyRate);
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
}

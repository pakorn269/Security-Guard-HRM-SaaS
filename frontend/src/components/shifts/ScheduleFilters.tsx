import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid } from 'lucide-react';
import { Button, Badge, Card } from '../common';
import { Tabs, TabList, Tab } from '../navigation';
import { formatCurrency } from '../../utils/shiftCost';

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
    overtimeHours: number;
    cost: number;
  }>;
}

export interface ScheduleFiltersProps {
  /** Current date for the week display */
  currentDate: Date;
  /** Days in the current week */
  weekDays: Date[];
  /** Callback to navigate to previous week */
  onPreviousWeek: () => void;
  /** Callback to navigate to next week */
  onNextWeek: () => void;
  /** Callback to navigate to today */
  onToday: () => void;
  /** Callback when date is changed via date picker */
  onDateChange: (date: Date) => void;
  /** Number of draft shifts */
  draftCount: number;
  /** Number of published shifts */
  publishedCount: number;
  /** Weekly cost summary data */
  weeklyCost: WeeklyCostSummary;
  /** Callback when cost summary is clicked */
  onCostClick: () => void;
  /** Current view mode */
  view: 'week' | 'month';
  /** Callback when view mode changes */
  onViewChange: (view: 'week' | 'month') => void;
}

/**
 * Format date to YYYY-MM-DD string
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * ScheduleFilters - Navigation and filtering controls for the schedule page
 *
 * Features:
 * - Week navigation (previous/next week, today button)
 * - Date picker for quick date jump
 * - Draft/Published shift counts
 * - Weekly cost summary button
 * - Week/Month view toggle (desktop only)
 */
export default function ScheduleFilters({
  currentDate,
  weekDays,
  onPreviousWeek,
  onNextWeek,
  onToday,
  onDateChange,
  draftCount,
  publishedCount,
  weeklyCost,
  onCostClick,
  view,
  onViewChange,
}: ScheduleFiltersProps) {
  const { t } = useTranslation();

  return (
    <Card variant="bordered" padding="md" className="mobile-p-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <Button variant="ghost" size="sm" onClick={onPreviousWeek} className="touch-target">
            <ChevronLeft size={18} />
          </Button>

          {/* Date Picker for Quick Jump */}
          <input
            type="date"
            value={formatDate(currentDate)}
            onChange={(e) => onDateChange(new Date(e.target.value))}
            className="px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 cursor-pointer hover:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            title={t('schedule.jumpToDate', 'เลือกวันที่')}
          />

          <Button variant="outline" size="sm" onClick={onToday} className="touch-target">
            {t('schedule.today', 'วันนี้')}
          </Button>
          <Button variant="ghost" size="sm" onClick={onNextWeek} className="touch-target">
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
              onClick={onCostClick}
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
            onChange={(id) => onViewChange(id as 'week' | 'month')}
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
  );
}

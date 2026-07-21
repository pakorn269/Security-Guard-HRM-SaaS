import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Calendar,
    X,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Loader2,
    Download,
    Filter,
    Grid3x3,
    List,
    Eye,
} from 'lucide-react';
import leaveService, { type LeaveCalendarEntry } from '../../services/leave.service';

interface LeaveCalendarProps {
    onClose?: () => void;
}

type ViewMode = 'month' | 'week' | 'day';

// Leave type color mapping (consistent colors for leave types)
const LEAVE_TYPE_COLORS: Record<string, string> = {
    annual: 'bg-blue-100 text-blue-700 border-blue-300',
    sick: 'bg-red-100 text-red-700 border-red-300',
    personal: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    emergency: 'bg-orange-100 text-orange-700 border-orange-300',
    maternity: 'bg-pink-100 text-pink-700 border-pink-300',
    paternity: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    default: 'bg-gray-100 text-gray-700 border-gray-300',
};

export default function LeaveCalendar({ onClose }: LeaveCalendarProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [calendarData, setCalendarData] = useState<LeaveCalendarEntry[]>([]);
    const [exporting, setExporting] = useState(false);

    // View mode state
    const [viewMode, setViewMode] = useState<ViewMode>('month');

    // Current view date
    const [currentDate, setCurrentDate] = useState(new Date());

    // Selected day for details
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    // Hovered date for tooltip
    const [hoveredDate, setHoveredDate] = useState<string | null>(null);

    // Filter state
    const [showFilters, setShowFilters] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');


    // Calculate view range based on mode
    const { startDate, endDate } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const date = currentDate.getDate();

        let start: Date;
        let end: Date;

        switch (viewMode) {
            case 'month':
                start = new Date(year, month, 1);
                end = new Date(year, month + 1, 0);
                break;

            case 'week':
                // Get current week (Sunday to Saturday)
                const dayOfWeek = currentDate.getDay();
                start = new Date(currentDate);
                start.setDate(date - dayOfWeek);
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                break;

            case 'day':
                start = new Date(year, month, date);
                end = new Date(year, month, date);
                break;

            default:
                start = new Date(year, month, 1);
                end = new Date(year, month + 1, 0);
        }

        return {
            startDate: start.toISOString().slice(0, 10),
            endDate: end.toISOString().slice(0, 10),
        };
    }, [currentDate, viewMode]);

    // Load calendar data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await leaveService.getLeaveCalendar(startDate, endDate);
            setCalendarData(data);
        } catch (err) {
            console.error('Error loading leave calendar:', err);
            setError('ไม่สามารถโหลดปฏิทินการลาได้');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Navigation functions
    const navigate = (direction: 'prev' | 'next' | 'today') => {
        setSelectedDay(null);

        if (direction === 'today') {
            setCurrentDate(new Date());
            return;
        }

        const newDate = new Date(currentDate);
        const delta = direction === 'prev' ? -1 : 1;

        switch (viewMode) {
            case 'month':
                newDate.setMonth(newDate.getMonth() + delta);
                break;
            case 'week':
                newDate.setDate(newDate.getDate() + delta * 7);
                break;
            case 'day':
                newDate.setDate(newDate.getDate() + delta);
                break;
        }

        setCurrentDate(newDate);
    };

    // Export calendar
    const handleExport = async () => {
        try {
            setExporting(true);
            await leaveService.exportICalendar({
                startDate,
                endDate,
                teamId: selectedTeamId || undefined,
            });
        } catch (err) {
            console.error('Error exporting calendar:', err);
            setError('ไม่สามารถส่งออกปฏิทินได้');
        } finally {
            setExporting(false);
        }
    };

    // Build calendar grid (month view)
    const calendarGrid = useMemo(() => {
        if (viewMode !== 'month') return [];

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Start from Sunday of the week containing the first day
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // End at Saturday of the week containing the last day
        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

        const weeks: { date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean }[][] =
            [];
        const current = new Date(startDate);
        const today = new Date().toISOString().slice(0, 10);

        while (current <= endDate) {
            const week = [];
            for (let i = 0; i < 7; i++) {
                const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
                week.push({
                    date: new Date(current),
                    dateStr,
                    isCurrentMonth: current.getMonth() === month,
                    isToday: dateStr === today,
                });
                current.setDate(current.getDate() + 1);
            }
            weeks.push(week);
        }

        return weeks;
    }, [currentDate, viewMode]);

    // Build week view data
    const weekViewDays = useMemo(() => {
        if (viewMode !== 'week') return [];

        const days = [];
        const start = new Date(startDate);
        const today = new Date().toISOString().slice(0, 10);

        for (let i = 0; i < 7; i++) {
            const current = new Date(start);
            current.setDate(start.getDate() + i);
            const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;

            days.push({
                date: current,
                dateStr,
                isToday: dateStr === today,
            });
        }

        return days;
    }, [startDate, viewMode]);

    // Create a map of dateStr -> employees for quick lookup
    const leaveMap = useMemo(() => {
        const map: Record<string, LeaveCalendarEntry['employees']> = {};
        calendarData.forEach((entry) => {
            map[entry.date] = entry.employees;
        });
        return map;
    }, [calendarData]);

    // Get leave data for selected day
    const selectedDayData = selectedDay ? leaveMap[selectedDay] || [] : [];

    // Format view title
    const viewTitle = useMemo(() => {
        switch (viewMode) {
            case 'month':
                return currentDate.toLocaleDateString('th-TH', {
                    month: 'long',
                    year: 'numeric',
                });
            case 'week': {
                const endOfWeek = new Date(currentDate);
                endOfWeek.setDate(currentDate.getDate() + 6);
                return `${currentDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`;
            }
            case 'day':
                return currentDate.toLocaleDateString('th-TH', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                });
            default:
                return '';
        }
    }, [currentDate, viewMode]);

    const weekDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    // Get color for leave type
    const getLeaveTypeColor = (leaveTypeName: string) => {
        const key = leaveTypeName.toLowerCase().replace(/\s+/g, '');

        // Try to match common leave type names
        if (key.includes('annual') || key.includes('ลาพักผ่อน') || key.includes('พักร้อน')) {
            return LEAVE_TYPE_COLORS.annual;
        }
        if (key.includes('sick') || key.includes('ลาป่วย')) {
            return LEAVE_TYPE_COLORS.sick;
        }
        if (key.includes('personal') || key.includes('ลากิจ')) {
            return LEAVE_TYPE_COLORS.personal;
        }
        if (key.includes('emergency') || key.includes('ฉุกเฉิน')) {
            return LEAVE_TYPE_COLORS.emergency;
        }
        if (key.includes('maternity') || key.includes('คลอด')) {
            return LEAVE_TYPE_COLORS.maternity;
        }
        if (key.includes('paternity') || key.includes('บิดา')) {
            return LEAVE_TYPE_COLORS.paternity;
        }

        return LEAVE_TYPE_COLORS.default;
    };



    // Render month view
    const renderMonthView = () => (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Week day headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {weekDays.map((day, i) => (
                    <div
                        key={day}
                        className={`py-4 text-center text-xs font-bold uppercase tracking-wider ${i === 0 || i === 6 ? 'text-rose-500/80' : 'text-slate-500'
                            }`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 bg-slate-200 gap-px">
                {calendarGrid.map((week, weekIndex) =>
                    week.map((day, dayIndex) => {
                        const employeesOnLeave = leaveMap[day.dateStr] || [];
                        const hasLeave = employeesOnLeave.length > 0;
                        const isSelected = selectedDay === day.dateStr;
                        const isWeekend = dayIndex === 0 || dayIndex === 6;

                        return (
                            <div
                                key={`${weekIndex}-${dayIndex}`}
                                onClick={() => setSelectedDay(isSelected ? null : day.dateStr)}
                                onMouseEnter={() => setHoveredDate(day.dateStr)}
                                onMouseLeave={() => setHoveredDate(null)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        setSelectedDay(isSelected ? null : day.dateStr);
                                    }
                                }}
                                className={`
                                    relative min-h-[120px] p-2 transition-all cursor-pointer bg-white group hover:bg-slate-50/80
                                    ${!day.isCurrentMonth ? 'bg-slate-50/50 text-slate-400 opacity-50' : ''}
                                    ${isWeekend && day.isCurrentMonth ? 'bg-slate-50/30' : ''}
                                    ${isSelected ? 'ring-2 ring-inset ring-blue-500 z-10 bg-blue-50/10' : ''}
                                    ${day.isToday ? 'today' : ''}
                                `}
                            >
                                {hasLeave && (
                                    <span className="hidden leave-indicator" data-leave-count={employeesOnLeave.length}>
                                        {employeesOnLeave.length}
                                    </span>
                                )}

                                {hoveredDate === day.dateStr && hasLeave && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-30 w-48 pointer-events-none">
                                        <div className="font-bold border-b border-slate-700 pb-1 mb-1">
                                            {employeesOnLeave.length} คนลา
                                        </div>
                                        <div className="space-y-1">
                                            {employeesOnLeave.map(emp => (
                                                <div key={emp.id} className="truncate">
                                                    {emp.fullName} ({emp.leaveType.nameTh || emp.leaveType.name})
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Date Number */}
                                <div className={`flex justify-between items-start mb-1 ${day.isToday ? 'today' : ''}`}>
                                    <span
                                        className={`
                                            flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold transition-all
                                            ${day.isToday
                                                ? 'bg-blue-600 text-white shadow-md scale-105'
                                                : day.isCurrentMonth
                                                    ? 'text-slate-700 group-hover:bg-white group-hover:shadow-sm'
                                                    : 'text-slate-400'
                                            }
                                        `}
                                    >
                                        {day.date.getDate()}
                                    </span>
                                </div>

                                {/* Events Stack */}
                                <div className="space-y-1">
                                    {/* Mobile/Small screens: Dots */}
                                    <div className="flex flex-wrap gap-1 lg:hidden">
                                        {hasLeave &&
                                            employeesOnLeave.slice(0, 4).map((emp, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-2 h-2 rounded-full ${getLeaveTypeColor(emp.leaveType.name)
                                                        .split(' ')[0] || 'bg-blue-500'
                                                        }`}
                                                />
                                            ))}
                                        {employeesOnLeave.length > 4 && (
                                            <div className="w-2 h-2 rounded-full bg-slate-300" />
                                        )}
                                    </div>

                                    {/* Large screens: Chips */}
                                    <div className="hidden lg:block space-y-1">
                                        {employeesOnLeave.slice(0, 3).map((employee, i) => (
                                            <div
                                                key={i}
                                                className={`
                                                    text-[10px] px-2 py-1 rounded-md truncate font-medium shadow-sm border border-transparent
                                                    ${getLeaveTypeColor(employee.leaveType.name)}
                                                    hover:opacity-80 transition-opacity
                                                `}
                                                title={`${employee.fullName} (${employee.leaveType.nameTh || employee.leaveType.name})`}
                                            >
                                                {employee.fullName}
                                            </div>
                                        ))}
                                        {employeesOnLeave.length > 3 && (
                                            <div className="text-[10px] px-1.5 py-0.5 text-slate-500 font-semibold pl-1">
                                                +{employeesOnLeave.length - 3} รายการ
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );

    // Render week view
    const renderWeekView = () => (
        <div className="space-y-3">
            {weekViewDays.map((day) => {
                const employeesOnLeave = leaveMap[day.dateStr] || [];
                const hasLeave = employeesOnLeave.length > 0;

                return (
                    <div
                        key={day.dateStr}
                        className={`border rounded-xl p-5 transition-all ${day.isToday
                            ? 'border-blue-200 bg-blue-50/30'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`
                                    w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold
                                    ${day.isToday ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}
                                `}
                                >
                                    {day.date.getDate()}
                                </div>
                                <div>
                                    <h4
                                        className={`font-semibold ${day.isToday ? 'text-blue-900' : 'text-slate-800'}`}
                                    >
                                        {day.date.toLocaleDateString('th-TH', {
                                            weekday: 'long',
                                        })}
                                    </h4>
                                    <p
                                        className={`text-xs ${day.isToday ? 'text-blue-600' : 'text-slate-500'}`}
                                    >
                                        {day.date.toLocaleDateString('th-TH', {
                                            month: 'long',
                                            year: 'numeric',
                                        })}
                                    </p>
                                </div>
                            </div>
                            {hasLeave && (
                                <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                                    ลา {employeesOnLeave.length} คน
                                </span>
                            )}
                        </div>

                        {hasLeave ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {employeesOnLeave.map((employee) => (
                                    <div
                                        key={employee.id}
                                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 shadow-sm"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold border border-slate-200">
                                                {employee.fullName.charAt(0)}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-medium text-slate-800 truncate">
                                                    {employee.fullName}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {employee.employeeCode}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className={`px-2 py-1 rounded-md text-[10px] font-semibold border ${getLeaveTypeColor(employee.leaveType.name)}`}
                                        >
                                            {employee.leaveType.nameTh || employee.leaveType.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 border-2 border-dashed border-slate-100 rounded-lg">
                                <p className="text-sm text-slate-400">ไม่มีพนักงานลาในวันนี้</p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    // Render day view
    const renderDayView = () => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        const employeesOnLeave = leaveMap[dateStr] || [];

        return (
            <div className="space-y-4 max-w-3xl mx-auto">
                <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 mb-1">
                            {currentDate.toLocaleDateString('th-TH', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            })}
                        </h3>
                        <p className="text-slate-500">
                            สรุปข้อมูลการลาประจำวัน (มีพนักงานลา)
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-3xl font-bold text-blue-600">{employeesOnLeave.length}</span>
                        <span className="text-slate-500 ml-2">คนลา</span>
                    </div>
                </div>

                {employeesOnLeave.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {employeesOnLeave.map((employee) => (
                            <div
                                key={employee.id}
                                className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-lg font-bold border border-slate-200">
                                        {employee.fullName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800 text-lg">
                                            {employee.fullName}
                                        </p>
                                        <p className="text-sm text-slate-500 font-medium">
                                            {employee.employeeCode}
                                        </p>
                                    </div>
                                </div>
                                <span
                                    className={`px-3 py-1.5 rounded-md text-sm font-semibold border ${getLeaveTypeColor(employee.leaveType.name)}`}
                                >
                                    {employee.leaveType.nameTh || employee.leaveType.name}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                            <Calendar size={32} />
                        </div>
                        <p className="text-slate-500 font-medium text-lg">ไม่มีพนักงานลาในวันนี้</p>
                        <p className="text-slate-400 text-sm">ทุกคนมาทำงานปกติ</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden font-sans">
            {/* Premium Header Toolbar */}
            <div className="px-6 py-5 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 bg-white">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">ปฏิทินการลา</h2>
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                            <span className="capitalize">{viewTitle}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                    {/* View Mode Switcher */}
                    <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
                        <button
                            onClick={() => setViewMode('month')}
                            className={`p-2 rounded-md transition-all flex items-center gap-2 text-xs font-semibold ${viewMode === 'month'
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                            title="มุมมองเดือน"
                        >
                            <Grid3x3 size={16} />
                            <span className="hidden sm:inline">เดือน</span>
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            className={`p-2 rounded-md transition-all flex items-center gap-2 text-xs font-semibold ${viewMode === 'week'
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                            title="มุมมองสัปดาห์"
                        >
                            <List size={16} />
                            <span className="hidden sm:inline">สัปดาห์</span>
                        </button>
                        <button
                            onClick={() => setViewMode('day')}
                            className={`p-2 rounded-md transition-all flex items-center gap-2 text-xs font-semibold ${viewMode === 'day'
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                            title="มุมมองวัน"
                        >
                            <Eye size={16} />
                            <span className="hidden sm:inline">วัน</span>
                        </button>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden mr-2">
                        <button
                            onClick={() => navigate('prev')}
                            className="p-2 hover:bg-white text-slate-600 transition-colors border-r border-slate-200"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => navigate('today')}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white transition-colors"
                        >
                            วันนี้
                        </button>
                        <button
                            onClick={() => navigate('next')}
                            className="p-2 hover:bg-white text-slate-600 transition-colors border-l border-slate-200"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>

                    {/* Actions */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 rounded-lg border transition-all text-sm font-medium flex items-center gap-2 ${showFilters
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        title="ตัวกรอง"
                    >
                        <Filter size={16} />
                        <span className="hidden">ตัวกรอง</span>
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                        title="ส่งออก iCal"
                    >
                        {exporting ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Download size={16} />
                        )}
                        <span className="hidden">ส่งออก iCal</span>
                    </button>

                    {onClose && (
                        <button
                            onClick={onClose}
                            className="ml-2 p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-700">
                                ทีม/แผนก:
                            </label>
                            <select
                                value={selectedTeamId}
                                onChange={(e) => setSelectedTeamId(e.target.value)}
                                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                            >
                                <option value="">ทั้งหมด</option>
                                {/* TODO: Load teams from API */}
                                <option value="team1">ทีม 1</option>
                                <option value="team2">ทีม 2</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}


            {error && (
                <div className="m-4 bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl flex items-center gap-2">
                    <AlertTriangle size={18} />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                    <Loader2 size={40} className="text-blue-500 animate-spin mb-3" />
                    <p className="text-sm font-medium">กำลังโหลดข้อมูลปฏิทิน...</p>
                </div>
            ) : (
                <div className="p-4">
                    {/* Render view */}
                    {viewMode === 'month' && renderMonthView()}
                    {viewMode === 'week' && renderWeekView()}
                    {viewMode === 'day' && renderDayView()}

                    {/* Selected day details (month view only) */}
                    {viewMode === 'month' && selectedDay && (
                        <div data-details-panel className="mt-6 border-t border-slate-200 pt-6 animate-in slide-in-from-top-2 duration-300 relative">
                            <button
                                onClick={() => setSelectedDay(null)}
                                className="absolute right-0 top-6 p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="ปิด"
                            >
                                <X size={18} />
                            </button>
                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                                <span className="hidden">รายละเอียดการลา</span>
                                {new Date(selectedDay).toLocaleDateString('th-TH', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </h4>

                            {selectedDayData.length === 0 ? (
                                <p className="text-slate-500 text-sm pl-3.5">ไม่มีการลาในวันนี้</p>
                            ) : (
                                <div className="space-y-3 pl-3.5">
                                    {selectedDayData.map((employee) => (
                                        <div
                                            key={employee.id}
                                            className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-600 font-bold border border-slate-200 shadow-sm">
                                                    {employee.fullName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">
                                                        {employee.fullName}
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        {employee.employeeCode}
                                                    </p>
                                                </div>
                                            </div>
                                            <span
                                                className={`px-3 py-1 rounded-md text-sm font-medium border ${getLeaveTypeColor(employee.leaveType.name)}`}
                                            >
                                                {employee.leaveType.nameTh || employee.leaveType.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Legend - Modern Badges */}
                    <div className="mt-8 pt-4 border-t border-slate-100">
                        <div className="flex flex-wrap items-center justify-end gap-3 text-xs">
                            <span className="text-slate-500 font-medium mr-2">ประเภทการลา:</span>
                            {Object.entries(LEAVE_TYPE_COLORS)
                                .filter(([key]) => key !== 'default')
                                .map(([key, className]) => (
                                    <div
                                        key={key}
                                        className={`px-2 py-1 rounded-md font-medium ${className}`}
                                    >
                                        {key === 'annual' && 'ลาพักผ่อน'}
                                        {key === 'sick' && 'ลาป่วย'}
                                        {key === 'personal' && 'ลากิจ'}
                                        {key === 'emergency' && 'ลาฉุกเฉิน'}
                                        {key === 'maternity' && 'ลาคลอด'}
                                        {key === 'paternity' && 'ลาบิดา'}
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
}

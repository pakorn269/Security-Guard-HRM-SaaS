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

    // Filter state
    const [showFilters, setShowFilters] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');

    // Tooltip state
    const [tooltip, setTooltip] = useState<{
        show: boolean;
        x: number;
        y: number;
        employees: LeaveCalendarEntry['employees'];
    }>({
        show: false,
        x: 0,
        y: 0,
        employees: [],
    });

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

    // Handle tooltip
    const handleMouseEnter = (e: React.MouseEvent, employees: LeaveCalendarEntry['employees']) => {
        if (employees.length === 0) return;

        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({
            show: true,
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
            employees,
        });
    };

    const handleMouseLeave = () => {
        setTooltip({ show: false, x: 0, y: 0, employees: [] });
    };

    // Render month view
    const renderMonthView = () => (
        <div className="grid grid-cols-7 gap-1">
            {/* Week day headers */}
            {weekDays.map((day, i) => (
                <div
                    key={day}
                    className={`text-center text-sm font-medium py-2 ${i === 0 ? 'text-error-500' : i === 6 ? 'text-primary-500' : 'text-surface-600'
                        }`}
                >
                    {day}
                </div>
            ))}

            {/* Calendar days */}
            {calendarGrid.map((week, weekIndex) =>
                week.map((day, dayIndex) => {
                    const employeesOnLeave = leaveMap[day.dateStr] || [];
                    const hasLeave = employeesOnLeave.length > 0;
                    const isSelected = selectedDay === day.dateStr;

                    return (
                        <button
                            key={`${weekIndex}-${dayIndex}`}
                            onClick={() => setSelectedDay(isSelected ? null : day.dateStr)}
                            onMouseEnter={(e) => handleMouseEnter(e, employeesOnLeave)}
                            onMouseLeave={handleMouseLeave}
                            className={`
                                relative aspect-square p-1 rounded-lg transition-all
                                ${!day.isCurrentMonth ? 'opacity-30' : ''}
                                ${day.isToday ? 'ring-2 ring-primary-500' : ''}
                                ${isSelected ? 'bg-primary-100 ring-2 ring-primary-400' : 'hover:bg-surface-100'}
                                ${dayIndex === 0 ? 'text-error-500' : dayIndex === 6 ? 'text-primary-500' : 'text-surface-800'}
                            `}
                        >
                            <span
                                className={`text-sm font-medium ${day.isToday ? 'text-primary-600' : ''}`}
                            >
                                {day.date.getDate()}
                            </span>

                            {/* Leave indicators */}
                            {hasLeave && (
                                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                                    {employeesOnLeave.length <= 3 ? (
                                        employeesOnLeave.map((_, i) => (
                                            <div
                                                key={i}
                                                className="w-1.5 h-1.5 rounded-full bg-primary-500"
                                            />
                                        ))
                                    ) : (
                                        <>
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                                            <span className="text-[8px] text-primary-600">
                                                +{employeesOnLeave.length - 2}
                                            </span>
                                        </>
                                    )}
                                </div>
                            )}
                        </button>
                    );
                })
            )}
        </div>
    );

    // Render week view
    const renderWeekView = () => (
        <div className="space-y-2">
            {weekViewDays.map((day) => {
                const employeesOnLeave = leaveMap[day.dateStr] || [];
                const hasLeave = employeesOnLeave.length > 0;

                return (
                    <div
                        key={day.dateStr}
                        className={`border rounded-lg p-4 ${day.isToday ? 'border-primary-500 bg-primary-50' : 'border-surface-200'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h4 className="font-semibold text-surface-800">
                                    {day.date.toLocaleDateString('th-TH', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long',
                                    })}
                                </h4>
                                {day.isToday && (
                                    <span className="text-xs text-primary-600 font-medium">วันนี้</span>
                                )}
                            </div>
                            <span className="text-sm text-surface-500">
                                {employeesOnLeave.length} คน
                            </span>
                        </div>

                        {hasLeave ? (
                            <div className="space-y-2">
                                {employeesOnLeave.map((employee) => (
                                    <div
                                        key={employee.id}
                                        className="flex items-center justify-between p-2 bg-white rounded-lg border border-surface-200"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-semibold">
                                                {employee.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-surface-800">
                                                    {employee.fullName}
                                                </p>
                                                <p className="text-xs text-surface-500">
                                                    {employee.employeeCode}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium border ${getLeaveTypeColor(employee.leaveType.name)}`}
                                        >
                                            {employee.leaveType.nameTh || employee.leaveType.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-surface-500">ไม่มีพนักงานลาในวันนี้</p>
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
            <div className="space-y-4">
                <div className="bg-surface-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-surface-800 mb-1">
                        {currentDate.toLocaleDateString('th-TH', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                        })}
                    </h3>
                    <p className="text-sm text-surface-600">
                        มีพนักงานลา {employeesOnLeave.length} คน
                    </p>
                </div>

                {employeesOnLeave.length > 0 ? (
                    <div className="space-y-3">
                        {employeesOnLeave.map((employee) => (
                            <div
                                key={employee.id}
                                className="flex items-center justify-between p-4 bg-white rounded-lg border border-surface-200 shadow-sm"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                                        {employee.fullName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-surface-800">
                                            {employee.fullName}
                                        </p>
                                        <p className="text-sm text-surface-500">
                                            {employee.employeeCode}
                                        </p>
                                    </div>
                                </div>
                                <span
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getLeaveTypeColor(employee.leaveType.name)}`}
                                >
                                    {employee.leaveType.nameTh || employee.leaveType.name}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-surface-500">ไม่มีพนักงานลาในวันนี้</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-primary p-4 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar size={24} />
                        <h2 className="text-xl font-bold">ปฏิทินการลา</h2>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="ml-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* View mode toggles */}
                        <div className="flex bg-white/20 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('month')}
                                className={`px-2 py-1 rounded transition-colors ${viewMode === 'month'
                                    ? 'bg-white text-primary-600'
                                    : 'hover:bg-white/20'
                                    }`}
                                title="มุมมองเดือน"
                            >
                                <Grid3x3 size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('week')}
                                className={`px-2 py-1 rounded transition-colors ${viewMode === 'week'
                                    ? 'bg-white text-primary-600'
                                    : 'hover:bg-white/20'
                                    }`}
                                title="มุมมองสัปดาห์"
                            >
                                <List size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('day')}
                                className={`px-2 py-1 rounded transition-colors ${viewMode === 'day'
                                    ? 'bg-white text-primary-600'
                                    : 'hover:bg-white/20'
                                    }`}
                                title="มุมมองวัน"
                            >
                                <Eye size={16} />
                            </button>
                        </div>

                        {/* Export button */}
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {exporting ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Download size={16} />
                            )}
                            ส่งออก iCal
                        </button>

                        {/* Filter button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors flex items-center gap-2"
                        >
                            <Filter size={16} />
                            ตัวกรอง
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="px-4 py-3 border-b border-surface-200 bg-surface-50">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-surface-700">
                            ทีม/แผนก:
                        </label>
                        <select
                            value={selectedTeamId}
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                            className="px-3 py-1.5 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">ทั้งหมด</option>
                            {/* TODO: Load teams from API */}
                            <option value="team1">ทีม 1</option>
                            <option value="team2">ทีม 2</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
                <button
                    onClick={() => navigate('prev')}
                    className="w-10 h-10 rounded-full hover:bg-surface-100 flex items-center justify-center transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-surface-800">{viewTitle}</h3>
                    <button
                        onClick={() => navigate('today')}
                        className="px-3 py-1 bg-surface-100 hover:bg-surface-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        วันนี้
                    </button>
                </div>
                <button
                    onClick={() => navigate('next')}
                    className="w-10 h-10 rounded-full hover:bg-surface-100 flex items-center justify-center transition-colors"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {error && (
                <div className="m-4 bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl flex items-center gap-2">
                    <AlertTriangle size={18} />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={32} className="text-primary-500 animate-spin" />
                </div>
            ) : (
                <div className="p-4">
                    {/* Render view */}
                    {viewMode === 'month' && renderMonthView()}
                    {viewMode === 'week' && renderWeekView()}
                    {viewMode === 'day' && renderDayView()}

                    {/* Selected day details (month view only) */}
                    {viewMode === 'month' && selectedDay && (
                        <div className="mt-4 border-t border-surface-200 pt-4">
                            <h4 className="font-semibold text-surface-800 mb-3">
                                {new Date(selectedDay).toLocaleDateString('th-TH', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </h4>

                            {selectedDayData.length === 0 ? (
                                <p className="text-surface-500 text-sm">ไม่มีพนักงานลาในวันนี้</p>
                            ) : (
                                <div className="space-y-2">
                                    {selectedDayData.map((employee) => (
                                        <div
                                            key={employee.id}
                                            className="flex items-center justify-between p-3 bg-surface-50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                                                    {employee.fullName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-surface-800">
                                                        {employee.fullName}
                                                    </p>
                                                    <p className="text-sm text-surface-500">
                                                        {employee.employeeCode}
                                                    </p>
                                                </div>
                                            </div>
                                            <span
                                                className={`px-3 py-1 rounded-full text-sm font-medium border ${getLeaveTypeColor(employee.leaveType.name)}`}
                                            >
                                                {employee.leaveType.nameTh || employee.leaveType.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Legend */}
                    <div className="mt-4 pt-4 border-t border-surface-200">
                        <h5 className="text-sm font-semibold text-surface-700 mb-2">ประเภทการลา</h5>
                        <div className="flex flex-wrap gap-3 text-sm">
                            {Object.entries(LEAVE_TYPE_COLORS)
                                .filter(([key]) => key !== 'default')
                                .map(([key, className]) => (
                                    <div key={key} className="flex items-center gap-2">
                                        <div
                                            className={`w-4 h-4 rounded border ${className}`}
                                        ></div>
                                        <span className="text-surface-600 capitalize">
                                            {key === 'annual' && 'ลาพักผ่อน'}
                                            {key === 'sick' && 'ลาป่วย'}
                                            {key === 'personal' && 'ลากิจ'}
                                            {key === 'emergency' && 'ลาฉุกเฉิน'}
                                            {key === 'maternity' && 'ลาคลอด'}
                                            {key === 'paternity' && 'ลาบิดา'}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tooltip */}
            {tooltip.show && (
                <div
                    className="fixed z-50 bg-surface-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm max-w-xs pointer-events-none"
                    style={{
                        left: `${tooltip.x}px`,
                        top: `${tooltip.y}px`,
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    <div className="font-semibold mb-1">
                        {tooltip.employees.length} คนลา
                    </div>
                    <div className="space-y-0.5">
                        {tooltip.employees.slice(0, 3).map((emp) => (
                            <div key={emp.id} className="text-xs">
                                • {emp.fullName} ({emp.leaveType.nameTh || emp.leaveType.name})
                            </div>
                        ))}
                        {tooltip.employees.length > 3 && (
                            <div className="text-xs text-surface-300">
                                และอีก {tooltip.employees.length - 3} คน...
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

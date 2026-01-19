import { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, X, ChevronLeft, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react';
import leaveService, { type LeaveCalendarEntry } from '../../services/leave.service';

interface LeaveCalendarProps {
    onClose?: () => void;
}

export default function LeaveCalendar({ onClose }: LeaveCalendarProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [calendarData, setCalendarData] = useState<LeaveCalendarEntry[]>([]);

    // Current view month
    const [currentDate, setCurrentDate] = useState(new Date());

    // Selected day for details
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    // Calculate month start and end
    const monthStart = useMemo(() => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        return date.toISOString().slice(0, 10);
    }, [currentDate]);

    const monthEnd = useMemo(() => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        return date.toISOString().slice(0, 10);
    }, [currentDate]);

    // Load calendar data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await leaveService.getLeaveCalendar(monthStart, monthEnd);
            setCalendarData(data);
        } catch (err) {
            console.error('Error loading leave calendar:', err);
            setError('ไม่สามารถโหลดปฏิทินการลาได้');
        } finally {
            setLoading(false);
        }
    }, [monthStart, monthEnd]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Navigate months
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        setSelectedDay(null);
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        setSelectedDay(null);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setSelectedDay(null);
    };

    // Build calendar grid
    const calendarGrid = useMemo(() => {
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

        const weeks: { date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean }[][] = [];
        const current = new Date(startDate);
        const today = new Date().toISOString().slice(0, 10);

        while (current <= endDate) {
            const week = [];
            for (let i = 0; i < 7; i++) {
                const dateStr = current.toISOString().slice(0, 10);
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
    }, [currentDate]);

    // Create a map of dateStr -> employees for quick lookup
    const leaveMap = useMemo(() => {
        const map: Record<string, LeaveCalendarEntry['employees']> = {};
        calendarData.forEach(entry => {
            map[entry.date] = entry.employees;
        });
        return map;
    }, [calendarData]);

    // Get leave data for selected day
    const selectedDayData = selectedDay ? leaveMap[selectedDay] || [] : [];

    // Format month name
    const monthName = currentDate.toLocaleDateString('th-TH', {
        month: 'long',
        year: 'numeric',
    });

    const weekDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    // Get color for leave type (simple hash based on id)
    const getLeaveTypeColor = (typeId: string) => {
        const colors = [
            'bg-primary-100 text-primary-700',
            'bg-accent-100 text-accent-700',
            'bg-success-100 text-success-700',
            'bg-warning-100 text-warning-700',
            'bg-error-100 text-error-700',
        ];
        let hash = 0;
        for (let i = 0; i < typeId.length; i++) {
            hash = ((hash << 5) - hash) + typeId.charCodeAt(i);
            hash = hash & hash;
        }
        return colors[Math.abs(hash) % colors.length];
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
                    <button
                        onClick={goToToday}
                        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
                    >
                        วันนี้
                    </button>
                </div>
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
                <button
                    onClick={goToPreviousMonth}
                    className="w-10 h-10 rounded-full hover:bg-surface-100 flex items-center justify-center transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
                <h3 className="text-lg font-semibold text-surface-800">{monthName}</h3>
                <button
                    onClick={goToNextMonth}
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
                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1 mb-4">
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
                                        className={`
                                            relative aspect-square p-1 rounded-lg transition-all
                                            ${!day.isCurrentMonth ? 'opacity-30' : ''}
                                            ${day.isToday ? 'ring-2 ring-primary-500' : ''}
                                            ${isSelected ? 'bg-primary-100 ring-2 ring-primary-400' : 'hover:bg-surface-100'}
                                            ${dayIndex === 0 ? 'text-error-500' : dayIndex === 6 ? 'text-primary-500' : 'text-surface-800'}
                                        `}
                                    >
                                        <span className={`text-sm font-medium ${day.isToday ? 'text-primary-600' : ''}`}>
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
                                                        <span className="text-[8px] text-primary-600">+{employeesOnLeave.length - 2}</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Selected day details */}
                    {selectedDay && (
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
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLeaveTypeColor(employee.leaveType.id)}`}>
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
                        <div className="flex flex-wrap items-center gap-4 text-sm text-surface-600">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                                <span>มีพนักงานลา</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg ring-2 ring-primary-500 flex items-center justify-center text-xs text-primary-600 font-medium">
                                    {new Date().getDate()}
                                </div>
                                <span>วันนี้</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

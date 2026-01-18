import { useState, useEffect } from 'react';
import leaveService, { type LeaveCalendarEntry } from '../../services/leave.service';

export default function WhosOffTodayWidget() {
    const [employees, setEmployees] = useState<LeaveCalendarEntry['employees']>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Get today's date in YYYY-MM-DD format based on local time
                // We use local time because leaves are usually date-based on local context
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                const data = await leaveService.getLeaveCalendar(dateStr, dateStr);

                // The API returns entries for dates that have leaves. 
                // If today has leaves, we'll find an entry for it.
                const todayEntry = data.find(d => d.date === dateStr);

                if (todayEntry) {
                    setEmployees(todayEntry.employees);
                } else {
                    setEmployees([]);
                }
            } catch (err) {
                console.error('Failed to load leave data', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    if (loading) {
        return (
            <div className="bg-white dark:bg-surface-800 rounded-xl p-6 shadow-sm h-full flex items-center justify-center min-h-[200px]">
                <div className="spinner w-8 h-8"></div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-surface-800 rounded-xl p-6 shadow-sm h-full">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-surface-800 dark:text-white">
                    🌴 พนักงานลาวันนี้
                </h2>
                <span className="text-sm text-surface-500 font-medium">
                    {employees.length} คน
                </span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {employees.length === 0 ? (
                    <div className="text-center py-8 text-surface-500">
                        วันนี้ทำงานครบทุกคน
                    </div>
                ) : (
                    employees.map((emp) => (
                        <div
                            key={emp.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-surface-50 dark:bg-surface-700"
                        >
                            <div className="w-10 h-10 rounded-full bg-info-100 text-info-700 flex items-center justify-center font-semibold text-sm shrink-0">
                                {emp.fullName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-surface-800 dark:text-white truncate">
                                    {emp.fullName}
                                </p>
                                <p className="text-xs text-surface-500 truncate">
                                    {emp.leaveType.nameTh || emp.leaveType.name}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

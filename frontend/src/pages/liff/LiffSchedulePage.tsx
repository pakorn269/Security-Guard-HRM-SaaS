import { useState, useEffect } from 'react';
import {
    Calendar,
    Clock,
    MapPin,
    AlertCircle,
    Link2Off,
    Inbox,
    RefreshCw,
    CheckCircle2,
    Loader2,
} from 'lucide-react';
import { getMyShifts } from '../../services/shift.service';
import type { ShiftWithDetails, MyShiftsResponse } from '../../types/shift.types';

// Helper functions
const formatThaiShortDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
};

const isToday = (dateStr: string): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
};

const isTomorrow = (dateStr: string): boolean => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return dateStr === tomorrow.toISOString().split('T')[0];
};

export default function LiffSchedulePage() {
    const [data, setData] = useState<MyShiftsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadShifts = async () => {
            try {
                setLoading(true);
                const response = await getMyShifts(14); // Load 14 days
                setData(response);
            } catch (err) {
                console.error('Error loading shifts:', err);
                setError('ไม่สามารถโหลดตารางเวรได้');
            } finally {
                setLoading(false);
            }
        };

        loadShifts();
    }, []);

    // Loading state
    if (loading) {
        return (
            <div className="p-4 space-y-4 animate-fade-in">
                <div className="text-center py-4">
                    <div className="flex items-center justify-center gap-2">
                        <Calendar size={24} className="text-primary-500" />
                        <h1 className="text-xl font-bold text-neutral-800 dark:text-white">ตารางเวรของฉัน</h1>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 size={32} className="text-primary-500 animate-spin mb-4" />
                    <p className="text-neutral-500 dark:text-neutral-400">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="p-4 space-y-4 animate-fade-in">
                <div className="text-center py-4">
                    <div className="flex items-center justify-center gap-2">
                        <Calendar size={24} className="text-primary-500" />
                        <h1 className="text-xl font-bold text-neutral-800 dark:text-white">ตารางเวรของฉัน</h1>
                    </div>
                </div>
                <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center">
                        <AlertCircle size={32} className="text-error-500" />
                    </div>
                    <p className="text-error-600 dark:text-error-400">{error}</p>
                    <button
                        className="mt-4 px-6 py-2 inline-flex items-center gap-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
                        onClick={() => window.location.reload()}
                    >
                        <RefreshCw size={16} />
                        ลองใหม่
                    </button>
                </div>
            </div>
        );
    }

    // Check if user is not linked to employee
    if (!data) {
        return (
            <div className="p-4 space-y-4 animate-fade-in">
                <div className="text-center py-4">
                    <div className="flex items-center justify-center gap-2">
                        <Calendar size={24} className="text-primary-500" />
                        <h1 className="text-xl font-bold text-neutral-800 dark:text-white">ตารางเวรของฉัน</h1>
                    </div>
                </div>
                <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
                        <Link2Off size={32} className="text-warning-500" />
                    </div>
                    <p className="text-neutral-600 dark:text-neutral-300">บัญชีของคุณยังไม่ได้เชื่อมโยงกับพนักงาน</p>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-2">กรุณาติดต่อผู้ดูแลระบบ</p>
                </div>
            </div>
        );
    }

    const hasAnyShifts = data.today || data.upcoming.length > 0;

    // Shift card component
    const ShiftCard = ({ shift, highlight = false }: { shift: ShiftWithDetails; highlight?: boolean }) => (
        <div
            className={`bg-white dark:bg-neutral-900 rounded-lg p-4 shadow-sm border border-neutral-200 dark:border-neutral-800 border-l-4 ${highlight ? 'ring-2 ring-primary-200 dark:ring-primary-800' : ''}`}
            style={{ borderLeftColor: shift.template?.color || '#3B82F6' }}
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-semibold text-neutral-800 dark:text-white flex items-center gap-2 flex-wrap">
                        {formatThaiShortDate(shift.date)}
                        {isToday(shift.date) && (
                            <span className="px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-md font-medium">
                                วันนี้
                            </span>
                        )}
                        {isTomorrow(shift.date) && (
                            <span className="px-2 py-0.5 text-xs bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 rounded-md font-medium">
                                พรุ่งนี้
                            </span>
                        )}
                    </p>
                    <p className="text-primary-600 dark:text-primary-400 font-medium mt-1.5 flex items-center gap-1.5">
                        <Clock size={14} />
                        {shift.startTime} - {shift.endTime}
                    </p>
                    {shift.location && (
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1.5 flex items-center gap-1.5">
                            <MapPin size={14} />
                            {shift.location}
                        </p>
                    )}
                    {shift.template && (
                        <p className="text-neutral-400 dark:text-neutral-500 text-xs mt-1.5">
                            {shift.template.nameTh || shift.template.name}
                        </p>
                    )}
                </div>
                <span className="px-2 py-1 text-xs rounded-md bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 font-medium flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    ประกาศแล้ว
                </span>
            </div>
        </div>
    );

    return (
        <div className="p-4 space-y-4 animate-fade-in">
            {/* Header */}
            <div className="text-center py-4">
                <div className="flex items-center justify-center gap-2">
                    <Calendar size={24} className="text-primary-500" />
                    <h1 className="text-xl font-bold text-neutral-800 dark:text-white">ตารางเวรของฉัน</h1>
                </div>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
                    {hasAnyShifts ? '2 สัปดาห์ข้างหน้า' : 'ยังไม่มีตารางเวร'}
                </p>
            </div>

            {/* Today's shift (highlighted) */}
            {data.today && (
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-primary-600 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
                        กะวันนี้
                    </h2>
                    <ShiftCard shift={data.today} highlight />
                </div>
            )}

            {/* Upcoming shifts */}
            {data.upcoming.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">กะที่กำลังจะมา</h2>
                    {data.upcoming.map((shift) => (
                        <ShiftCard key={shift.id} shift={shift} />
                    ))}
                </div>
            )}

            {/* No shifts */}
            {!hasAnyShifts && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                        <Inbox size={32} className="text-neutral-400" />
                    </div>
                    <p className="text-neutral-500 dark:text-neutral-400">ยังไม่มีตารางเวรสำหรับช่วงเวลานี้</p>
                    <p className="text-neutral-400 dark:text-neutral-500 text-sm mt-2">
                        ตรวจสอบกับหัวหน้างานหากมีข้อสงสัย
                    </p>
                </div>
            )}

            {/* Past shifts (if any, show last few) */}
            {data.past.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-surface-200">
                    <h2 className="text-sm font-semibold text-surface-400">กะที่ผ่านมา</h2>
                    {data.past.slice(-3).reverse().map((shift) => (
                        <div
                            key={shift.id}
                            className="bg-surface-50 rounded-xl p-3 opacity-60"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-surface-600 text-sm">
                                        {formatThaiShortDate(shift.date)}
                                    </p>
                                    <p className="text-surface-500 text-xs">
                                        {shift.startTime} - {shift.endTime}
                                    </p>
                                </div>
                                <span className="px-2 py-0.5 text-xs rounded-full bg-surface-200 text-surface-500">
                                    ผ่านไปแล้ว
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Refresh hint */}
            <div className="text-center pt-4">
                <p className="text-surface-400 text-xs">
                    ดึงลงเพื่อรีเฟรช
                </p>
            </div>
        </div>
    );
}

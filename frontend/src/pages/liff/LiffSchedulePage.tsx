import { useState, useEffect } from 'react';
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
                    <h1 className="text-xl font-bold text-surface-800">📅 ตารางเวรของฉัน</h1>
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
                            <div className="h-4 bg-surface-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-surface-200 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="p-4 space-y-4 animate-fade-in">
                <div className="text-center py-4">
                    <h1 className="text-xl font-bold text-surface-800">📅 ตารางเวรของฉัน</h1>
                </div>
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">⚠️</div>
                    <p className="text-error-600">{error}</p>
                    <button
                        className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg"
                        onClick={() => window.location.reload()}
                    >
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
                    <h1 className="text-xl font-bold text-surface-800">📅 ตารางเวรของฉัน</h1>
                </div>
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔗</div>
                    <p className="text-surface-600">บัญชีของคุณยังไม่ได้เชื่อมโยงกับพนักงาน</p>
                    <p className="text-surface-500 text-sm mt-2">กรุณาติดต่อผู้ดูแลระบบ</p>
                </div>
            </div>
        );
    }

    const hasAnyShifts = data.today || data.upcoming.length > 0;

    // Shift card component
    const ShiftCard = ({ shift, highlight = false }: { shift: ShiftWithDetails; highlight?: boolean }) => (
        <div
            className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${highlight ? 'ring-2 ring-primary-200' : ''
                }`}
            style={{ borderLeftColor: shift.template?.color || '#3B82F6' }}
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-semibold text-surface-800">
                        {formatThaiShortDate(shift.date)}
                        {isToday(shift.date) && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
                                วันนี้
                            </span>
                        )}
                        {isTomorrow(shift.date) && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-warning-100 text-warning-700 rounded-full">
                                พรุ่งนี้
                            </span>
                        )}
                    </p>
                    <p className="text-primary-600 font-medium mt-1">
                        ⏰ {shift.startTime} - {shift.endTime}
                    </p>
                    {shift.location && (
                        <p className="text-surface-500 text-sm mt-1">📍 {shift.location}</p>
                    )}
                    {shift.template && (
                        <p className="text-surface-400 text-xs mt-1">
                            {shift.template.nameTh || shift.template.name}
                        </p>
                    )}
                </div>
                <span className="px-2 py-1 text-xs rounded-full bg-success-100 text-success-700">
                    ประกาศแล้ว
                </span>
            </div>
        </div>
    );

    return (
        <div className="p-4 space-y-4 animate-fade-in">
            {/* Header */}
            <div className="text-center py-4">
                <h1 className="text-xl font-bold text-surface-800">📅 ตารางเวรของฉัน</h1>
                <p className="text-surface-500 text-sm mt-1">
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
                    <h2 className="text-sm font-semibold text-surface-600">กะที่กำลังจะมา</h2>
                    {data.upcoming.map((shift) => (
                        <ShiftCard key={shift.id} shift={shift} />
                    ))}
                </div>
            )}

            {/* No shifts */}
            {!hasAnyShifts && (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-surface-500">ยังไม่มีตารางเวรสำหรับช่วงเวลานี้</p>
                    <p className="text-surface-400 text-sm mt-2">
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

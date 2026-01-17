export default function LiffSchedulePage() {
    // Placeholder shift data
    const shifts = [
        { date: '2025-01-18', day: 'เสาร์', time: '08:00 - 17:00', location: 'อาคาร A' },
        { date: '2025-01-19', day: 'อาทิตย์', time: '08:00 - 17:00', location: 'อาคาร A' },
        { date: '2025-01-20', day: 'จันทร์', time: '17:00 - 02:00', location: 'อาคาร B' },
    ];

    return (
        <div className="p-4 space-y-4 animate-fade-in">
            {/* Header */}
            <div className="text-center py-4">
                <h1 className="text-xl font-bold text-surface-800">📅 ตารางเวรของฉัน</h1>
                <p className="text-surface-500 text-sm mt-1">สัปดาห์นี้</p>
            </div>

            {/* Shift list */}
            <div className="space-y-3">
                {shifts.map((shift, index) => (
                    <div
                        key={index}
                        className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-primary-500"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold text-surface-800">
                                    {shift.day} - {shift.date}
                                </p>
                                <p className="text-primary-600 font-medium mt-1">⏰ {shift.time}</p>
                                <p className="text-surface-500 text-sm mt-1">📍 {shift.location}</p>
                            </div>
                            <span className="px-2 py-1 text-xs rounded-full bg-success-100 text-success-700">
                                ประกาศแล้ว
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty state if no shifts */}
            {shifts.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-surface-500">ยังไม่มีตารางเวรสำหรับสัปดาห์นี้</p>
                </div>
            )}
        </div>
    );
}

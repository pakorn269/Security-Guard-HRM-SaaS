import { useState } from 'react';

export default function LiffLeavePage() {
    const [showForm, setShowForm] = useState(false);

    // Placeholder leave balances
    const balances = [
        { type: 'ลาพักร้อน', used: 3, total: 10, color: 'primary' },
        { type: 'ลาป่วย', used: 1, total: 30, color: 'error' },
        { type: 'ลากิจ', used: 0, total: 5, color: 'accent' },
    ];

    // Placeholder leave history
    const history = [
        { type: 'ลาป่วย', dates: '10 ม.ค. 2025', days: 1, status: 'approved' },
        { type: 'ลาพักร้อน', dates: '1-3 ม.ค. 2025', days: 3, status: 'approved' },
    ];

    return (
        <div className="p-4 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="text-center py-2">
                <h1 className="text-xl font-bold text-surface-800">🏖️ การลา</h1>
            </div>

            {/* Leave balances */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <h2 className="font-semibold text-surface-800 mb-3">วันลาคงเหลือ</h2>
                <div className="space-y-3">
                    {balances.map((balance, index) => (
                        <div key={index}>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-surface-600">{balance.type}</span>
                                <span className="font-medium text-surface-800">
                                    {balance.total - balance.used}/{balance.total} วัน
                                </span>
                            </div>
                            <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full bg-${balance.color}-500 rounded-full transition-all`}
                                    style={{
                                        width: `${((balance.total - balance.used) / balance.total) * 100}%`,
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Request leave button */}
            <button
                onClick={() => setShowForm(true)}
                className="w-full btn-primary py-3 text-lg"
            >
                ➕ ขอลาใหม่
            </button>

            {/* Leave history */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <h2 className="font-semibold text-surface-800 mb-3">ประวัติการลา</h2>
                <div className="space-y-3">
                    {history.map((item, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 rounded-lg bg-surface-50"
                        >
                            <div>
                                <p className="font-medium text-surface-800">{item.type}</p>
                                <p className="text-sm text-surface-500">{item.dates}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-medium text-surface-800">{item.days} วัน</p>
                                <span
                                    className={`text-xs px-2 py-1 rounded-full ${item.status === 'approved'
                                            ? 'bg-success-100 text-success-700'
                                            : item.status === 'pending'
                                                ? 'bg-warning-100 text-warning-700'
                                                : 'bg-error-100 text-error-700'
                                        }`}
                                >
                                    {item.status === 'approved' ? 'อนุมัติ' : item.status === 'pending' ? 'รอ' : 'ปฏิเสธ'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Leave request form modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-end z-50 animate-fade-in">
                    <div className="w-full bg-white rounded-t-3xl p-6 animate-slide-up">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-surface-800">ขอลาใหม่</h2>
                            <button
                                onClick={() => setShowForm(false)}
                                className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>

                        <form className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-2">
                                    ประเภทการลา
                                </label>
                                <select className="input-base">
                                    <option>ลาพักร้อน</option>
                                    <option>ลาป่วย</option>
                                    <option>ลากิจ</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-surface-700 mb-2">
                                        วันที่เริ่ม
                                    </label>
                                    <input type="date" className="input-base" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-surface-700 mb-2">
                                        วันที่สิ้นสุด
                                    </label>
                                    <input type="date" className="input-base" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-2">
                                    เหตุผล
                                </label>
                                <textarea
                                    className="input-base"
                                    rows={3}
                                    placeholder="ระบุเหตุผลการลา..."
                                />
                            </div>

                            <button type="submit" className="w-full btn-primary py-3">
                                ส่งคำขอ
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

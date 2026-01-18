import { useTranslation } from 'react-i18next';
import PendingLeaveRequestsWidget from '../../components/dashboard/PendingLeaveRequestsWidget';
import WhosOffTodayWidget from '../../components/dashboard/WhosOffTodayWidget';

export default function DashboardPage() {
    const { t } = useTranslation();

    // Placeholder data
    const stats = [
        { label: 'พนักงานทั้งหมด', value: '48', icon: '👥', color: 'primary' },
        { label: 'ลงเวลาวันนี้', value: '42', icon: '✅', color: 'success' },
        { label: 'มาสาย', value: '3', icon: '⚠️', color: 'warning' },
        { label: 'ไม่มา', value: '3', icon: '❌', color: 'error' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold text-surface-800 dark:text-white">
                    {t('navigation.dashboard')}
                </h1>
                <p className="text-surface-500 mt-1">
                    ภาพรวมการทำงานของพนักงานรักษาความปลอดภัย
                </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className="bg-white dark:bg-surface-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-surface-500">{stat.label}</p>
                                <p className="text-3xl font-bold mt-1 text-surface-800 dark:text-white">
                                    {stat.value}
                                </p>
                            </div>
                            <div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}
                            >
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent activity section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Today's attendance */}
                <div className="bg-white dark:bg-surface-800 rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-surface-800 dark:text-white mb-4">
                        การลงเวลาวันนี้
                    </h2>
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 p-3 rounded-lg bg-surface-50 dark:bg-surface-700"
                            >
                                <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
                                    ก
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-surface-800 dark:text-white">
                                        กมล ใจดี
                                    </p>
                                    <p className="text-sm text-surface-500">เข้างาน 08:00 น.</p>
                                </div>
                                <span className="px-2 py-1 text-xs rounded-full bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400">
                                    ตรงเวลา
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pending leave requests */}
                {/* Pending leave requests */}
                <PendingLeaveRequestsWidget />

                {/* Who's Off Today */}
                <WhosOffTodayWidget />
            </div>

            {/* Placeholder notice */}
            <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-4">
                <p className="text-primary-700 dark:text-primary-300 text-sm">
                    💡 นี่คือหน้าตัวอย่างจาก Sprint 0 - ฟีเจอร์ทั้งหมดจะถูกพัฒนาใน Sprint
                    ถัดไป
                </p>
            </div>
        </div>
    );
}

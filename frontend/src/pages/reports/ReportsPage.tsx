import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { reportsService } from '../../services/reports.service';
import type {
    AttendanceSummaryReport,
    LeaveUsageReport,
    AttendanceTrendData,
} from '../../types/reports';

type ReportType = 'attendance' | 'leave';

export default function ReportsPage() {
    const { t, i18n } = useTranslation();
    const [reportType, setReportType] = useState<ReportType>('attendance');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Date range state
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [year, setYear] = useState(today.getFullYear());

    // Report data
    const [attendanceReport, setAttendanceReport] = useState<AttendanceSummaryReport | null>(null);
    const [leaveReport, setLeaveReport] = useState<LeaveUsageReport | null>(null);
    const [trendData, setTrendData] = useState<AttendanceTrendData[]>([]);

    const fetchAttendanceReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const [report, trend] = await Promise.all([
                reportsService.getAttendanceSummary({ startDate, endDate }),
                reportsService.getAttendanceTrend({ startDate, endDate }),
            ]);
            setAttendanceReport(report);
            setTrendData(trend.trend);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch attendance report');
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaveReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const report = await reportsService.getLeaveUsage({ year });
            setLeaveReport(report);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch leave report');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (reportType === 'attendance') {
            fetchAttendanceReport();
        } else {
            fetchLeaveReport();
        }
    }, [reportType]);

    const handleGenerateReport = () => {
        if (reportType === 'attendance') {
            fetchAttendanceReport();
        } else {
            fetchLeaveReport();
        }
    };

    const handleExportCSV = async () => {
        try {
            let blob: Blob;
            let filename: string;

            if (reportType === 'attendance') {
                blob = await reportsService.downloadAttendanceCSV({ startDate, endDate });
                filename = `attendance_report_${startDate}_${endDate}.csv`;
            } else {
                blob = await reportsService.downloadLeaveCSV({ year });
                filename = `leave_report_${year}.csv`;
            }

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            setError(err.message || 'Failed to export CSV');
        }
    };

    const getStatusColor = (rate: number) => {
        if (rate >= 90) return 'text-success-600 bg-success-100';
        if (rate >= 70) return 'text-warning-600 bg-warning-100';
        return 'text-error-600 bg-error-100';
    };

    const renderAttendanceTrendChart = () => {
        if (trendData.length === 0) return null;

        const maxValue = Math.max(...trendData.map(d => d.totalCount), 1);

        return (
            <div className="bg-white dark:bg-surface-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-surface-800 dark:text-white mb-4">
                    {i18n.language === 'th' ? 'แนวโน้มการลงเวลา' : 'Attendance Trend'}
                </h3>
                <div className="flex items-end gap-1 h-48 overflow-x-auto">
                    {trendData.slice(-30).map((day, idx) => (
                        <div key={day.date} className="flex flex-col items-center flex-shrink-0">
                            <div
                                className="w-6 flex flex-col-reverse rounded-t overflow-hidden"
                                style={{ height: `${(day.totalCount / maxValue) * 160}px` }}
                            >
                                {day.absentCount > 0 && (
                                    <div
                                        className="bg-error-400"
                                        style={{ height: `${(day.absentCount / day.totalCount) * 100}%` }}
                                    />
                                )}
                                {day.lateCount > 0 && (
                                    <div
                                        className="bg-warning-400"
                                        style={{ height: `${(day.lateCount / day.totalCount) * 100}%` }}
                                    />
                                )}
                                {day.onTimeCount > 0 && (
                                    <div
                                        className="bg-success-400"
                                        style={{ height: `${(day.onTimeCount / day.totalCount) * 100}%` }}
                                    />
                                )}
                            </div>
                            {idx % 5 === 0 && (
                                <span className="text-xs text-surface-500 mt-1 -rotate-45">
                                    {day.date.slice(5)}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex gap-4 mt-4 justify-center">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-success-400" />
                        <span className="text-sm text-surface-600">{i18n.language === 'th' ? 'ตรงเวลา' : 'On Time'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-warning-400" />
                        <span className="text-sm text-surface-600">{i18n.language === 'th' ? 'มาสาย' : 'Late'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-error-400" />
                        <span className="text-sm text-surface-600">{i18n.language === 'th' ? 'ไม่มา' : 'Absent'}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-800 dark:text-white">
                        {t('navigation.reports')}
                    </h1>
                    <p className="text-surface-500 mt-1">
                        {i18n.language === 'th' ? 'รายงานและสถิติการทำงาน' : 'Work reports and statistics'}
                    </p>
                </div>
            </div>

            {/* Report type selector */}
            <div className="flex gap-2">
                <button
                    onClick={() => setReportType('attendance')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${reportType === 'attendance'
                        ? 'bg-primary-600 text-white shadow-lg'
                        : 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
                        }`}
                >
                    {i18n.language === 'th' ? '📊 การลงเวลา' : '📊 Attendance'}
                </button>
                <button
                    onClick={() => setReportType('leave')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${reportType === 'leave'
                        ? 'bg-primary-600 text-white shadow-lg'
                        : 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
                        }`}
                >
                    {i18n.language === 'th' ? '🏖️ การลา' : '🏖️ Leave'}
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-surface-800 rounded-xl p-6 shadow-sm">
                <div className="flex flex-wrap gap-4 items-end">
                    {reportType === 'attendance' ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                                    {i18n.language === 'th' ? 'วันที่เริ่มต้น' : 'Start Date'}
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                                    {i18n.language === 'th' ? 'วันที่สิ้นสุด' : 'End Date'}
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-white"
                                />
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                                {i18n.language === 'th' ? 'ปี' : 'Year'}
                            </label>
                            <select
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-white"
                            >
                                {[2024, 2025, 2026, 2027].map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <button
                        onClick={handleGenerateReport}
                        disabled={loading}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                {i18n.language === 'th' ? 'กำลังโหลด...' : 'Loading...'}
                            </span>
                        ) : (
                            i18n.language === 'th' ? '📊 สร้างรายงาน' : '📊 Generate Report'
                        )}
                    </button>
                    <button
                        onClick={handleExportCSV}
                        disabled={loading}
                        className="px-4 py-2 bg-success-600 hover:bg-success-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        📥 {i18n.language === 'th' ? 'ส่งออก CSV' : 'Export CSV'}
                    </button>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 text-error-700 dark:text-error-400 rounded-xl p-4">
                    ⚠️ {error}
                </div>
            )}

            {/* Loading state */}
            {loading && (
                <div className="flex justify-center py-12">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Attendance Report */}
            {!loading && reportType === 'attendance' && attendanceReport && (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-surface-800 rounded-xl p-6 shadow-sm">
                            <p className="text-sm text-surface-500">{i18n.language === 'th' ? 'พนักงานทั้งหมด' : 'Total Employees'}</p>
                            <p className="text-3xl font-bold text-surface-800 dark:text-white mt-1">
                                {attendanceReport.summary.totalEmployees}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-surface-800 rounded-xl p-6 shadow-sm">
                            <p className="text-sm text-surface-500">{i18n.language === 'th' ? 'ลงเวลาตรงเวลา' : 'On Time'}</p>
                            <p className="text-3xl font-bold text-success-600 mt-1">
                                {attendanceReport.summary.totalOnTime}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-surface-800 rounded-xl p-6 shadow-sm">
                            <p className="text-sm text-surface-500">{i18n.language === 'th' ? 'มาสาย' : 'Late'}</p>
                            <p className="text-3xl font-bold text-warning-600 mt-1">
                                {attendanceReport.summary.totalLate}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-surface-800 rounded-xl p-6 shadow-sm">
                            <p className="text-sm text-surface-500">{i18n.language === 'th' ? 'อัตราการมาทำงาน' : 'Attendance Rate'}</p>
                            <p className="text-3xl font-bold text-primary-600 mt-1">
                                {attendanceReport.summary.averageAttendanceRate}%
                            </p>
                        </div>
                    </div>

                    {/* Trend chart */}
                    {renderAttendanceTrendChart()}

                    {/* Employee table */}
                    <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-surface-200 dark:border-surface-700">
                            <h3 className="text-lg font-semibold text-surface-800 dark:text-white">
                                {i18n.language === 'th' ? 'รายละเอียดพนักงาน' : 'Employee Details'}
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-surface-50 dark:bg-surface-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                                            {i18n.language === 'th' ? 'พนักงาน' : 'Employee'}
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-surface-500 uppercase tracking-wider">
                                            {i18n.language === 'th' ? 'กะงาน' : 'Shifts'}
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-surface-500 uppercase tracking-wider">
                                            {i18n.language === 'th' ? 'ตรงเวลา' : 'On Time'}
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-surface-500 uppercase tracking-wider">
                                            {i18n.language === 'th' ? 'มาสาย' : 'Late'}
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-surface-500 uppercase tracking-wider">
                                            {i18n.language === 'th' ? 'ไม่มา' : 'Absent'}
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-surface-500 uppercase tracking-wider">
                                            {i18n.language === 'th' ? 'ชั่วโมงทำงาน' : 'Hours'}
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-surface-500 uppercase tracking-wider">
                                            {i18n.language === 'th' ? 'อัตรา' : 'Rate'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                                    {attendanceReport.employees.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-surface-500">
                                                {i18n.language === 'th' ? 'ไม่พบข้อมูล' : 'No data available'}
                                            </td>
                                        </tr>
                                    ) : (
                                        attendanceReport.employees.map((emp) => (
                                            <tr key={emp.employeeId} className="hover:bg-surface-50 dark:hover:bg-surface-700/50">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-medium text-surface-800 dark:text-white">
                                                            {emp.employeeName}
                                                        </p>
                                                        <p className="text-sm text-surface-500">
                                                            {emp.employeeCode}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center text-surface-800 dark:text-white">
                                                    {emp.totalShifts}
                                                </td>
                                                <td className="px-6 py-4 text-center text-success-600">
                                                    {emp.onTimeCount}
                                                </td>
                                                <td className="px-6 py-4 text-center text-warning-600">
                                                    {emp.lateCount}
                                                </td>
                                                <td className="px-6 py-4 text-center text-error-600">
                                                    {emp.absentCount}
                                                </td>
                                                <td className="px-6 py-4 text-center text-surface-800 dark:text-white">
                                                    {emp.totalHoursWorked.toFixed(1)}h
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(emp.attendanceRate)}`}>
                                                        {emp.attendanceRate}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Leave Report */}
            {!loading && reportType === 'leave' && leaveReport && (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-surface-800 rounded-xl p-6 shadow-sm">
                            <p className="text-sm text-surface-500">{i18n.language === 'th' ? 'พนักงานทั้งหมด' : 'Total Employees'}</p>
                            <p className="text-3xl font-bold text-surface-800 dark:text-white mt-1">
                                {leaveReport.summary.totalEmployees}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-surface-800 rounded-xl p-6 shadow-sm">
                            <p className="text-sm text-surface-500">{i18n.language === 'th' ? 'วันลาที่ได้รับ' : 'Entitled Days'}</p>
                            <p className="text-3xl font-bold text-primary-600 mt-1">
                                {leaveReport.summary.totalEntitledDays}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-surface-800 rounded-xl p-6 shadow-sm">
                            <p className="text-sm text-surface-500">{i18n.language === 'th' ? 'วันลาที่ใช้' : 'Used Days'}</p>
                            <p className="text-3xl font-bold text-warning-600 mt-1">
                                {leaveReport.summary.totalUsedDays}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-surface-800 rounded-xl p-6 shadow-sm">
                            <p className="text-sm text-surface-500">{i18n.language === 'th' ? 'อัตราการใช้' : 'Usage Rate'}</p>
                            <p className="text-3xl font-bold text-success-600 mt-1">
                                {leaveReport.summary.averageUsageRate}%
                            </p>
                        </div>
                    </div>

                    {/* Leave type summary */}
                    <div className="bg-white dark:bg-surface-800 rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-surface-800 dark:text-white mb-4">
                            {i18n.language === 'th' ? 'สรุปตามประเภทการลา' : 'Summary by Leave Type'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {leaveReport.byLeaveType.map((lt) => (
                                <div
                                    key={lt.leaveTypeId}
                                    className="p-4 rounded-lg bg-surface-50 dark:bg-surface-700"
                                >
                                    <p className="font-medium text-surface-800 dark:text-white">
                                        {i18n.language === 'th' ? lt.leaveTypeNameTh : lt.leaveTypeName}
                                    </p>
                                    <div className="mt-2 space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-surface-500">{i18n.language === 'th' ? 'ได้รับ' : 'Entitled'}</span>
                                            <span className="font-medium text-surface-800 dark:text-white">{lt.totalEntitled} {i18n.language === 'th' ? 'วัน' : 'days'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-surface-500">{i18n.language === 'th' ? 'ใช้ไป' : 'Used'}</span>
                                            <span className="font-medium text-warning-600">{lt.totalUsed} {i18n.language === 'th' ? 'วัน' : 'days'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-surface-500">{i18n.language === 'th' ? 'รอดำเนินการ' : 'Pending'}</span>
                                            <span className="font-medium text-primary-600">{lt.totalPending} {i18n.language === 'th' ? 'วัน' : 'days'}</span>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-surface-500">{i18n.language === 'th' ? 'อัตราการใช้' : 'Usage'}</span>
                                            <span className="font-medium">{lt.usageRate}%</span>
                                        </div>
                                        <div className="h-2 bg-surface-200 dark:bg-surface-600 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary-500 rounded-full transition-all"
                                                style={{ width: `${lt.usageRate}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Employee leave table */}
                    <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-surface-200 dark:border-surface-700">
                            <h3 className="text-lg font-semibold text-surface-800 dark:text-white">
                                {i18n.language === 'th' ? 'รายละเอียดพนักงาน' : 'Employee Details'}
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-surface-50 dark:bg-surface-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                                            {i18n.language === 'th' ? 'พนักงาน' : 'Employee'}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                                            {i18n.language === 'th' ? 'ประเภทการลา' : 'Leave Type'}
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-surface-500 uppercase tracking-wider">
                                            {i18n.language === 'th' ? 'ได้รับ' : 'Entitled'}
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-surface-500 uppercase tracking-wider">
                                            {i18n.language === 'th' ? 'ใช้ไป' : 'Used'}
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-surface-500 uppercase tracking-wider">
                                            {i18n.language === 'th' ? 'คงเหลือ' : 'Remaining'}
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-surface-500 uppercase tracking-wider">
                                            {i18n.language === 'th' ? 'อัตราการใช้' : 'Usage'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                                    {leaveReport.employees.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-surface-500">
                                                {i18n.language === 'th' ? 'ไม่พบข้อมูล' : 'No data available'}
                                            </td>
                                        </tr>
                                    ) : (
                                        leaveReport.employees.map((emp) => (
                                            <tr key={`${emp.employeeId}-${emp.leaveTypeId}`} className="hover:bg-surface-50 dark:hover:bg-surface-700/50">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-medium text-surface-800 dark:text-white">
                                                            {emp.employeeName}
                                                        </p>
                                                        <p className="text-sm text-surface-500">
                                                            {emp.employeeCode}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-surface-800 dark:text-white">
                                                    {i18n.language === 'th' ? emp.leaveTypeNameTh : emp.leaveTypeName}
                                                </td>
                                                <td className="px-6 py-4 text-center text-surface-800 dark:text-white">
                                                    {emp.entitledDays}
                                                </td>
                                                <td className="px-6 py-4 text-center text-warning-600">
                                                    {emp.usedDays}
                                                </td>
                                                <td className="px-6 py-4 text-center text-success-600">
                                                    {emp.remainingDays}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(100 - emp.usageRate)}`}>
                                                        {emp.usageRate}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Empty state */}
            {!loading && !error && (
                (reportType === 'attendance' && !attendanceReport) ||
                (reportType === 'leave' && !leaveReport)
            ) && (
                    <div className="bg-white dark:bg-surface-800 rounded-xl p-12 shadow-sm text-center">
                        <div className="text-6xl mb-4">📊</div>
                        <h3 className="text-lg font-semibold text-surface-800 dark:text-white mb-2">
                            {i18n.language === 'th' ? 'ยังไม่มีข้อมูลรายงาน' : 'No Report Data'}
                        </h3>
                        <p className="text-surface-500">
                            {i18n.language === 'th'
                                ? 'กรุณาเลือกช่วงเวลาและกดปุ่ม "สร้างรายงาน"'
                                : 'Please select a date range and click "Generate Report"'}
                        </p>
                    </div>
                )}
        </div>
    );
}

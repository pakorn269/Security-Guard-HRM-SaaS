import { useState, useEffect, useMemo } from 'react';
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import {
    TrendingUp,
    Users,
    CheckCircle,
    Clock,
    Calendar,
} from 'lucide-react';
import analyticsService, {
    type KPISummary,
    type UtilizationReport,
    type TrendingDataPoint,
    type TypeDistribution,
    type HeatmapData,
} from '../../services/analytics.service';
import { useAuth } from '../../context/AuthContext';

// Color palette for charts
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function LeaveReportsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [granularity, setGranularity] = useState<'daily' | 'monthly'>('monthly');

    // Data states
    const [kpiData, setKpiData] = useState<KPISummary | null>(null);
    const [utilizationData, setUtilizationData] = useState<UtilizationReport[]>([]);
    const [trendingData, setTrendingData] = useState<TrendingDataPoint[]>([]);
    const [typeDistribution, setTypeDistribution] = useState<TypeDistribution[]>([]);
    const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);

    const isManager =
        user?.role === 'manager' || user?.role === 'company_admin' || user?.role === 'super_admin';

    // Calculate date range for current year
    const dateRange = useMemo(() => {
        return {
            startDate: `${selectedYear}-01-01`,
            endDate: `${selectedYear}-12-31`,
        };
    }, [selectedYear]);

    // Load all data
    useEffect(() => {
        if (!isManager) return;

        const loadData = async () => {
            try {
                setLoading(true);

                const [kpi, utilization, trending, distribution, heatmap] = await Promise.all([
                    analyticsService.getKPISummary(selectedYear),
                    analyticsService.getUtilizationReport({ year: selectedYear, limit: 10 }),
                    analyticsService.getTrendingReport({
                        ...dateRange,
                        granularity,
                    }),
                    analyticsService.getTypeDistribution(selectedYear),
                    analyticsService.getHeatmapData(dateRange),
                ]);

                setKpiData(kpi);
                setUtilizationData(utilization);
                setTrendingData(trending);
                setTypeDistribution(distribution);
                setHeatmapData(heatmap);
            } catch (err) {
                console.error('Error loading analytics data:', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [selectedYear, granularity, dateRange, isManager]);

    // Generate year options
    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    }, []);

    if (!isManager) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <h2 className="text-xl font-bold text-surface-900 mb-2">
                        ไม่มีสิทธิ์เข้าถึง
                    </h2>
                    <p className="text-surface-600">
                        หน้านี้สำหรับผู้จัดการและผู้ดูแลระบบเท่านั้น
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="spinner w-12 h-12 mx-auto mb-4"></div>
                    <p className="text-surface-600">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-800">รายงานและการวิเคราะห์</h1>
                    <p className="text-surface-500">วิเคราะห์ข้อมูลการลาและสถิติต่างๆ</p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="input-base"
                    >
                        {yearOptions.map((year) => (
                            <option key={year} value={year}>
                                ปี {year}
                            </option>
                        ))}
                    </select>

                    <select
                        value={granularity}
                        onChange={(e) => setGranularity(e.target.value as 'daily' | 'monthly')}
                        className="input-base"
                    >
                        <option value="daily">รายวัน</option>
                        <option value="monthly">รายเดือน</option>
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            {kpiData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Requests */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-surface-600 text-sm">คำขอทั้งหมด</span>
                            <Calendar className="w-5 h-5 text-primary-500" />
                        </div>
                        <div className="text-3xl font-bold text-surface-900">
                            {kpiData.totalRequests}
                        </div>
                        <div className="text-xs text-surface-500 mt-1">
                            {kpiData.totalDays} วันรวม
                        </div>
                    </div>

                    {/* Approval Rate */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-surface-600 text-sm">อัตราอนุมัติ</span>
                            <CheckCircle className="w-5 h-5 text-success-500" />
                        </div>
                        <div className="text-3xl font-bold text-success-600">
                            {kpiData.approvalRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-surface-500 mt-1">
                            ของคำขอทั้งหมด
                        </div>
                    </div>

                    {/* Pending Count */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-surface-600 text-sm">รออนุมัติ</span>
                            <Clock className="w-5 h-5 text-warning-500" />
                        </div>
                        <div className="text-3xl font-bold text-warning-600">
                            {kpiData.pendingCount}
                        </div>
                        <div className="text-xs text-surface-500 mt-1">
                            คำขอที่รอดำเนินการ
                        </div>
                    </div>

                    {/* Avg Processing Time */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-surface-600 text-sm">เวลาเฉลี่ย</span>
                            <TrendingUp className="w-5 h-5 text-accent-500" />
                        </div>
                        <div className="text-3xl font-bold text-accent-600">
                            {kpiData.avgProcessingHours
                                ? `${kpiData.avgProcessingHours.toFixed(1)}h`
                                : 'N/A'}
                        </div>
                        <div className="text-xs text-surface-500 mt-1">
                            เวลาในการอนุมัติ
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Row 1: Utilization and Type Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Employee Utilization Bar Chart */}
                <div className="card p-6">
                    <h3 className="text-lg font-bold text-surface-900 mb-4">
                        อัตราการใช้วันลา (Top 10)
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={utilizationData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                                dataKey="employeeCode"
                                tick={{ fontSize: 12 }}
                                stroke="#6b7280"
                            />
                            <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                }}
                            />
                            <Legend />
                            <Bar
                                dataKey="utilizationRate"
                                fill="#3B82F6"
                                name="อัตราการใช้ (%)"
                                radius={[8, 8, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Leave Type Distribution Pie Chart */}
                <div className="card p-6">
                    <h3 className="text-lg font-bold text-surface-900 mb-4">
                        สัดส่วนประเภทการลา
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={typeDistribution}
                                dataKey="count"
                                nameKey="leaveTypeNameTh"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={({
                                    leaveTypeNameTh,
                                    leaveTypeName,
                                    count,
                                }: any) =>
                                    `${leaveTypeNameTh || leaveTypeName}: ${count}`
                                }
                            >
                                {typeDistribution.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2: Trending */}
            <div className="card p-6">
                <h3 className="text-lg font-bold text-surface-900 mb-4">
                    แนวโน้มการลา ({granularity === 'daily' ? 'รายวัน' : 'รายเดือน'})
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trendingData}>
                        <defs>
                            <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            stroke="#6b7280"
                        />
                        <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                            }}
                        />
                        <Legend />
                        <Area
                            type="monotone"
                            dataKey="approved"
                            stroke="#10B981"
                            fillOpacity={1}
                            fill="url(#colorApproved)"
                            name="อนุมัติ"
                        />
                        <Area
                            type="monotone"
                            dataKey="pending"
                            stroke="#F59E0B"
                            fillOpacity={1}
                            fill="url(#colorPending)"
                            name="รออนุมัติ"
                        />
                        <Area
                            type="monotone"
                            dataKey="rejected"
                            stroke="#EF4444"
                            fill="#EF4444"
                            fillOpacity={0.2}
                            name="ไม่อนุมัติ"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Heatmap - Simplified Grid View */}
            <div className="card p-6">
                <h3 className="text-lg font-bold text-surface-900 mb-4">
                    ปฏิทินการลา (Heatmap)
                </h3>
                <div className="grid grid-cols-7 gap-2">
                    {heatmapData.slice(0, 35).map((day) => (
                        <div
                            key={day.date}
                            className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-colors cursor-pointer ${day.count === 0
                                ? 'bg-surface-100 text-surface-400'
                                : day.count <= 2
                                    ? 'bg-success-200 text-success-800'
                                    : day.count <= 5
                                        ? 'bg-warning-200 text-warning-800'
                                        : 'bg-error-200 text-error-800'
                                }`}
                            title={`${day.date}: ${day.count} คน\n${day.employeeNames.join(', ')}`}
                        >
                            {day.count}
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs text-surface-600">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-surface-100 rounded"></div>
                        <span>ไม่มี</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-success-200 rounded"></div>
                        <span>1-2 คน</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-warning-200 rounded"></div>
                        <span>3-5 คน</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-error-200 rounded"></div>
                        <span>6+ คน</span>
                    </div>
                </div>
            </div>

            {/* Most Used Leave Type */}
            {kpiData?.mostUsedLeaveType && (
                <div className="card p-6 bg-gradient-to-r from-primary-50 to-accent-50 border-primary-200">
                    <div className="flex items-center gap-3">
                        <Users className="w-6 h-6 text-primary-600" />
                        <div>
                            <p className="text-sm text-surface-600">ประเภทการลาที่ใช้มากที่สุด</p>
                            <p className="text-lg font-bold text-surface-900">
                                {kpiData.mostUsedLeaveType}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

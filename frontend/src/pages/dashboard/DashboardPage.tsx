import { useTranslation } from 'react-i18next';
import {
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Calendar,
  TrendingUp,
  ArrowRight,
  Bell,
} from 'lucide-react';
import { PageHeader } from '../../components/layout';
import { StatCard, StatGroup, Timeline } from '../../components/data-display';
import { Card, CardHeader, Badge, Avatar } from '../../components/common';
import { Button } from '../../components/common';
import PendingLeaveRequestsWidget from '../../components/dashboard/PendingLeaveRequestsWidget';
import WhosOffTodayWidget from '../../components/dashboard/WhosOffTodayWidget';

/**
 * Dashboard Page - Redesigned (Part 5.2)
 *
 * Changes from original:
 * - Stat cards with consistent icon placement (left)
 * - Subtle trend indicators
 * - Compact widget design
 * - Quick action buttons
 * - Activity timeline
 * - No emoji icons (Lucide icons instead)
 */
export default function DashboardPage() {
  const { t } = useTranslation();

  // Stats data with Lucide icons
  const stats = [
    {
      label: t('dashboard.totalEmployees', 'พนักงานทั้งหมด'),
      value: '48',
      icon: <Users size={20} />,
      trend: 'up' as const,
      trendValue: '+2',
      helpText: t('dashboard.fromLastMonth', 'จากเดือนที่แล้ว'),
    },
    {
      label: t('dashboard.clockedInToday', 'ลงเวลาวันนี้'),
      value: '42',
      icon: <CheckCircle size={20} />,
      trend: 'neutral' as const,
      trendValue: '87.5%',
      helpText: t('dashboard.attendanceRate', 'อัตราการลงเวลา'),
    },
    {
      label: t('dashboard.lateToday', 'มาสาย'),
      value: '3',
      icon: <AlertTriangle size={20} />,
      trend: 'down' as const,
      trendValue: '-2',
      helpText: t('dashboard.fromYesterday', 'จากเมื่อวาน'),
    },
    {
      label: t('dashboard.absentToday', 'ไม่มา'),
      value: '3',
      icon: <XCircle size={20} />,
      trend: 'neutral' as const,
      trendValue: '6.25%',
      helpText: t('dashboard.absentRate', 'อัตราขาดงาน'),
    },
  ];

  // Recent activity data
  const recentAttendance = [
    { name: 'กมล ใจดี', time: '08:00', status: 'onTime' },
    { name: 'สมชาย มานะ', time: '08:05', status: 'onTime' },
    { name: 'สุดา รักงาน', time: '08:32', status: 'late' },
  ];

  // Activity timeline data
  const activityItems = [
    {
      id: '1',
      title: 'คำขอลาพักร้อน',
      description: 'สุดา รักงาน ขอลา 3 วัน',
      timestamp: '10 นาทีที่แล้ว',
      status: 'pending' as const,
    },
    {
      id: '2',
      title: 'พนักงานใหม่',
      description: 'วิชัย สุขใจ เริ่มงานวันนี้',
      timestamp: '1 ชั่วโมงที่แล้ว',
      status: 'completed' as const,
    },
    {
      id: '3',
      title: 'แจ้งเตือนกะงาน',
      description: 'กะกลางคืนมีพนักงาน 5 คน',
      timestamp: '2 ชั่วโมงที่แล้ว',
      status: 'default' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header with quick actions */}
      <PageHeader
        title={t('navigation.dashboard')}
        description={t('dashboard.subtitle', 'ภาพรวมการทำงานของพนักงานรักษาความปลอดภัย')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<Calendar size={16} />}>
              {t('dashboard.viewSchedule', 'ดูตารางงาน')}
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Bell size={16} />}>
              {t('dashboard.notifications', 'การแจ้งเตือน')}
            </Button>
          </div>
        }
      />

      {/* Stats grid */}
      <StatGroup columns={4}>
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            trend={stat.trend}
            trendValue={stat.trendValue}
            helpText={stat.helpText}
            cardVariant="bordered"
          />
        ))}
      </StatGroup>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's attendance - spans 2 columns */}
        <div className="lg:col-span-2">
          <Card variant="bordered" padding="none">
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                    {t('dashboard.todayAttendance', 'การลงเวลาวันนี้')}
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {t('dashboard.recentClockIns', 'การลงเวลาล่าสุด')}
                  </p>
                </div>
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={14} />}>
                  {t('common.viewAll', 'ดูทั้งหมด')}
                </Button>
              </div>
            </div>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {recentAttendance.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <Avatar name={item.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                      <Clock size={12} />
                      {t('dashboard.clockedIn', 'เข้างาน')} {item.time} น.
                    </p>
                  </div>
                  <Badge
                    variant={item.status === 'onTime' ? 'success' : 'warning'}
                    size="sm"
                  >
                    {item.status === 'onTime'
                      ? t('dashboard.onTime', 'ตรงเวลา')
                      : t('dashboard.late', 'มาสาย')}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  {t('dashboard.totalClockedIn', 'ลงเวลาแล้ว')}: <strong className="text-neutral-900 dark:text-white">42/48</strong>
                </span>
                <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  {t('dashboard.waitingFor', 'รอ')} <strong className="text-warning-600 dark:text-warning-400">6</strong> {t('dashboard.people', 'คน')}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Activity timeline */}
        <Card variant="bordered" padding="md">
          <CardHeader
            title={t('dashboard.recentActivity', 'กิจกรรมล่าสุด')}
            subtitle={t('dashboard.activitySubtitle', 'การอัปเดตจากระบบ')}
          />
          <Timeline items={activityItems} size="sm" />
        </Card>
      </div>

      {/* Bottom widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending leave requests */}
        <PendingLeaveRequestsWidget />

        {/* Who's Off Today */}
        <WhosOffTodayWidget />
      </div>

      {/* Info notice */}
      <Card variant="default" padding="md" className="bg-primary-50 dark:bg-primary-950/30 border-primary-200 dark:border-primary-800">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-md bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={16} className="text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-primary-800 dark:text-primary-200">
              {t('dashboard.tipTitle', 'เคล็ดลับ')}
            </p>
            <p className="text-sm text-primary-700 dark:text-primary-300 mt-0.5">
              {t('dashboard.tipDescription', 'นี่คือหน้าตัวอย่างจาก Sprint 0 - ฟีเจอร์ทั้งหมดจะถูกพัฒนาใน Sprint ถัดไป')}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

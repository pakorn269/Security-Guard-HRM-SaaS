import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Building2,
    Clock,
    Bell,
    Palmtree,
    CheckCircle,
    AlertTriangle,
    Save,
    Loader2,
    Lightbulb,
} from 'lucide-react';
import api from '../../services/api';

interface CompanySettings {
    lateThresholdMinutes: number;
    overtimeThresholdMinutes: number;
    gpsRadiusMeters: number;
    autoClockOutHours: number;
    leaveResetMonth: number;
    timezone: string;
    dateFormat: string;
    notificationPreferences: {
        shiftReminder: boolean;
        shiftReminderHours: number;
        leaveStatusChange: boolean;
        attendanceAlerts: boolean;
    };
}

interface CompanyProfile {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    email?: string;
}

type SettingsTab = 'profile' | 'attendance' | 'notifications' | 'leave';

export default function SettingsPage() {
    const { i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [settings, setSettings] = useState<CompanySettings>({
        lateThresholdMinutes: 15,
        overtimeThresholdMinutes: 30,
        gpsRadiusMeters: 100,
        autoClockOutHours: 12,
        leaveResetMonth: 1,
        timezone: 'Asia/Bangkok',
        dateFormat: 'DD/MM/YYYY',
        notificationPreferences: {
            shiftReminder: true,
            shiftReminderHours: 2,
            leaveStatusChange: true,
            attendanceAlerts: true,
        },
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/companies/current');
            const company = response.data.data;

            setProfile({
                id: company.id,
                name: company.name,
                slug: company.slug,
                logoUrl: company.logoUrl,
                address: company.address,
                phone: company.phone,
                email: company.email,
            });

            if (company.settings) {
                setSettings({
                    lateThresholdMinutes: company.settings.lateThresholdMinutes ?? 15,
                    overtimeThresholdMinutes: company.settings.overtimeThresholdMinutes ?? 30,
                    gpsRadiusMeters: company.settings.gpsRadiusMeters ?? 100,
                    autoClockOutHours: company.settings.autoClockOutHours ?? 12,
                    leaveResetMonth: company.settings.leaveResetMonth ?? 1,
                    timezone: company.settings.timezone ?? 'Asia/Bangkok',
                    dateFormat: company.settings.dateFormat ?? 'DD/MM/YYYY',
                    notificationPreferences: company.settings.notificationPreferences ?? {
                        shiftReminder: true,
                        shiftReminderHours: 2,
                        leaveStatusChange: true,
                        attendanceAlerts: true,
                    },
                });
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!profile) return;

        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await api.put(`/companies/${profile.id}`, {
                name: profile.name,
                address: profile.address,
                phone: profile.phone,
                email: profile.email,
            });
            setSuccess(i18n.language === 'th' ? 'บันทึกสำเร็จ' : 'Saved successfully');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!profile) return;

        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await api.put(`/companies/${profile.id}/settings`, settings);
            setSuccess(i18n.language === 'th' ? 'บันทึกสำเร็จ' : 'Saved successfully');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
        { id: 'profile', label: i18n.language === 'th' ? 'ข้อมูลบริษัท' : 'Company Profile', icon: <Building2 size={20} /> },
        { id: 'attendance', label: i18n.language === 'th' ? 'การลงเวลา' : 'Attendance', icon: <Clock size={20} /> },
        { id: 'notifications', label: i18n.language === 'th' ? 'การแจ้งเตือน' : 'Notifications', icon: <Bell size={20} /> },
        { id: 'leave', label: i18n.language === 'th' ? 'การลา' : 'Leave', icon: <Palmtree size={20} /> },
    ];

    const months = [
        { value: 1, labelTh: 'มกราคม', labelEn: 'January' },
        { value: 2, labelTh: 'กุมภาพันธ์', labelEn: 'February' },
        { value: 3, labelTh: 'มีนาคม', labelEn: 'March' },
        { value: 4, labelTh: 'เมษายน', labelEn: 'April' },
        { value: 5, labelTh: 'พฤษภาคม', labelEn: 'May' },
        { value: 6, labelTh: 'มิถุนายน', labelEn: 'June' },
        { value: 7, labelTh: 'กรกฎาคม', labelEn: 'July' },
        { value: 8, labelTh: 'สิงหาคม', labelEn: 'August' },
        { value: 9, labelTh: 'กันยายน', labelEn: 'September' },
        { value: 10, labelTh: 'ตุลาคม', labelEn: 'October' },
        { value: 11, labelTh: 'พฤศจิกายน', labelEn: 'November' },
        { value: 12, labelTh: 'ธันวาคม', labelEn: 'December' },
    ];

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 size={48} className="text-primary-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold text-surface-800 dark:text-white">
                    {i18n.language === 'th' ? 'ตั้งค่า' : 'Settings'}
                </h1>
                <p className="text-surface-500 mt-1">
                    {i18n.language === 'th' ? 'จัดการการตั้งค่าระบบและบริษัท' : 'Manage system and company settings'}
                </p>
            </div>

            {/* Success/Error messages */}
            {success && (
                <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 text-success-700 dark:text-success-400 rounded-xl p-4 flex items-center gap-2">
                    <CheckCircle size={18} />
                    {success}
                </div>
            )}
            {error && (
                <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 text-error-700 dark:text-error-400 rounded-xl p-4 flex items-center gap-2">
                    <AlertTriangle size={18} />
                    {error}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar tabs */}
                <div className="lg:w-64 flex-shrink-0">
                    <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm p-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full px-4 py-3 rounded-lg text-left flex items-center gap-3 transition-all ${activeTab === tab.id
                                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                        : 'text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700'
                                    }`}
                            >
                                {tab.icon}
                                <span className="font-medium">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content area */}
                <div className="flex-1">
                    <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm p-6">
                        {/* Company Profile */}
                        {activeTab === 'profile' && profile && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold text-surface-800 dark:text-white">
                                    {i18n.language === 'th' ? 'ข้อมูลบริษัท' : 'Company Profile'}
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                            {i18n.language === 'th' ? 'ชื่อบริษัท' : 'Company Name'}
                                        </label>
                                        <input
                                            type="text"
                                            value={profile.name}
                                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                            {i18n.language === 'th' ? 'อีเมล' : 'Email'}
                                        </label>
                                        <input
                                            type="email"
                                            value={profile.email || ''}
                                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                            {i18n.language === 'th' ? 'โทรศัพท์' : 'Phone'}
                                        </label>
                                        <input
                                            type="tel"
                                            value={profile.phone || ''}
                                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                            {i18n.language === 'th' ? 'ที่อยู่' : 'Address'}
                                        </label>
                                        <textarea
                                            value={profile.address || ''}
                                            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                            rows={3}
                                            className="w-full px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-surface-200 dark:border-surface-700">
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={saving}
                                        className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <span className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                {i18n.language === 'th' ? 'กำลังบันทึก...' : 'Saving...'}
                                            </span>
                                        ) : (
                                            <><Save size={16} /> {i18n.language === 'th' ? 'บันทึก' : 'Save'}</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Attendance Settings */}
                        {activeTab === 'attendance' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold text-surface-800 dark:text-white">
                                    {i18n.language === 'th' ? 'การตั้งค่าการลงเวลา' : 'Attendance Settings'}
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                            {i18n.language === 'th' ? 'เกณฑ์มาสาย (นาที)' : 'Late Threshold (minutes)'}
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="60"
                                            value={settings.lateThresholdMinutes}
                                            onChange={(e) => setSettings({ ...settings, lateThresholdMinutes: Number(e.target.value) })}
                                            className="w-full px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                                        />
                                        <p className="mt-1 text-sm text-surface-500">
                                            {i18n.language === 'th'
                                                ? 'ลงเวลาหลังจากเวลาเริ่มกะกี่นาทีถือว่ามาสาย'
                                                : 'Minutes after shift start to be marked as late'}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                            {i18n.language === 'th' ? 'เกณฑ์ทำงานล่วงเวลา (นาที)' : 'Overtime Threshold (minutes)'}
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="120"
                                            value={settings.overtimeThresholdMinutes}
                                            onChange={(e) => setSettings({ ...settings, overtimeThresholdMinutes: Number(e.target.value) })}
                                            className="w-full px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                                        />
                                        <p className="mt-1 text-sm text-surface-500">
                                            {i18n.language === 'th'
                                                ? 'ทำงานหลังจากเวลาสิ้นสุดกะกี่นาทีถือว่าทำงานล่วงเวลา'
                                                : 'Minutes after shift end to count as overtime'}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                            {i18n.language === 'th' ? 'รัศมี GPS (เมตร)' : 'GPS Radius (meters)'}
                                        </label>
                                        <input
                                            type="number"
                                            min="50"
                                            max="1000"
                                            value={settings.gpsRadiusMeters}
                                            onChange={(e) => setSettings({ ...settings, gpsRadiusMeters: Number(e.target.value) })}
                                            className="w-full px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                                        />
                                        <p className="mt-1 text-sm text-surface-500">
                                            {i18n.language === 'th'
                                                ? 'รัศมีที่อนุญาตให้ลงเวลาจากสถานที่ทำงาน'
                                                : 'Allowed radius from work location for clock-in'}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                            {i18n.language === 'th' ? 'ลงเวลาออกอัตโนมัติ (ชั่วโมง)' : 'Auto Clock-out (hours)'}
                                        </label>
                                        <input
                                            type="number"
                                            min="8"
                                            max="24"
                                            value={settings.autoClockOutHours}
                                            onChange={(e) => setSettings({ ...settings, autoClockOutHours: Number(e.target.value) })}
                                            className="w-full px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                                        />
                                        <p className="mt-1 text-sm text-surface-500">
                                            {i18n.language === 'th'
                                                ? 'ลงเวลาออกอัตโนมัติหลังจากลงเวลาเข้ากี่ชั่วโมง'
                                                : 'Auto clock-out after how many hours from clock-in'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-surface-200 dark:border-surface-700">
                                    <button
                                        onClick={handleSaveSettings}
                                        disabled={saving}
                                        className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <span className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                {i18n.language === 'th' ? 'กำลังบันทึก...' : 'Saving...'}
                                            </span>
                                        ) : (
                                            <><Save size={16} /> {i18n.language === 'th' ? 'บันทึก' : 'Save'}</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Notification Settings */}
                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold text-surface-800 dark:text-white">
                                    {i18n.language === 'th' ? 'การตั้งค่าการแจ้งเตือน' : 'Notification Settings'}
                                </h2>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-surface-50 dark:bg-surface-700">
                                        <div>
                                            <p className="font-medium text-surface-800 dark:text-white">
                                                {i18n.language === 'th' ? 'แจ้งเตือนก่อนกะงาน' : 'Shift Reminder'}
                                            </p>
                                            <p className="text-sm text-surface-500">
                                                {i18n.language === 'th'
                                                    ? 'ส่งการแจ้งเตือนก่อนเริ่มกะงาน'
                                                    : 'Send notification before shift starts'}
                                            </p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.notificationPreferences.shiftReminder}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    notificationPreferences: {
                                                        ...settings.notificationPreferences,
                                                        shiftReminder: e.target.checked,
                                                    },
                                                })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-surface-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-surface-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                        </label>
                                    </div>

                                    {settings.notificationPreferences.shiftReminder && (
                                        <div className="ml-4 p-4 rounded-lg border border-surface-200 dark:border-surface-600">
                                            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                                {i18n.language === 'th' ? 'แจ้งเตือนล่วงหน้า (ชั่วโมง)' : 'Remind Before (hours)'}
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="24"
                                                value={settings.notificationPreferences.shiftReminderHours}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    notificationPreferences: {
                                                        ...settings.notificationPreferences,
                                                        shiftReminderHours: Number(e.target.value),
                                                    },
                                                })}
                                                className="w-32 px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                                            />
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between p-4 rounded-lg bg-surface-50 dark:bg-surface-700">
                                        <div>
                                            <p className="font-medium text-surface-800 dark:text-white">
                                                {i18n.language === 'th' ? 'แจ้งเตือนสถานะการลา' : 'Leave Status Change'}
                                            </p>
                                            <p className="text-sm text-surface-500">
                                                {i18n.language === 'th'
                                                    ? 'แจ้งเตือนเมื่อสถานะการลาเปลี่ยนแปลง'
                                                    : 'Notify when leave request status changes'}
                                            </p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.notificationPreferences.leaveStatusChange}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    notificationPreferences: {
                                                        ...settings.notificationPreferences,
                                                        leaveStatusChange: e.target.checked,
                                                    },
                                                })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-surface-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-surface-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-lg bg-surface-50 dark:bg-surface-700">
                                        <div>
                                            <p className="font-medium text-surface-800 dark:text-white">
                                                {i18n.language === 'th' ? 'แจ้งเตือนการลงเวลา' : 'Attendance Alerts'}
                                            </p>
                                            <p className="text-sm text-surface-500">
                                                {i18n.language === 'th'
                                                    ? 'แจ้งเตือนเมื่อพนักงานมาสายหรือไม่มา'
                                                    : 'Alert when employees are late or absent'}
                                            </p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.notificationPreferences.attendanceAlerts}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    notificationPreferences: {
                                                        ...settings.notificationPreferences,
                                                        attendanceAlerts: e.target.checked,
                                                    },
                                                })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-surface-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-surface-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-surface-200 dark:border-surface-700">
                                    <button
                                        onClick={handleSaveSettings}
                                        disabled={saving}
                                        className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <span className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                {i18n.language === 'th' ? 'กำลังบันทึก...' : 'Saving...'}
                                            </span>
                                        ) : (
                                            <><Save size={16} /> {i18n.language === 'th' ? 'บันทึก' : 'Save'}</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Leave Settings */}
                        {activeTab === 'leave' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold text-surface-800 dark:text-white">
                                    {i18n.language === 'th' ? 'การตั้งค่าการลา' : 'Leave Settings'}
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                            {i18n.language === 'th' ? 'เดือนรีเซ็ตวันลา' : 'Leave Reset Month'}
                                        </label>
                                        <select
                                            value={settings.leaveResetMonth}
                                            onChange={(e) => setSettings({ ...settings, leaveResetMonth: Number(e.target.value) })}
                                            className="w-full px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                                        >
                                            {months.map((month) => (
                                                <option key={month.value} value={month.value}>
                                                    {i18n.language === 'th' ? month.labelTh : month.labelEn}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="mt-1 text-sm text-surface-500">
                                            {i18n.language === 'th'
                                                ? 'เดือนที่จะรีเซ็ตวันลาของพนักงานทุกคน'
                                                : 'Month when all employee leave balances reset'}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 flex items-start gap-2">
                                    <Lightbulb size={18} className="flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-primary-700 dark:text-primary-300">
                                        {i18n.language === 'th'
                                            ? 'สำหรับการจัดการประเภทการลาและโควต้า กรุณาไปที่หน้า การลา > ประเภทการลา'
                                            : 'For managing leave types and quotas, please go to Leave > Leave Types'}
                                    </p>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-surface-200 dark:border-surface-700">
                                    <button
                                        onClick={handleSaveSettings}
                                        disabled={saving}
                                        className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <span className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                {i18n.language === 'th' ? 'กำลังบันทึก...' : 'Saving...'}
                                            </span>
                                        ) : (
                                            <><Save size={16} /> {i18n.language === 'th' ? 'บันทึก' : 'Save'}</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import liff from '@line/liff';
import { useNavigate } from 'react-router-dom';
import { useLiffAuth } from '../../context/LiffAuthContext';
import {
    User,
    Phone,
    Mail,
    Calendar,
    ShieldCheck,
    AlertTriangle,
    XCircle,
    CheckCircle2,
    Bell,
    Globe,
    LogOut,
    ChevronRight,
    Award,
    Lock,
    Loader2,
    Link,
    Unlink,
    RefreshCw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import employeeService from '../../services/employee.service';
import companyService from '../../services/company.service';
import type { Employee, Certification } from '../../types/employee.types';
import type { Company } from '../../types/company.types';

export default function LiffProfilePage() {
    const navigate = useNavigate();
    const { user, isLoading, logout, unlinkLine, connectLine } = useLiffAuth();
    const { i18n } = useTranslation();
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Real data state
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [certifications, setCertifications] = useState<Certification[]>([]);
    const [company, setCompany] = useState<Company | null>(null);
    const [isDataLoading, setIsDataLoading] = useState(false);

    // Fetch data on mount or when user changes
    useEffect(() => {
        const fetchData = async () => {
            if (user?.employeeId) {
                setIsDataLoading(true);
                try {
                    const [empData, certsData] = await Promise.all([
                        employeeService.getById(user.employeeId),
                        employeeService.getCertifications(user.employeeId)
                    ]);
                    setEmployee(empData);
                    setCertifications(certsData);
                } catch (err) {
                    console.error('Failed to fetch profile data:', err);
                }
            }

            if (user?.companyId) {
                try {
                    const companyData = await companyService.getById(user.companyId);
                    setCompany(companyData);
                } catch (err) {
                    console.error('Failed to fetch company data:', err);
                }
            }
            setIsDataLoading(false);
        };
        fetchData();
    }, [user?.employeeId, user?.companyId]);

    const handleRefresh = async () => {
        setIsDataLoading(true);
        try {
            if (user?.employeeId) {
                const [empData, certsData] = await Promise.all([
                    employeeService.getById(user.employeeId),
                    employeeService.getCertifications(user.employeeId)
                ]);
                setEmployee(empData);
                setCertifications(certsData);
            }

            if (user?.companyId) {
                const companyData = await companyService.getById(user.companyId);
                setCompany(companyData);
            }
        } catch (err) {
            console.error('Failed to fetch profile data:', err);
        } finally {
            setIsDataLoading(false);
        }
    };

    // Helper functions
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString(i18n.language === 'th' ? 'th-TH' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getDaysRemaining = (dateString?: string) => {
        if (!dateString) return null;
        const expiry = new Date(dateString);
        expiry.setHours(23, 59, 59, 999); // End of expiry day
        const today = new Date();
        const diffTime = expiry.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Placeholder profile data mixed with real data
    const profile = {
        name: employee?.fullNameTh || employee?.fullName || user?.lineDisplayName || 'พนักงาน',
        employeeCode: employee?.employeeCode || (user?.employeeId ? `EMP-${user.employeeId.slice(0, 6).toUpperCase()}` : 'N/A'),
        phone: employee?.phone || '081-xxx-xxxx',
        email: employee?.email || user?.email || 'N/A',
        position: 'เจ้าหน้าที่รักษาความปลอดภัย', // Pending: Position field in Employee model
        hireDate: employee?.hireDate ? formatDate(employee.hireDate) : 'N/A',
    };

    const handleLogout = async () => {
        await logout();
        if (liff.isLoggedIn()) {
            liff.logout();
        }
        window.location.reload();
    };

    const handleChangePin = () => {
        navigate('/liff/change-pin');
    };

    const getStatusInfo = (expiryDate?: string) => {
        if (!expiryDate) return { status: 'valid', text: 'ตลอดชีพ', className: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300' };

        const days = getDaysRemaining(expiryDate);
        if (days === null) return { status: 'valid', text: 'N/A', className: '' };

        if (days < 0) {
            return {
                status: 'expired',
                text: i18n.language === 'th' ? 'หมดอายุแล้ว' : 'Expired',
                className: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300'
            };
        } else if (days <= 30) {
            return {
                status: 'expiring_soon',
                text: i18n.language === 'th' ? `เหลือ ${days} วัน` : `${days} days left`,
                className: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300'
            };
        } else if (days <= 90) {
            return {
                status: 'expiring',
                text: i18n.language === 'th' ? `เหลือ ${days} วัน` : `${days} days left`,
                className: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'
            };
        } else {
            return {
                status: 'valid',
                text: i18n.language === 'th' ? 'ใช้งานได้' : 'Valid',
                className: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300'
            };
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'valid':
                return <ShieldCheck size={14} className="text-success-600" />;
            case 'expiring':
                return <AlertTriangle size={14} className="text-warning-600" />;
            case 'expiring_soon':
            case 'expired':
                return <XCircle size={14} className="text-error-600" />;
            default:
                return <ShieldCheck size={14} className="text-neutral-400" />;
        }
    };



    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 animate-fade-in pb-20">
            {/* Profile header */}
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg p-6 text-white text-center shadow-lg relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <ShieldCheck size={120} />
                </div>

                {company?.logoUrl && (
                    <div className="absolute top-4 left-4">
                        <img src={company.logoUrl} alt="Company Logo" className="w-8 h-8 object-contain bg-white rounded-full p-1" />
                    </div>
                )}

                {company && (
                    <div className="absolute top-4 right-4 text-xs font-medium bg-white/20 px-2 py-1 rounded backdrop-blur-sm">
                        {company.name}
                    </div>
                )}

                <div className="w-24 h-24 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4 ring-4 ring-white/30 overflow-hidden relative z-10">
                    {user?.linePictureUrl ? (
                        <img
                            src={user.linePictureUrl}
                            alt={profile.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <User size={48} className="text-white/90" />
                    )}
                </div>
                <h1 className="text-xl font-bold">{profile.name}</h1>
                <p className="text-white/80 mt-1 text-sm">{profile.employeeCode}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                    <p className="text-white/60 text-sm">{profile.position}</p>
                    {isDataLoading && <Loader2 size={12} className="animate-spin text-white/50" />}
                </div>
            </div>

            {/* Pull to refresh hint */}
            <div className="flex justify-center -mt-2">
                <button
                    onClick={handleRefresh}
                    className="p-1 rounded-full bg-white/10 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                    <RefreshCw size={14} className={isDataLoading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Profile info */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 shadow-sm border border-neutral-200 dark:border-neutral-800">
                <h2 className="font-semibold text-neutral-800 dark:text-white mb-3">ข้อมูลส่วนตัว</h2>
                <div className="space-y-0">
                    <div className="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-neutral-800">
                        <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                            <Phone size={16} />
                            เบอร์โทร
                        </span>
                        <span className="text-neutral-800 dark:text-white font-medium">{profile.phone}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-neutral-800">
                        <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                            <Mail size={16} />
                            อีเมล
                        </span>
                        <span className="text-neutral-800 dark:text-white font-medium">{profile.email}</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                        <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                            <Calendar size={16} />
                            วันเริ่มงาน
                        </span>
                        <span className="text-neutral-800 dark:text-white font-medium">{profile.hireDate}</span>
                    </div>

                    {/* Emergency Contact - Phase 4 */}
                    {employee?.emergencyContactName ? (
                        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 mt-2">
                            <h3 className="text-sm font-medium text-neutral-500 mb-2">{i18n.language === 'th' ? 'ผู้ติดต่อฉุกเฉิน' : 'Emergency Contact'}</h3>
                            <div className="flex items-center justify-between">
                                <span className="text-neutral-800 dark:text-white font-medium">{employee.emergencyContactName}</span>
                                {employee.emergencyContactPhone && (
                                    <a
                                        href={`tel:${employee.emergencyContactPhone}`}
                                        className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                                    >
                                        <Phone size={14} />
                                        {employee.emergencyContactPhone}
                                    </a>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 mt-2">
                            <h3 className="text-sm font-medium text-neutral-500 mb-2">{i18n.language === 'th' ? 'ผู้ติดต่อฉุกเฉิน' : 'Emergency Contact'}</h3>
                            <p className="text-sm text-neutral-400 italic">
                                {i18n.language === 'th' ? 'ยังไม่ได้ระบุ' : 'Not set'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Connected Accounts - Phase 2 */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 shadow-sm border border-neutral-200 dark:border-neutral-800">
                <h2 className="font-semibold text-neutral-800 dark:text-white mb-3 flex items-center gap-2">
                    <Link size={18} className="text-primary-500" />
                    {i18n.language === 'th' ? 'บัญชีที่เชื่อมต่อ' : 'Connected Accounts'}
                </h2>

                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            {/* LINE Logo/Icon */}
                            <div className="w-10 h-10 bg-[#06C755] rounded-lg flex items-center justify-center text-white font-bold text-xs">
                                LINE
                            </div>
                            <div>
                                <p className="font-medium text-neutral-800 dark:text-white">LINE</p>
                                {user?.lineUserId ? (
                                    <p className="text-sm text-[#06C755] flex items-center gap-1">
                                        <CheckCircle2 size={12} />
                                        {i18n.language === 'th' ? 'เชื่อมต่อแล้ว' : 'Connected'}
                                    </p>
                                ) : (
                                    <p className="text-sm text-neutral-500 flex items-center gap-1">
                                        <XCircle size={12} />
                                        {i18n.language === 'th' ? 'ยังไม่ได้เชื่อมต่อ' : 'Not connected'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {user?.lineUserId ? (
                        <div className="pl-[52px]">
                            {/* Linked State */}
                            <div className="bg-white dark:bg-neutral-700/50 rounded-md p-3 mb-3 border border-neutral-200 dark:border-neutral-700">
                                <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-1">
                                    {i18n.language === 'th' ? 'ชื่อที่แสดง:' : 'Display Name:'}
                                </p>
                                <p className="font-medium text-neutral-900 dark:text-white">
                                    {user.lineDisplayName || '-'}
                                </p>
                            </div>
                            <button
                                onClick={async () => {
                                    const confirm = window.confirm(
                                        i18n.language === 'th'
                                            ? 'คุณต้องการยกเลิกการเชื่อมต่อ LINE ใช่หรือไม่?\nคุณจะไม่สามารถเข้าสู่ระบบด้วย LINE ได้อีกต่อไป'
                                            : 'Are you sure you want to unlink LINE?\nYou will no longer be able to login with LINE.'
                                    );
                                    if (confirm) {
                                        setIsActionLoading(true);
                                        await unlinkLine();
                                        setIsActionLoading(false);
                                    }
                                }}
                                disabled={isActionLoading}
                                className="text-sm text-error-600 hover:text-error-700 underline flex items-center gap-1"
                            >
                                <Unlink size={14} />
                                {i18n.language === 'th' ? 'ยกเลิกการเชื่อมต่อ' : 'Unlink account'}
                            </button>
                        </div>
                    ) : (
                        <div className="pl-[52px]">
                            {/* Not Linked State */}
                            <button
                                onClick={async () => {
                                    setIsActionLoading(true);
                                    await connectLine();
                                    setIsActionLoading(false);
                                }}
                                disabled={isActionLoading}
                                className="w-full py-2 bg-[#06C755] hover:bg-[#05b64d] text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : <Link size={16} />}
                                {i18n.language === 'th' ? 'เชื่อมต่อ LINE' : 'Connect LINE'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Certifications */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 shadow-sm border border-neutral-200 dark:border-neutral-800">
                <h2 className="font-semibold text-neutral-800 dark:text-white mb-3 flex items-center gap-2">
                    <Award size={18} className="text-primary-500" />
                    ใบอนุญาต/ใบรับรอง
                </h2>
                <div className="space-y-3">
                    {certifications.length > 0 ? (
                        certifications.map((cert, index) => {
                            const statusInfo = getStatusInfo(cert.expiryDate);
                            return (
                                <div
                                    key={cert.id || index}
                                    className="flex items-center justify-between p-3 rounded-md bg-neutral-50 dark:bg-neutral-800"
                                >
                                    <div className="flex items-start gap-3">
                                        {getStatusIcon(statusInfo.status)}
                                        <div>
                                            <p className="font-medium text-neutral-800 dark:text-white">
                                                {i18n.language === 'th' && cert.typeTh ? cert.typeTh : cert.type}
                                            </p>
                                            {cert.expiryDate && (
                                                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                                    {i18n.language === 'th' ? 'หมดอายุ:' : 'Expires:'} {formatDate(cert.expiryDate)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <span
                                        className={`px-2 py-1 text-xs rounded-md font-medium whitespace-nowrap ${statusInfo.className}`}
                                    >
                                        {statusInfo.text}
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-center text-neutral-400 text-sm py-2">
                            {i18n.language === 'th' ? 'ไม่มีข้อมูลใบอนุญาต' : 'No certifications found'}
                        </p>
                    )}
                </div>
            </div>

            {/* Settings */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 shadow-sm border border-neutral-200 dark:border-neutral-800">
                <h2 className="font-semibold text-neutral-800 dark:text-white mb-3">ตั้งค่า</h2>
                <div className="space-y-1">
                    {/* Change PIN - Only show if user has PIN set */}
                    {user?.hasPin && (
                        <button
                            onClick={handleChangePin}
                            className="w-full text-left p-3 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-between group"
                        >
                            <span className="text-neutral-700 dark:text-neutral-300 flex items-center gap-3">
                                <Lock size={18} className="text-neutral-500 dark:text-neutral-400" />
                                เปลี่ยนรหัส PIN
                            </span>
                            <ChevronRight size={18} className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
                        </button>
                    )}
                    <button className="w-full text-left p-3 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-between group">
                        <span className="text-neutral-700 dark:text-neutral-300 flex items-center gap-3">
                            <Bell size={18} className="text-neutral-500 dark:text-neutral-400" />
                            การแจ้งเตือน
                        </span>
                        <ChevronRight size={18} className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
                    </button>
                    <button className="w-full text-left p-3 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-between group">
                        <span className="text-neutral-700 dark:text-neutral-300 flex items-center gap-3">
                            <Globe size={18} className="text-neutral-500 dark:text-neutral-400" />
                            ภาษา
                        </span>
                        <span className="text-neutral-500 dark:text-neutral-400 text-sm">ไทย</span>
                    </button>
                </div>
            </div>

            {/* Logout */}
            <button
                onClick={handleLogout}
                className="w-full py-3 rounded-lg border-2 border-error-500 text-error-500 font-medium hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors flex items-center justify-center gap-2"
            >
                <LogOut size={18} />
                ออกจากระบบ
            </button>

            {/* App version */}
            <p className="text-center text-neutral-400 dark:text-neutral-500 text-sm">
                Security Guard HRM v1.0.0
            </p>
        </div>
    );
}


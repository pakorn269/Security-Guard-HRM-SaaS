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
    Bell,
    Globe,
    LogOut,
    ChevronRight,
    Award,
    Lock,
    Loader2,
} from 'lucide-react';

export default function LiffProfilePage() {
    const navigate = useNavigate();
    const { user, isLoading, logout } = useLiffAuth();

    // Placeholder profile data - will be combined with real user data
    // In future, fetch employee details from API
    const profile = {
        name: user?.lineDisplayName || 'พนักงาน',
        employeeCode: user?.employeeId ? `EMP-${user.employeeId.slice(0, 6).toUpperCase()}` : 'N/A',
        phone: '081-xxx-xxxx', // TODO: Fetch from employee API
        email: user?.email || 'N/A',
        position: 'เจ้าหน้าที่รักษาความปลอดภัย',
        hireDate: 'N/A', // TODO: Fetch from employee API
    };

    const certifications = [
        { name: 'ใบอนุญาต รปภ.', expiry: '31 ธ.ค. 2025', status: 'valid' },
        { name: 'อบรมดับเพลิง', expiry: '15 มิ.ย. 2025', status: 'expiring' },
    ];

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

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'valid':
                return <ShieldCheck size={14} className="text-success-600" />;
            case 'expiring':
                return <AlertTriangle size={14} className="text-warning-600" />;
            default:
                return <XCircle size={14} className="text-error-600" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'valid':
                return { text: 'ใช้งานได้', className: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300' };
            case 'expiring':
                return { text: 'ใกล้หมดอายุ', className: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300' };
            default:
                return { text: 'หมดอายุ', className: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300' };
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
        <div className="p-4 space-y-6 animate-fade-in">
            {/* Profile header */}
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg p-6 text-white text-center shadow-lg">
                <div className="w-24 h-24 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4 ring-4 ring-white/30 overflow-hidden">
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
                <p className="text-white/60 text-sm mt-1">{profile.position}</p>
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
                </div>
            </div>

            {/* Certifications */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 shadow-sm border border-neutral-200 dark:border-neutral-800">
                <h2 className="font-semibold text-neutral-800 dark:text-white mb-3 flex items-center gap-2">
                    <Award size={18} className="text-primary-500" />
                    ใบอนุญาต/ใบรับรอง
                </h2>
                <div className="space-y-3">
                    {certifications.map((cert, index) => {
                        const statusInfo = getStatusText(cert.status);
                        return (
                            <div
                                key={index}
                                className="flex items-center justify-between p-3 rounded-md bg-neutral-50 dark:bg-neutral-800"
                            >
                                <div className="flex items-start gap-3">
                                    {getStatusIcon(cert.status)}
                                    <div>
                                        <p className="font-medium text-neutral-800 dark:text-white">{cert.name}</p>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">หมดอายุ: {cert.expiry}</p>
                                    </div>
                                </div>
                                <span
                                    className={`px-2 py-1 text-xs rounded-md font-medium ${statusInfo.className}`}
                                >
                                    {statusInfo.text}
                                </span>
                            </div>
                        );
                    })}
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


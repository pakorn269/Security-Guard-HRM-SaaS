import liff from '@line/liff';

export default function LiffProfilePage() {
    // Placeholder profile data (would come from LIFF and API)
    const profile = {
        name: 'สมชาย รักงาน',
        employeeCode: 'EMP-001',
        phone: '081-234-5678',
        email: 'somchai@company.com',
        position: 'เจ้าหน้าที่รักษาความปลอดภัย',
        hireDate: '1 ม.ค. 2024',
    };

    const certifications = [
        { name: 'ใบอนุญาต รปภ.', expiry: '31 ธ.ค. 2025', status: 'valid' },
        { name: 'อบรมดับเพลิง', expiry: '15 มิ.ย. 2025', status: 'expiring' },
    ];

    const handleLogout = () => {
        if (liff.isLoggedIn()) {
            liff.logout();
            window.location.reload();
        }
    };

    return (
        <div className="p-4 space-y-6 animate-fade-in">
            {/* Profile header */}
            <div className="bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl p-6 text-white text-center">
                <div className="w-24 h-24 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
                    <span className="text-5xl">👤</span>
                </div>
                <h1 className="text-xl font-bold">{profile.name}</h1>
                <p className="text-white/80 mt-1">{profile.employeeCode}</p>
                <p className="text-white/60 text-sm mt-1">{profile.position}</p>
            </div>

            {/* Profile info */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <h2 className="font-semibold text-surface-800 mb-3">ข้อมูลส่วนตัว</h2>
                <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-surface-100">
                        <span className="text-surface-500">📱 เบอร์โทร</span>
                        <span className="text-surface-800">{profile.phone}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-surface-100">
                        <span className="text-surface-500">📧 อีเมล</span>
                        <span className="text-surface-800">{profile.email}</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-surface-500">📅 วันเริ่มงาน</span>
                        <span className="text-surface-800">{profile.hireDate}</span>
                    </div>
                </div>
            </div>

            {/* Certifications */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <h2 className="font-semibold text-surface-800 mb-3">ใบอนุญาต/ใบรับรอง</h2>
                <div className="space-y-3">
                    {certifications.map((cert, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 rounded-lg bg-surface-50"
                        >
                            <div>
                                <p className="font-medium text-surface-800">{cert.name}</p>
                                <p className="text-sm text-surface-500">หมดอายุ: {cert.expiry}</p>
                            </div>
                            <span
                                className={`px-2 py-1 text-xs rounded-full ${cert.status === 'valid'
                                        ? 'bg-success-100 text-success-700'
                                        : cert.status === 'expiring'
                                            ? 'bg-warning-100 text-warning-700'
                                            : 'bg-error-100 text-error-700'
                                    }`}
                            >
                                {cert.status === 'valid'
                                    ? '✓ ใช้งานได้'
                                    : cert.status === 'expiring'
                                        ? '⚠️ ใกล้หมดอายุ'
                                        : '✕ หมดอายุ'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Settings */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <h2 className="font-semibold text-surface-800 mb-3">ตั้งค่า</h2>
                <div className="space-y-2">
                    <button className="w-full text-left p-3 rounded-lg hover:bg-surface-50 transition-colors flex items-center justify-between">
                        <span className="text-surface-700">🔔 การแจ้งเตือน</span>
                        <span className="text-surface-400">›</span>
                    </button>
                    <button className="w-full text-left p-3 rounded-lg hover:bg-surface-50 transition-colors flex items-center justify-between">
                        <span className="text-surface-700">🌐 ภาษา</span>
                        <span className="text-surface-500">ไทย</span>
                    </button>
                </div>
            </div>

            {/* Logout */}
            <button
                onClick={handleLogout}
                className="w-full py-3 rounded-xl border-2 border-error-500 text-error-500 font-medium hover:bg-error-50 transition-colors"
            >
                ออกจากระบบ
            </button>

            {/* App version */}
            <p className="text-center text-surface-400 text-sm">
                Security Guard HRM v1.0.0
            </p>
        </div>
    );
}

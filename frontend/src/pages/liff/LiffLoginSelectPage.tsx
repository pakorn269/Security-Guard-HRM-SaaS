// LIFF Login Selection Page
// Allows users to choose between LINE login or Email/Password login

import { useNavigate } from 'react-router-dom';
import { Shield, ChevronRight, Mail } from 'lucide-react';

export default function LiffLoginSelectPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col safe-area-inset">
            {/* Header with logo */}
            <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-8">
                <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-xl bg-primary-500 text-white flex items-center justify-center mb-4 shadow-lg">
                        <Shield size={32} />
                    </div>
                    <h1 className="text-xl font-bold text-neutral-900 dark:text-white text-center">
                        Security Guard HRM
                    </h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mt-1">
                        ระบบจัดการพนักงานรักษาความปลอดภัย
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4">
                {/* Instructions */}
                <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center mb-6">
                    กรุณาเลือกวิธีการเข้าสู่ระบบ
                    <br />
                    <span className="text-neutral-400 dark:text-neutral-500">
                        Please select login method
                    </span>
                </p>

                {/* Login Options */}
                <div className="space-y-3">
                    {/* LINE Login Option */}
                    <button
                        onClick={() => navigate('/liff/clock')}
                        className="
                            w-full bg-[#00B900]
                            rounded-lg p-4
                            flex items-center gap-4
                            hover:bg-[#00A000] active:bg-[#009000]
                            transition-colors
                            touch-target
                            shadow-sm
                        "
                    >
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                            </svg>
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-semibold text-white text-lg">
                                เข้าสู่ระบบด้วย LINE
                            </p>
                            <p className="text-xs text-white/80">
                                Login with LINE
                            </p>
                        </div>
                        <ChevronRight size={20} className="text-white/60" />
                    </button>

                    {/* Email/Password Login Option */}
                    <button
                        onClick={() => navigate('/liff/email-login')}
                        className="
                            w-full bg-white dark:bg-neutral-900 
                            border border-neutral-200 dark:border-neutral-800 
                            rounded-lg p-4
                            flex items-center gap-4
                            hover:border-primary-300 dark:hover:border-primary-700
                            hover:bg-neutral-50 dark:hover:bg-neutral-800
                            transition-colors
                            touch-target
                            shadow-sm
                        "
                    >
                        <div className="w-12 h-12 rounded-full bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center flex-shrink-0">
                            <Mail size={24} className="text-secondary-600" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-semibold text-neutral-900 dark:text-white text-lg">
                                เข้าสู่ระบบด้วยอีเมล
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Login with Email
                            </p>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                                สำหรับผู้ที่ไม่ได้ใช้ LINE
                            </p>
                        </div>
                        <ChevronRight size={20} className="text-neutral-400" />
                    </button>
                </div>

                {/* Help text */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                        หากมีปัญหาในการเข้าใช้งาน กรุณาติดต่อฝ่ายบุคคล
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                        If you have any issues, please contact HR
                    </p>
                </div>

                {/* Version info */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-neutral-300 dark:text-neutral-600">
                        Version 1.0.0
                    </p>
                </div>
            </div>
        </div>
    );
}

// LIFF Account Linking - Method Selection Page
// First-time users select how to link their LINE account

import { useNavigate } from 'react-router-dom';
import { User, Mail, ChevronRight, Link2 } from 'lucide-react';
import { useLiffAuth } from '../../context/LiffAuthContext';

export default function LiffLinkPage() {
    const navigate = useNavigate();
    const { lineProfile } = useLiffAuth();

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col safe-area-inset">
            {/* Header */}
            <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <Link2 size={24} className="text-primary-500" />
                    </div>
                </div>
                <h1 className="text-xl font-bold text-center text-neutral-900 dark:text-white">
                    เชื่อมต่อบัญชี
                </h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mt-1">
                    Link Your Account
                </p>
            </div>

            {/* Content */}
            <div className="flex-1 p-4">
                {/* LINE Profile Greeting */}
                <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 mb-6 border border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-3">
                        {lineProfile?.pictureUrl ? (
                            <img
                                src={lineProfile.pictureUrl}
                                alt="LINE Profile"
                                className="w-12 h-12 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                                <User size={24} className="text-success-600" />
                            </div>
                        )}
                        <div>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                สวัสดี / Hello
                            </p>
                            <p className="font-semibold text-neutral-900 dark:text-white">
                                {lineProfile?.displayName || 'LINE User'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center mb-6">
                    กรุณาเลือกวิธีการยืนยันตัวตน
                    <br />
                    <span className="text-neutral-400 dark:text-neutral-500">
                        Please select verification method
                    </span>
                </p>

                {/* Linking Options */}
                <div className="space-y-3">
                    {/* Employee Code Option */}
                    <button
                        onClick={() => navigate('/liff/link/employee')}
                        className="
                            w-full bg-white dark:bg-neutral-900 
                            border border-neutral-200 dark:border-neutral-800 
                            rounded-lg p-4
                            flex items-center gap-4
                            hover:border-primary-300 dark:hover:border-primary-700
                            hover:bg-neutral-50 dark:hover:bg-neutral-800
                            transition-colors
                            touch-target
                        "
                    >
                        <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                            <User size={24} className="text-primary-600" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-semibold text-neutral-900 dark:text-white">
                                รหัสพนักงาน
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Employee Code
                            </p>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                                สำหรับพนักงานรักษาความปลอดภัย
                            </p>
                        </div>
                        <ChevronRight size={20} className="text-neutral-400" />
                    </button>

                    {/* Email/Password Option */}
                    <button
                        onClick={() => navigate('/liff/link/credentials')}
                        className="
                            w-full bg-white dark:bg-neutral-900 
                            border border-neutral-200 dark:border-neutral-800 
                            rounded-lg p-4
                            flex items-center gap-4
                            hover:border-primary-300 dark:hover:border-primary-700
                            hover:bg-neutral-50 dark:hover:bg-neutral-800
                            transition-colors
                            touch-target
                        "
                    >
                        <div className="w-12 h-12 rounded-full bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center flex-shrink-0">
                            <Mail size={24} className="text-secondary-600" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-semibold text-neutral-900 dark:text-white">
                                อีเมลและรหัสผ่าน
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Email & Password
                            </p>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                                สำหรับผู้จัดการและแอดมิน
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
            </div>
        </div>
    );
}

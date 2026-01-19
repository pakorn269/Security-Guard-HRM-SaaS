import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  Mail,
  Lock,
  LogIn,
  Loader2,
  Globe,
  UserPlus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Alert } from '../../components/feedback';
import { ThemeToggle } from '../../components/theme';

/**
 * Login Page - Redesigned (Part 5.1)
 *
 * Changes from original:
 * - Clean white/neutral background (no gradient)
 * - Centered card with subtle shadow
 * - Corporate logo placement
 * - Smaller border radius (rounded-lg instead of rounded-2xl)
 * - Icon-based language toggle
 * - Professional, minimal design
 */
export default function LoginPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading, isAuthenticated, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError(
        i18n.language === 'th'
          ? 'กรุณากรอกอีเมลและรหัสผ่าน'
          : 'Please enter email and password'
      );
      return;
    }

    const success = await login({ email, password });
    if (success) {
      navigate('/');
    }
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'th' ? 'en' : 'th');
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      {/* Top bar with theme/language toggles */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <ThemeToggle size="sm" />
        <button
          onClick={toggleLanguage}
          className="
            inline-flex items-center gap-1.5
            px-3 py-1.5
            rounded-md
            bg-white dark:bg-neutral-800
            border border-neutral-200 dark:border-neutral-700
            text-sm font-medium text-neutral-700 dark:text-neutral-300
            hover:bg-neutral-100 dark:hover:bg-neutral-700
            transition-colors
            shadow-sm
          "
          aria-label={`Switch language to ${i18n.language === 'th' ? 'English' : 'Thai'}`}
        >
          <Globe size={16} />
          <span>{i18n.language === 'th' ? 'EN' : 'TH'}</span>
        </button>
      </div>

      {/* Main content - centered */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo and brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-primary-500 text-white mb-4 shadow-lg">
              <Shield size={32} />
            </div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
              Security Guard HRM
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {i18n.language === 'th'
                ? 'ระบบจัดการพนักงานรักษาความปลอดภัย'
                : 'Security Guard Management System'}
            </p>
          </div>

          {/* Login card */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-800 p-6">
            {/* Error message */}
            {displayError && (
              <Alert variant="error" className="mb-6" dismissible onDismiss={() => setLocalError(null)}>
                {displayError}
              </Alert>
            )}

            {/* Login form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                >
                  {i18n.language === 'th' ? 'อีเมล' : 'Email'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-neutral-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="
                      block w-full h-10 pl-10 pr-3
                      rounded-md border border-neutral-300 dark:border-neutral-700
                      bg-white dark:bg-neutral-800
                      text-neutral-900 dark:text-neutral-100
                      placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                      focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                      disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed
                      transition-colors
                    "
                    placeholder="admin@company.com"
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                >
                  {i18n.language === 'th' ? 'รหัสผ่าน' : 'Password'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-neutral-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="
                      block w-full h-10 pl-10 pr-10
                      rounded-md border border-neutral-300 dark:border-neutral-700
                      bg-white dark:bg-neutral-800
                      text-neutral-900 dark:text-neutral-100
                      placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                      focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                      disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed
                      transition-colors
                    "
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="
                      absolute inset-y-0 right-0 pr-3 flex items-center
                      text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300
                      transition-colors
                    "
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="
                  w-full h-10 mt-2
                  inline-flex items-center justify-center gap-2
                  rounded-md
                  bg-primary-500 hover:bg-primary-600 active:bg-primary-700
                  text-white font-medium
                  focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                "
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {i18n.language === 'th' ? 'กำลังเข้าสู่ระบบ...' : 'Logging in...'}
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    {i18n.language === 'th' ? 'เข้าสู่ระบบ' : 'Login'}
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-neutral-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white dark:bg-neutral-900 text-sm text-neutral-500">
                  {i18n.language === 'th' ? 'หรือ' : 'or'}
                </span>
              </div>
            </div>

            {/* LINE Login */}
            <button
              type="button"
              disabled={isLoading}
              className="
                w-full h-10
                inline-flex items-center justify-center gap-2
                rounded-md
                bg-[#00B900] hover:bg-[#00A000] active:bg-[#009000]
                text-white font-medium
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              {i18n.language === 'th' ? 'เข้าสู่ระบบด้วย LINE' : 'Login with LINE'}
            </button>

            {/* Register link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {i18n.language === 'th' ? 'ยังไม่มีบัญชี?' : "Don't have an account?"}{' '}
                <Link
                  to="/register"
                  className="
                    inline-flex items-center gap-1
                    text-primary-600 dark:text-primary-400
                    hover:text-primary-700 dark:hover:text-primary-300
                    font-medium
                  "
                >
                  <UserPlus size={14} />
                  {i18n.language === 'th' ? 'ลงทะเบียนบริษัท' : 'Register Company'}
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center mt-6 text-sm text-neutral-400 dark:text-neutral-500">
            © 2025 Security Guard HRM. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

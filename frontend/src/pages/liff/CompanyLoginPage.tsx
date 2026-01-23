import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import companyService from '../../services/company.service';
import type { PublicCompanyInfo } from '../../types/company.types';
import PhoneInput from '../../components/common/PhoneInput';
import PinInput from '../../components/auth/PinInput';
import NumericKeypad from '../../components/auth/NumericKeypad';
import { Loader2, Shield, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../components/feedback';

const CompanyLoginPage = () => {
    const { companySlug } = useParams<{ companySlug: string }>();
    const navigate = useNavigate();
    const { phoneLogin, isLoading: isAuthLoading, error: authError } = useAuth();
    const { t, i18n } = useTranslation();

    const [company, setCompany] = useState<PublicCompanyInfo | null>(null);
    const [isLoadingCompany, setIsLoadingCompany] = useState(true);
    const [companyError, setCompanyError] = useState<string | null>(null);

    const [phone, setPhone] = useState('');
    const [pin, setPin] = useState('');
    const [loginError, setLoginError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCompany = async () => {
            if (!companySlug) return;
            try {
                const data = await companyService.getPublicBySlug(companySlug);
                setCompany(data);
            } catch (error) {
                console.error('Failed to fetch company:', error);
                setCompanyError('Company not found');
            } finally {
                setIsLoadingCompany(false);
            }
        };

        fetchCompany();
    }, [companySlug]);

    const handlePinPress = (key: string) => {
        if (pin.length < 6) {
            setPin(prev => prev + key);
            setLoginError(null); // Clear error on new input
        }
    };

    const handlePinDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setLoginError(null);
    };

    const handleSubmit = async () => {
        if (!company || !companySlug) return;

        // Clear any previous errors
        setLoginError(null);

        // Basic validation
        const normalizedPhone = phone.replace(/\D/g, '');
        if (normalizedPhone.length < 9) {
            setLoginError(i18n.language === 'th' ? 'กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง' : 'Invalid phone number');
            return;
        }
        if (pin.length !== 6) {
            setLoginError(i18n.language === 'th' ? 'กรุณากรอกรหัส PIN 6 หลัก' : 'PIN must be 6 digits');
            return;
        }

        const success = await phoneLogin({
            companySlug,
            phone: normalizedPhone,
            pin,
        });

        if (success) {
            // Login succeeded - navigate to clock page
            navigate('/liff/clock');
        } else {
            // Login failed - clear PIN only for security (keep phone number)
            setPin('');
            // The authError from context will be displayed via displayError
            // No need for timeout - the error is set synchronously after phoneLogin returns
        }
    };

    // Auto-submit when PIN is 6 digits?
    // Maybe risky if they make mistake. Let's start with manual submit or a separate effect.
    // Given the keypad, usually auto-submit is nice.
    useEffect(() => {
        if (pin.length === 6 && phone.length >= 10 && !isAuthLoading && !loginError) {
            // Optional: auto-submit
            // handleSubmit(); 
            // Better to let user press Confirm or just have a Login button.
            // Plan 6.2 shows "Login" button.
        }
    }, [pin, phone]);

    // Check for "PIN not set" error to redirect to first-time PIN setup
    // This hook must be called BEFORE any early returns to maintain consistent hook order
    useEffect(() => {
        if (authError && (authError.includes('PIN not set') || authError.includes('ยังไม่ได้ตั้งรหัส PIN'))) {
            // Redirect to set-pin with the phone number in state
            // This allows the set-pin page to call the public setup-pin endpoint
            navigate(`/liff/${companySlug}/set-pin`, {
                state: {
                    phone: phone.replace(/\D/g, ''), // normalized phone
                    isFirstTimeSetup: true
                }
            });
        }
    }, [authError, companySlug, navigate, phone]);

    if (isLoadingCompany) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (companyError || !company) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center max-w-md w-full bg-white p-8 rounded-lg shadow-sm">
                    <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        {i18n.language === 'th' ? 'ไม่พบบริษัท' : 'Company Not Found'}
                    </h2>
                    <p className="text-gray-500 mb-6">
                        {i18n.language === 'th'
                            ? 'ไม่พบข้อมูลบริษัทตามลิงก์ที่ระบุ กรุณาตรวจสอบกับฝ่ายบุคคล'
                            : 'The company link is invalid. Please contact HR.'}
                    </p>
                </div>
            </div>
        );
    }

    // Use local or context error
    const displayError = loginError || authError;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                {/* Header / Logo */}
                <div className="text-center">
                    {company.logoUrl ? (
                        <img
                            src={company.logoUrl}
                            alt={company.name}
                            className="mx-auto h-20 w-auto object-contain rounded-md"
                        />
                    ) : (
                        <div className="mx-auto h-20 w-20 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
                            <Shield size={40} />
                        </div>
                    )}
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">
                        {company.name}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        {i18n.language === 'th' ? 'เข้าสู่ระบบพนักงาน' : 'Employee Login'}
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white py-8 px-4 shadow rounded-lg sm:px-10">
                    <div className="space-y-6">
                        {/* Error Alert */}
                        {displayError && (
                            <Alert variant="error" dismissible onDismiss={() => setLoginError(null)}>
                                {displayError}
                            </Alert>
                        )}

                        {/* Phone Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {i18n.language === 'th' ? 'เบอร์โทรศัพท์' : 'Phone Number'}
                            </label>
                            <PhoneInput
                                value={phone}
                                onChange={setPhone}
                                placeholder="08X-XXX-XXXX"
                                // System keyboard for phone
                                inputMode="numeric"
                                disabled={isAuthLoading}
                            />
                        </div>

                        {/* PIN Display */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                                {t('auth.pin', 'PIN Code')}
                            </label>
                            <div className="mb-4">
                                <PinInput
                                    value={pin}
                                    error={!!displayError && !loginError} // Only shake on auth error
                                />
                            </div>
                        </div>

                        {/* Keypad */}
                        <div className="mb-6">
                            <NumericKeypad
                                onPress={handlePinPress}
                                onDelete={handlePinDelete}
                                disabled={isAuthLoading}
                            />
                        </div>

                        {/* Login Button */}
                        <button
                            type="button" // Keypad handles PIN, this is explicit submit
                            onClick={handleSubmit}
                            disabled={isAuthLoading || pin.length !== 6 || phone.length < 10}
                            className={`
                                w-full flex justify-center items-center py-3 px-4 border border-transparent 
                                rounded-md shadow-sm text-sm font-medium text-white 
                                ${isAuthLoading || pin.length !== 6 || phone.length < 10
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                                }
                                transition-colors duration-200
                            `}
                        >
                            {isAuthLoading ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                    {i18n.language === 'th' ? 'กำลังตรวจสอบ...' : 'Verifying...'}
                                </>
                            ) : (
                                i18n.language === 'th' ? 'เข้าสู่ระบบ' : 'Login'
                            )}
                        </button>

                        {/* Forgot PIN Link */}
                        <div className="text-center mt-4">
                            <button
                                type="button"
                                onClick={() => navigate(`/liff/${companySlug}/forgot-pin`)}
                                className="text-sm font-medium text-primary-600 hover:text-primary-500"
                            >
                                {i18n.language === 'th' ? 'ลืมรหัส PIN?' : 'Forgot PIN?'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* LINE Login (Optional) */}
                {/* 
                <div className="mt-6">
                     <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-gray-50 text-gray-500">
                                {i18n.language === 'th' ? 'หรือ' : 'Or'}
                            </span>
                        </div>
                    </div>
                    
                    <div className="mt-6 text-center">
                        <Link to="/liff/login-select" ... >Login with LINE</Link>
                    </div>
                </div> 
                */}
            </div>
        </div>
    );
};

export default CompanyLoginPage;

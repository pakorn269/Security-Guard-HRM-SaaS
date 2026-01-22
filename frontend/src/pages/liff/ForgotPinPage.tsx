import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import authService from '../../services/auth.service';
import PhoneInput from '../../components/common/PhoneInput';
import { Loader2, ArrowLeft, KeyRound, CheckCircle2, MessageSquare, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../components/feedback';

type ForgotStep = 'request' | 'success';

const ForgotPinPage = () => {
    const { companySlug } = useParams<{ companySlug: string }>();
    const navigate = useNavigate();
    const { i18n } = useTranslation();

    const [step, setStep] = useState<ForgotStep>('request');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleRequestReset = async () => {
        if (!companySlug) return;
        const normalizedPhone = phone.replace(/\D/g, '');
        if (normalizedPhone.length < 9) {
            setError(i18n.language === 'th' ? 'กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง' : 'Invalid phone number');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await authService.requestPinReset(companySlug, normalizedPhone);
            setStep('success');
        } catch (err: any) {
            // Still show success to prevent enumeration
            setStep('success');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
            <div className="w-full max-w-md space-y-8">
                {/* Header */}
                <div className="flex items-center">
                    <button
                        onClick={() => {
                            if (step === 'success') setStep('request');
                            else navigate(-1);
                        }}
                        className="mr-4 text-gray-500 hover:text-gray-700"
                    >
                        <ArrowLeft />
                    </button>
                    <div className="flex-1 text-center pr-8">
                        <div className="mx-auto bg-primary-100 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                            <KeyRound className="text-primary-600 w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {i18n.language === 'th' ? 'ลืมรหัส PIN' : 'Forgot PIN'}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {step === 'request'
                                ? (i18n.language === 'th'
                                    ? 'ส่งคำขอรีเซ็ต PIN ไปยังผู้ดูแลระบบ'
                                    : 'Request PIN reset from administrator')
                                : (i18n.language === 'th'
                                    ? 'คำขอถูกส่งเรียบร้อยแล้ว'
                                    : 'Request submitted successfully')
                            }
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white py-8 px-4 shadow rounded-lg sm:px-10 flex flex-col items-center">
                    {error && (
                        <div className="w-full mb-6">
                            <Alert variant="error" dismissible onDismiss={() => setError(null)}>
                                {error}
                            </Alert>
                        </div>
                    )}

                    {step === 'request' ? (
                        <>
                            {/* Info Box */}
                            <div className="w-full mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex gap-3">
                                    <MessageSquare className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                    <div className="text-sm text-blue-800">
                                        {i18n.language === 'th' ? (
                                            <>
                                                <p className="font-medium mb-1">วิธีการรีเซ็ต PIN</p>
                                                <p>กรอกเบอร์โทรศัพท์แล้วกดส่งคำขอ ผู้ดูแลระบบจะรีเซ็ต PIN ให้ จากนั้นคุณสามารถตั้ง PIN ใหม่ได้</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-medium mb-1">How to reset your PIN</p>
                                                <p>Enter your phone number and submit the request. An administrator will reset your PIN, then you can set a new one.</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="w-full mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {i18n.language === 'th' ? 'เบอร์โทรศัพท์' : 'Phone Number'}
                                </label>
                                <PhoneInput
                                    value={phone}
                                    onChange={setPhone}
                                    placeholder="08X-XXX-XXXX"
                                    inputMode="numeric"
                                    disabled={isLoading}
                                />
                            </div>

                            <button
                                onClick={handleRequestReset}
                                disabled={phone.length < 10 || isLoading}
                                className={`
                                    w-full flex justify-center items-center py-3 px-4 border border-transparent 
                                    rounded-md shadow-sm text-sm font-medium text-white 
                                    ${phone.length < 10 || isLoading
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-primary-600 hover:bg-primary-700'
                                    }
                                    transition-colors duration-200
                                `}
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin w-5 h-5" />
                                ) : (
                                    i18n.language === 'th' ? 'ส่งคำขอรีเซ็ต PIN' : 'Request PIN Reset'
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Success State */}
                            <div className="text-center py-4">
                                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    {i18n.language === 'th' ? 'ส่งคำขอสำเร็จ!' : 'Request Submitted!'}
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    {i18n.language === 'th'
                                        ? 'ผู้ดูแลระบบจะได้รับคำขอของคุณ และจะรีเซ็ต PIN ให้โดยเร็ว กรุณารอการติดต่อกลับ'
                                        : 'The administrator has received your request and will reset your PIN shortly. Please wait for their confirmation.'}
                                </p>

                                {/* Contact Admin Info */}
                                <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                        <Phone className="w-4 h-4" />
                                        <span className="font-medium">
                                            {i18n.language === 'th' ? 'ต้องการความช่วยเหลือเร่งด่วน?' : 'Need urgent help?'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        {i18n.language === 'th'
                                            ? 'ติดต่อฝ่ายบุคคลของบริษัทโดยตรง'
                                            : 'Contact your company HR directly'}
                                    </p>
                                </div>

                                <button
                                    onClick={() => navigate(`/liff/${companySlug}/login`)}
                                    className="w-full py-3 px-4 border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50 transition-colors"
                                >
                                    {i18n.language === 'th' ? 'กลับไปหน้าเข้าสู่ระบบ' : 'Back to Login'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPinPage;

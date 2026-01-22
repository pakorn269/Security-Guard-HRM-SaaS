import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/auth.service';
import PinInput from '../../components/auth/PinInput';
import NumericKeypad from '../../components/auth/NumericKeypad';
import { Loader2, ArrowLeft, Lock, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../components/feedback';

type PinStep = 'current' | 'new' | 'confirm';

const SetPinPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { user, isLoading: isAuthLoading } = useAuth();
    const { i18n } = useTranslation();

    const resetToken = searchParams.get('resetToken');

    // Detect if we're in the LIFF profile change-pin flow
    const isFromProfile = useMemo(() => location.pathname === '/liff/change-pin', [location.pathname]);


    // Determine initial step
    // If we have a reset token OR user has no PIN set, start with 'new'
    // Otherwise, require current PIN
    const [step, setStep] = useState<PinStep>(() => {
        if (resetToken || (user && !user.hasPin)) {
            return 'new';
        }
        return 'current';
    });

    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getTitle = () => {
        switch (step) {
            case 'current': return i18n.language === 'th' ? 'กรอกรหัส PIN เดิม' : 'Enter Current PIN';
            case 'new': return i18n.language === 'th' ? 'ตั้งรหัส PIN ใหม่' : 'Enter New PIN';
            case 'confirm': return i18n.language === 'th' ? 'ยืนยันรหัส PIN ใหม่' : 'Confirm New PIN';
            default: return '';
        }
    };

    const getDescription = () => {
        switch (step) {
            case 'current': return i18n.language === 'th' ? 'เพื่อยืนยันตัวตนของคุณ' : 'To verify your identity';
            case 'new': return i18n.language === 'th' ? 'กำหนดรหัส PIN 6 หลัก' : 'Set a 6-digit PIN';
            case 'confirm': return i18n.language === 'th' ? 'กรอกรหัสเดิมอีกครั้ง' : 'Enter the same PIN again';
            default: return '';
        }
    };

    const handlePinPress = (key: string) => {
        setError(null);
        if (step === 'current') {
            if (currentPin.length < 6) setCurrentPin(prev => prev + key);
        } else if (step === 'new') {
            if (newPin.length < 6) setNewPin(prev => prev + key);
        } else if (step === 'confirm') {
            if (confirmPin.length < 6) setConfirmPin(prev => prev + key);
        }
    };

    const handlePinDelete = () => {
        setError(null);
        if (step === 'current') {
            setCurrentPin(prev => prev.slice(0, -1));
        } else if (step === 'new') {
            setNewPin(prev => prev.slice(0, -1));
        } else if (step === 'confirm') {
            setConfirmPin(prev => prev.slice(0, -1));
        }
    };

    const handleNext = async () => {
        if (step === 'current') {
            if (currentPin.length !== 6) return;
            // Ideally verify current PIN with backend here? 
            // Or just move to next step and send all at once.
            // Sending at once is better to avoid "checking PIN" attacks easily, usually.
            // But UX wise, knowing it's wrong early is nice.
            // Let's create 'new' step.
            setStep('new');
        } else if (step === 'new') {
            if (newPin.length !== 6) return;
            // Simple check: Don't allow same as current (optional)
            // if (newPin === currentPin) ...
            setStep('confirm');
        } else if (step === 'confirm') {
            if (confirmPin.length !== 6) return;
            if (newPin !== confirmPin) {
                setError(i18n.language === 'th' ? 'รหัส PIN ไม่ตรงกัน' : 'PINs do not match');
                setConfirmPin('');
                return;
            }
            await submitPin();
        }
    };

    const [isSuccess, setIsSuccess] = useState(false);

    const submitPin = async () => {
        setIsSubmitting(true);
        try {
            await authService.setPin({
                currentPin: step !== 'new' && !resetToken && user?.hasPin ? currentPin : undefined,
                newPin,
                resetToken: resetToken || undefined,
            });

            // Show success state briefly before navigation
            setIsSuccess(true);
            setTimeout(() => {
                if (isFromProfile) {
                    // Navigate back to profile if coming from profile page
                    navigate('/liff/profile');
                } else {
                    // Default navigation for company login flow
                    navigate('/liff/clock');
                }
            }, 1500);
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'Failed to set PIN';
            setError(message);
            // If error is "Invalid current PIN", go back to step 1
            if (message.includes('current PIN') || message.includes('เดิมไม่ถูกต้อง')) {
                setStep('current');
                setCurrentPin('');
                setNewPin('');
                setConfirmPin('');
            } else {
                // Reset current step
                setConfirmPin('');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle "Forgot PIN" click (authenticated)
    const handleForgotPin = async () => {
        if (!user) return;

        // Confirm before sending request
        const confirmed = window.confirm(
            i18n.language === 'th'
                ? 'คุณต้องการส่งคำขอรีเซ็ต PIN ไปยังผู้ดูแลระบบใช่หรือไม่?'
                : 'Do you want to request a PIN reset from the administrator?'
        );

        if (!confirmed) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const message = await authService.requestPinResetMe();
            // Show success alert or toast?
            // For now, let's use the success state of the page but customize description
            // Or just alert and stay on page?
            // Let's replace the content with success message similar to submitPin success
            alert(message); // Simple alert for now as per design constraints or use a Toast if available
            // Actually, let's reuse the success view of the page maybe?
            // Or just step back?

            // Actually, if they request reset, they can't proceed with "Change PIN".
            // So we should show a message and maybe navigate back?

            navigate('/liff/profile');
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Failed to request reset');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getCurrentValue = () => {
        if (step === 'current') return currentPin;
        if (step === 'new') return newPin;
        return confirmPin;
    };

    // Auto-advance checks
    // Using effect to advance slightly delayed for better UX
    // But be careful with "enter" key vs auto
    // With keypad, manual "Next" or auto? 
    // Plan 6.4 said "Disable input while submitting".
    // Let's add a "Continue" button for clarity, or auto. 
    // Usually mobile apps auto-advance on PIN.
    /*
    useEffect(() => {
        const val = getCurrentValue();
        if (val.length === 6) {
             // Maybe wait 300ms then advance?
             // handleNext();
        }
    }, [currentPin, newPin, confirmPin]);
    */
    // Let's stick to explicit button for critical actions to avoid mistakes

    if (isAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
            <div className="w-full max-w-md space-y-8">
                {/* Header */}
                <div className="flex items-center">
                    {(step !== 'current' && !((resetToken || !user?.hasPin) && step === 'new')) && (
                        <button
                            onClick={() => {
                                if (step === 'confirm') setStep('new');
                                else if (step === 'new') setStep('current');
                            }}
                            className="mr-4 text-gray-500 hover:text-gray-700"
                        >
                            <ArrowLeft />
                        </button>
                    )}
                    <div className="flex-1 text-center pr-8">
                        <div className="mx-auto bg-primary-100 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                            <Lock className="text-primary-600 w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {getTitle()}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {getDescription()}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white py-8 px-4 shadow rounded-lg sm:px-10 flex flex-col items-center">
                    {isSuccess ? (
                        /* Success State */
                        <div className="text-center py-8">
                            <div className="mx-auto bg-success-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="text-success-600 w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {i18n.language === 'th' ? 'เปลี่ยนรหัส PIN สำเร็จ' : 'PIN Changed Successfully'}
                            </h3>
                            <p className="text-gray-500 text-sm">
                                {i18n.language === 'th' ? 'กำลังเปลี่ยนเส้นทาง...' : 'Redirecting...'}
                            </p>
                        </div>
                    ) : (
                        /* PIN Input Form */
                        <>
                            {error && (
                                <div className="w-full mb-6">
                                    <Alert variant="error" dismissible onDismiss={() => setError(null)}>
                                        {error}
                                    </Alert>
                                </div>
                            )}

                            <div className="mb-8">
                                <PinInput
                                    value={getCurrentValue()}
                                    error={!!error}
                                />
                            </div>

                            <div className="mb-6">
                                <NumericKeypad
                                    onPress={handlePinPress}
                                    onDelete={handlePinDelete}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Forgot PIN Link - Only on "current" step */}
                            {step === 'current' && (
                                <div className="mb-6 text-center">
                                    <button
                                        onClick={handleForgotPin}
                                        disabled={isSubmitting}
                                        className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                                    >
                                        {i18n.language === 'th' ? 'ลืมรหัส PIN ปัจจุบัน?' : 'Forgot current PIN?'}
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handleNext}
                                disabled={getCurrentValue().length !== 6 || isSubmitting}
                                className={`
                                    w-full flex justify-center items-center py-3 px-4 border border-transparent 
                                    rounded-md shadow-sm text-sm font-medium text-white 
                                    ${getCurrentValue().length !== 6 || isSubmitting
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-primary-600 hover:bg-primary-700'
                                    }
                                    transition-colors duration-200
                                `}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="animate-spin w-5 h-5" />
                                ) : (
                                    step === 'confirm'
                                        ? (i18n.language === 'th' ? 'ยืนยัน' : 'Confirm')
                                        : (i18n.language === 'th' ? 'ถัดไป' : 'Next')
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SetPinPage;

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Send, LinkIcon, Unlink, Bell, Clock, History, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Card, CardHeader, LoadingSpinner, Modal, ModalFooter, Input } from '../../components/common';
import { employeeService, type EmployeeWithUser } from '../../services/employee.service';
import { lineService, type LineNotificationPreferences, type LineMessageHistory } from '../../services/line.service';
import { lineLinkService } from '../../services/line-link.service';
import type { Certification } from '../../types/employee.types';
import EmployeeFormModal from './EmployeeFormModal';
import CertificationFormModal from './CertificationFormModal';
import LineMessageModal from './LineMessageModal';
import UserAccountFormModal from './UserAccountFormModal';

// Status badge component
function StatusBadge({ status }: { status: string }) {
    const statusStyles: Record<string, string> = {
        active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        on_leave: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        terminated: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };

    const statusLabels: Record<string, string> = {
        active: 'Active',
        on_leave: 'On Leave',
        terminated: 'Terminated',
    };

    return (
        <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusStyles[status] || statusStyles.active}`}
        >
            {statusLabels[status] || status}
        </span>
    );
}

// Certification status badge
function CertStatusBadge({ status }: { status: string }) {
    const statusStyles: Record<string, string> = {
        valid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        expiring_soon: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };

    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyles[status] || statusStyles.valid}`}
        >
            {status.replace('_', ' ')}
        </span>
    );
}

// Notification toggle component
function NotificationToggle({
    label,
    description,
    checked,
    onChange,
    disabled,
}: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative mt-0.5">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={disabled}
                    className="sr-only peer"
                />
                <div className={`w-9 h-5 rounded-full transition-colors ${checked
                    ? 'bg-primary-500'
                    : 'bg-neutral-300 dark:bg-neutral-600'
                    } ${disabled ? 'opacity-50' : ''}`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    {label}
                </p>
                {description && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {description}
                    </p>
                )}
            </div>
        </label>
    );
}

export default function EmployeeDetailPage() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [employee, setEmployee] = useState<EmployeeWithUser | null>(null);
    const [certifications, setCertifications] = useState<Certification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCertModalOpen, setIsCertModalOpen] = useState(false);
    const [editingCertification, setEditingCertification] = useState<Certification | null>(null);
    const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
    const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split('T')[0]);
    const [terminationNotes, setTerminationNotes] = useState('');
    const [isTerminating, setIsTerminating] = useState(false);
    const [isUserAccountModalOpen, setIsUserAccountModalOpen] = useState(false);
    const [isLineMessageModalOpen, setIsLineMessageModalOpen] = useState(false);
    const [isForceUnlinkModalOpen, setIsForceUnlinkModalOpen] = useState(false);
    const [unlinkReason, setUnlinkReason] = useState('');
    const [isUnlinking, setIsUnlinking] = useState(false);

    // LINE Notification Preferences
    const [notificationPrefs, setNotificationPrefs] = useState<LineNotificationPreferences | null>(null);
    const [isLoadingPrefs, setIsLoadingPrefs] = useState(false);
    const [isSavingPrefs, setIsSavingPrefs] = useState(false);

    // LINE Message History
    const [messageHistory, setMessageHistory] = useState<LineMessageHistory[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [historyExpanded, setHistoryExpanded] = useState(false);
    const [historyTotal, setHistoryTotal] = useState(0);

    useEffect(() => {
        if (id) {
            fetchEmployee();
            fetchCertifications();
        }
    }, [id]);

    // Fetch notification preferences when employee with LINE is loaded
    useEffect(() => {
        if (employee?.user?.isLineLinked && id) {
            fetchNotificationPrefs();
            fetchMessageHistory();
        }
    }, [employee?.user?.isLineLinked, id]);

    const fetchEmployee = async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const data = await employeeService.getById(id);
            setEmployee(data);
        } catch (error) {
            console.error('Failed to fetch employee:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCertifications = async () => {
        if (!id) return;
        try {
            const data = await employeeService.getCertifications(id);
            setCertifications(data);
        } catch (error) {
            console.error('Failed to fetch certifications:', error);
        }
    };

    const fetchNotificationPrefs = async () => {
        if (!id) return;
        setIsLoadingPrefs(true);
        try {
            const data = await lineService.getEmployeePreferences(id);
            setNotificationPrefs(data);
        } catch (error) {
            console.error('Failed to fetch notification preferences:', error);
        } finally {
            setIsLoadingPrefs(false);
        }
    };

    const fetchMessageHistory = async () => {
        if (!id) return;
        setIsLoadingHistory(true);
        try {
            const response = await lineService.getEmployeeHistory(id, { pageSize: 10 });
            setMessageHistory(response.data || []);
            setHistoryTotal(response.pagination?.total || 0);
        } catch (error) {
            console.error('Failed to fetch message history:', error);
            setMessageHistory([]);
            setHistoryTotal(0);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleToggleNotificationPref = async (key: keyof LineNotificationPreferences, value: boolean) => {
        if (!id || !notificationPrefs) return;
        setIsSavingPrefs(true);
        try {
            const updated = await lineService.updateEmployeePreferences(id, { [key]: value });
            setNotificationPrefs(updated);
        } catch (error) {
            console.error('Failed to update notification preference:', error);
        } finally {
            setIsSavingPrefs(false);
        }
    };

    const handleUpdateQuietHours = async (enabled: boolean, start?: string, end?: string) => {
        if (!id || !notificationPrefs) return;
        setIsSavingPrefs(true);
        try {
            const updates: Record<string, unknown> = { quietHoursEnabled: enabled };
            if (start) updates.quietHoursStart = start;
            if (end) updates.quietHoursEnd = end;
            const updated = await lineService.updateEmployeePreferences(id, updates);
            setNotificationPrefs(updated);
        } catch (error) {
            console.error('Failed to update quiet hours:', error);
        } finally {
            setIsSavingPrefs(false);
        }
    };

    const handleTerminate = async () => {
        if (!employee) return;
        setIsTerminating(true);
        try {
            await employeeService.terminate(employee.id, terminationDate, terminationNotes);
            setIsTerminateModalOpen(false);
            fetchEmployee();
        } catch (error) {
            console.error('Failed to terminate employee:', error);
        } finally {
            setIsTerminating(false);
        }
    };

    const handleReactivate = async () => {
        if (!employee) return;
        try {
            await employeeService.reactivate(employee.id);
            fetchEmployee();
        } catch (error) {
            console.error('Failed to reactivate employee:', error);
        }
    };

    const handleAddCertification = () => {
        setEditingCertification(null);
        setIsCertModalOpen(true);
    };

    const handleEditCertification = (cert: Certification) => {
        setEditingCertification(cert);
        setIsCertModalOpen(true);
    };

    const handleDeleteCertification = async (certId: string) => {
        if (!employee || !window.confirm(t('certifications.confirmDelete', 'Are you sure you want to delete this certification?'))) {
            return;
        }
        try {
            await employeeService.deleteCertification(employee.id, certId);
            fetchCertifications();
        } catch (error) {
            console.error('Failed to delete certification:', error);
        }
    };

    const handleResetPin = async () => {
        if (!employee) return;
        if (!window.confirm('Are you sure you want to reset the PIN for this employee? The employee will need to set a new PIN on next login.')) {
            return;
        }

        try {
            await employeeService.resetPin(employee.id);
            alert('PIN has been reset successfully.');
            fetchEmployee(); // Refresh to show cleared status
        } catch (error) {
            console.error('Failed to reset PIN:', error);
            alert('Failed to reset PIN.');
        }
    };

    const handleForceUnlink = async () => {
        if (!employee?.user?.id || !unlinkReason.trim()) return;

        setIsUnlinking(true);
        try {
            const result = await lineLinkService.forceUnlink({
                targetUserId: employee.user.id,
                reason: unlinkReason,
            });

            setIsForceUnlinkModalOpen(false);
            setUnlinkReason('');
            fetchEmployee(); // Refresh to show unlinked status

            alert(`LINE account unlinked successfully. ${result.revokedSessions} session(s) revoked.`);
        } catch (error) {
            console.error('Failed to force unlink:', error);
            alert('Failed to unlink LINE account.');
        } finally {
            setIsUnlinking(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <p className="text-surface-500 dark:text-surface-400 mb-4">
                    {t('employees.notFound', 'Employee not found')}
                </p>
                <Button onClick={() => navigate('/employees')} variant="outline">
                    {t('employees.backToList', 'Back to Employees')}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/employees')}
                        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                            {employee.fullName}
                        </h1>
                        <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {employee.employeeCode} {employee.fullNameTh && `• ${employee.fullNameTh}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
                        {t('common.edit', 'Edit')}
                    </Button>
                    {employee.status === 'terminated' ? (
                        <Button variant="secondary" onClick={handleReactivate}>
                            {t('employees.reactivate', 'Reactivate')}
                        </Button>
                    ) : (
                        <Button variant="danger" onClick={() => setIsTerminateModalOpen(true)}>
                            {t('employees.terminate', 'Terminate')}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Employee Info */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader
                            title={t('employees.personalInfo', 'Personal Information')}
                            action={<StatusBadge status={employee.status} />}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                    {t('employees.hireDate', 'Hire Date')}
                                </label>
                                <p className="text-neutral-900 dark:text-white mt-1">
                                    {new Date(employee.hireDate).toLocaleDateString()}
                                </p>
                            </div>
                            {employee.terminationDate && (
                                <div>
                                    <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                        {t('employees.terminationDate', 'Termination Date')}
                                    </label>
                                    <p className="text-neutral-900 dark:text-white mt-1">
                                        {new Date(employee.terminationDate).toLocaleDateString()}
                                    </p>
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                    {t('employees.phone', 'Phone')}
                                </label>
                                <p className="text-neutral-900 dark:text-white mt-1">
                                    {employee.phone || '-'}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                    {t('employees.email', 'Email')}
                                </label>
                                <p className="text-neutral-900 dark:text-white mt-1">
                                    {employee.email || '-'}
                                </p>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                    {t('employees.address', 'Address')}
                                </label>
                                <p className="text-neutral-900 dark:text-white mt-1">
                                    {employee.address || '-'}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <CardHeader title={t('employees.emergencyContact', 'Emergency Contact')} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                    {t('employees.contactName', 'Contact Name')}
                                </label>
                                <p className="text-neutral-900 dark:text-white mt-1">
                                    {employee.emergencyContactName || '-'}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                    {t('employees.contactPhone', 'Contact Phone')}
                                </label>
                                <p className="text-neutral-900 dark:text-white mt-1">
                                    {employee.emergencyContactPhone || '-'}
                                </p>
                            </div>
                        </div>
                    </Card>

                    {employee.notes && (
                        <Card>
                            <CardHeader title={t('employees.notes', 'Notes')} />
                            <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                                {employee.notes}
                            </p>
                        </Card>
                    )}

                    {/* LINE Message History */}
                    {employee.user?.isLineLinked && (
                        <Card>
                            <CardHeader
                                title={t('line.messageHistory', 'LINE Message History')}
                                action={
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-surface-500 dark:text-surface-400">
                                            {historyTotal} {t('line.messages', 'messages')}
                                        </span>
                                        <History size={16} className="text-surface-400" />
                                    </div>
                                }
                            />
                            {isLoadingHistory ? (
                                <div className="flex justify-center py-8">
                                    <LoadingSpinner size="sm" />
                                </div>
                            ) : messageHistory && messageHistory.length > 0 ? (
                                <div className="space-y-3">
                                    {(historyExpanded ? messageHistory : messageHistory.slice(0, 5)).map((msg) => (
                                        <div
                                            key={msg.id}
                                            className="p-3 rounded-lg bg-surface-50 dark:bg-surface-700/50 border border-surface-200 dark:border-surface-600"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-surface-900 dark:text-white line-clamp-2">
                                                        {msg.message}
                                                    </p>
                                                    {msg.templateName && (
                                                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                                                            {t('line.template', 'Template')}: {msg.templateName}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex-shrink-0">
                                                    {msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'read' ? (
                                                        <CheckCircle size={16} className="text-green-500" />
                                                    ) : (
                                                        <XCircle size={16} className="text-red-500" />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-2 text-xs text-surface-500 dark:text-surface-400">
                                                <span>
                                                    {msg.sentByName || t('line.system', 'System')}
                                                </span>
                                                <span>
                                                    {new Date(msg.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                            {msg.status === 'failed' && msg.errorMessage && (
                                                <p className="text-xs text-red-500 mt-1">
                                                    {msg.errorMessage}
                                                </p>
                                            )}
                                        </div>
                                    ))}

                                    {messageHistory.length > 5 && (
                                        <button
                                            onClick={() => setHistoryExpanded(!historyExpanded)}
                                            className="w-full flex items-center justify-center gap-1 py-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                                        >
                                            {historyExpanded ? (
                                                <>
                                                    <ChevronUp size={16} />
                                                    {t('common.showLess', 'Show less')}
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown size={16} />
                                                    {t('line.showMore', `Show ${messageHistory.length - 5} more`)}
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <History size={32} className="text-surface-300 dark:text-surface-600 mx-auto mb-2" />
                                    <p className="text-surface-500 dark:text-surface-400 text-sm">
                                        {t('line.noHistory', 'No messages sent yet')}
                                    </p>
                                </div>
                            )}
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* User Account */}
                    <Card>
                        <CardHeader title={t('employees.userAccount', 'User Account')} />
                        {employee.user ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${employee.user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                            {employee.user.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-neutral-900 dark:text-white">
                                        {employee.user.email}
                                    </p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        Role: {employee.user.role}
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                                    <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                                        PIN Status
                                    </h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-neutral-600 dark:text-neutral-400">Status:</span>
                                            <span className={employee.user.hasPin ? 'text-green-600' : 'text-yellow-600'}>
                                                {employee.user.hasPin ? 'Set' : 'Not Set'}
                                            </span>
                                        </div>
                                        {employee.user.isPinLocked && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-neutral-600 dark:text-neutral-400">Locked:</span>
                                                <span className="text-red-600 font-medium">Yes</span>
                                            </div>
                                        )}
                                        {employee.user.failedPinAttempts > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-neutral-600 dark:text-neutral-400">Failed Attempts:</span>
                                                <span className="text-orange-600">{employee.user.failedPinAttempts}</span>
                                            </div>
                                        )}

                                        <div className="pt-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                onClick={handleResetPin}
                                            >
                                                Reset PIN
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-3">
                                    {t('employees.noUserAccount', 'No user account linked')}
                                </p>
                                <Button size="sm" variant="outline" onClick={() => setIsUserAccountModalOpen(true)}>
                                    {t('employees.createAccount', 'Create Account')}
                                </Button>
                            </div>
                        )}
                    </Card>

                    {/* LINE Integration */}
                    <Card>
                        <CardHeader
                            title={t('line.integration', 'LINE Integration')}
                            action={
                                employee.user?.isLineLinked && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setIsLineMessageModalOpen(true)}
                                    >
                                        <Send size={14} />
                                    </Button>
                                )
                            }
                        />
                        {employee.user?.isLineLinked ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    {employee.user.linePictureUrl ? (
                                        <img
                                            src={employee.user.linePictureUrl}
                                            alt={employee.user.lineDisplayName || 'LINE'}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                            <MessageCircle size={24} className="text-green-600 dark:text-green-400" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium text-neutral-900 dark:text-white">
                                            {employee.user.lineDisplayName || 'LINE User'}
                                        </p>
                                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                                            <LinkIcon size={12} />
                                            <span>{t('line.linked', 'Linked')}</span>
                                        </div>
                                    </div>
                                </div>

                                {employee.user.lineLinkedAt && (
                                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                        {t('line.linkedAt', 'Linked on')}: {new Date(employee.user.lineLinkedAt).toLocaleDateString()}
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        className="flex-1"
                                        leftIcon={<Send size={14} />}
                                        onClick={() => setIsLineMessageModalOpen(true)}
                                    >
                                        {t('line.sendMessage', 'Send LINE Message')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="danger"
                                        onClick={() => setIsForceUnlinkModalOpen(true)}
                                        title="Force unlink LINE account"
                                    >
                                        <Unlink size={14} />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center mx-auto mb-3">
                                    <Unlink size={20} className="text-neutral-400" />
                                </div>
                                <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                                    {employee.user
                                        ? t('line.notLinked', 'LINE account not linked')
                                        : t('line.noUserAccount', 'No user account to link LINE')}
                                </p>
                                {employee.user && (
                                    <p className="text-xs text-neutral-400 mt-2">
                                        {t('line.linkInstructions', 'Employee can link LINE via LIFF app')}
                                    </p>
                                )}
                            </div>
                        )}
                    </Card>

                    {/* LINE Notification Preferences */}
                    {employee.user?.isLineLinked && (
                        <Card>
                            <CardHeader
                                title={t('line.notificationPrefs', 'Notification Preferences')}
                                action={
                                    <Bell size={16} className="text-neutral-400" />
                                }
                            />
                            {isLoadingPrefs ? (
                                <div className="flex justify-center py-4">
                                    <LoadingSpinner size="sm" />
                                </div>
                            ) : notificationPrefs ? (
                                <div className="space-y-4">
                                    {/* Notification Toggles */}
                                    <div className="space-y-3">
                                        <NotificationToggle
                                            label={t('line.prefs.shiftPublished', 'Shift Published')}
                                            description={t('line.prefs.shiftPublishedDesc', 'When new shifts are published')}
                                            checked={notificationPrefs.shiftPublished}
                                            onChange={(v) => handleToggleNotificationPref('shiftPublished', v)}
                                            disabled={isSavingPrefs}
                                        />
                                        <NotificationToggle
                                            label={t('line.prefs.shiftChanged', 'Shift Changed')}
                                            description={t('line.prefs.shiftChangedDesc', 'When shifts are modified')}
                                            checked={notificationPrefs.shiftChanged}
                                            onChange={(v) => handleToggleNotificationPref('shiftChanged', v)}
                                            disabled={isSavingPrefs}
                                        />
                                        <NotificationToggle
                                            label={t('line.prefs.shiftReminder', 'Shift Reminder')}
                                            description={t('line.prefs.shiftReminderDesc', 'Before shift starts')}
                                            checked={notificationPrefs.shiftReminder}
                                            onChange={(v) => handleToggleNotificationPref('shiftReminder', v)}
                                            disabled={isSavingPrefs}
                                        />
                                        <NotificationToggle
                                            label={t('line.prefs.leaveApproved', 'Leave Approved')}
                                            description={t('line.prefs.leaveApprovedDesc', 'When leave is approved')}
                                            checked={notificationPrefs.leaveApproved}
                                            onChange={(v) => handleToggleNotificationPref('leaveApproved', v)}
                                            disabled={isSavingPrefs}
                                        />
                                        <NotificationToggle
                                            label={t('line.prefs.leaveRejected', 'Leave Rejected')}
                                            description={t('line.prefs.leaveRejectedDesc', 'When leave is rejected')}
                                            checked={notificationPrefs.leaveRejected}
                                            onChange={(v) => handleToggleNotificationPref('leaveRejected', v)}
                                            disabled={isSavingPrefs}
                                        />
                                        <NotificationToggle
                                            label={t('line.prefs.announcements', 'Announcements')}
                                            description={t('line.prefs.announcementsDesc', 'Company announcements')}
                                            checked={notificationPrefs.announcements}
                                            onChange={(v) => handleToggleNotificationPref('announcements', v)}
                                            disabled={isSavingPrefs}
                                        />
                                    </div>

                                    {/* Quiet Hours */}
                                    <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock size={14} className="text-neutral-400" />
                                            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                                {t('line.prefs.quietHours', 'Quiet Hours')}
                                            </span>
                                        </div>
                                        <NotificationToggle
                                            label={t('line.prefs.enableQuietHours', 'Enable Quiet Hours')}
                                            description={t('line.prefs.quietHoursDesc', 'No notifications during these hours')}
                                            checked={notificationPrefs.quietHoursEnabled}
                                            onChange={(v) => handleUpdateQuietHours(v)}
                                            disabled={isSavingPrefs}
                                        />
                                        {notificationPrefs.quietHoursEnabled && (
                                            <div className="flex items-center gap-2 mt-2 ml-7">
                                                <input
                                                    type="time"
                                                    value={notificationPrefs.quietHoursStart}
                                                    onChange={(e) => handleUpdateQuietHours(true, e.target.value, notificationPrefs.quietHoursEnd)}
                                                    className="px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                                                    disabled={isSavingPrefs}
                                                />
                                                <span className="text-xs text-neutral-500 dark:text-neutral-400">-</span>
                                                <input
                                                    type="time"
                                                    value={notificationPrefs.quietHoursEnd}
                                                    onChange={(e) => handleUpdateQuietHours(true, notificationPrefs.quietHoursStart, e.target.value)}
                                                    className="px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                                                    disabled={isSavingPrefs}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-center text-neutral-500 dark:text-neutral-400 text-sm py-4">
                                    {t('line.prefs.unavailable', 'Preferences unavailable')}
                                </p>
                            )}
                        </Card>
                    )}

                    {/* Certifications */}
                    <Card>
                        <CardHeader
                            title={t('certifications.title', 'Certifications')}
                            action={
                                <Button size="sm" variant="ghost" onClick={handleAddCertification}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </Button>
                            }
                        />
                        {certifications.length > 0 ? (
                            <div className="space-y-3">
                                {certifications.map((cert) => (
                                    <div
                                        key={cert.id}
                                        className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700/50 group"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-medium text-neutral-900 dark:text-white text-sm">
                                                    {cert.type}
                                                </p>
                                                {cert.licenseNumber && (
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                        #{cert.licenseNumber}
                                                    </p>
                                                )}
                                            </div>
                                            <CertStatusBadge status={cert.status} />
                                        </div>
                                        {cert.expiryDate && (
                                            <p className="text-xs text-surface-500 dark:text-surface-400 mt-2">
                                                Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEditCertification(cert)}
                                                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCertification(cert.id)}
                                                className="text-xs text-red-600 dark:text-red-400 hover:underline"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-surface-500 dark:text-surface-400 text-sm py-4">
                                {t('certifications.none', 'No certifications added')}
                            </p>
                        )}
                    </Card>
                </div>
            </div >

            {/* Edit Employee Modal */}
            < EmployeeFormModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)
                }
                onSuccess={() => {
                    setIsEditModalOpen(false);
                    fetchEmployee();
                }}
                employee={employee}
            />

            {/* Certification Form Modal */}
            {
                employee && (
                    <CertificationFormModal
                        isOpen={isCertModalOpen}
                        onClose={() => {
                            setIsCertModalOpen(false);
                            setEditingCertification(null);
                        }}
                        onSuccess={() => {
                            setIsCertModalOpen(false);
                            setEditingCertification(null);
                            fetchCertifications();
                        }}
                        employeeId={employee.id}
                        certification={editingCertification}
                    />
                )
            }

            {/* Terminate Modal */}
            <Modal
                isOpen={isTerminateModalOpen}
                onClose={() => setIsTerminateModalOpen(false)}
                title={t('employees.terminateEmployee', 'Terminate Employee')}
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-surface-600 dark:text-surface-400">
                        {t('employees.terminateConfirm', 'Are you sure you want to terminate this employee? This will deactivate their user account if one exists.')}
                    </p>
                    <Input
                        label={t('employees.terminationDate', 'Termination Date')}
                        type="date"
                        value={terminationDate}
                        onChange={(e) => setTerminationDate(e.target.value)}
                        required
                    />
                    <Input
                        label={t('employees.terminationNotes', 'Notes (optional)')}
                        value={terminationNotes}
                        onChange={(e) => setTerminationNotes(e.target.value)}
                    />
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsTerminateModalOpen(false)}>
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button variant="danger" onClick={handleTerminate} isLoading={isTerminating}>
                        {t('employees.terminate', 'Terminate')}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* LINE Message Modal */}
            <LineMessageModal
                isOpen={isLineMessageModalOpen}
                onClose={() => setIsLineMessageModalOpen(false)}
                employee={employee}
            />

            {/* Force Unlink Modal */}
            <Modal
                isOpen={isForceUnlinkModalOpen}
                onClose={() => {
                    setIsForceUnlinkModalOpen(false);
                    setUnlinkReason('');
                }}
                title={t('line.forceUnlink', 'Force Unlink LINE Account')}
                size="sm"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                            ⚠️ {t('line.forceUnlinkWarning', 'Warning: This action will immediately:')}
                        </p>
                        <ul className="mt-2 text-sm text-red-700 dark:text-red-300 list-disc list-inside space-y-1">
                            <li>{t('line.forceUnlinkEffect1', 'Unlink the LINE account from this employee')}</li>
                            <li>{t('line.forceUnlinkEffect2', 'Revoke all active LINE sessions')}</li>
                            <li>{t('line.forceUnlinkEffect3', 'Deactivate the guard account')}</li>
                            <li>{t('line.forceUnlinkEffect4', 'Block immediate access to all features')}</li>
                        </ul>
                    </div>

                    <Input
                        label={t('line.unlinkReason', 'Reason for unlinking (required)')}
                        value={unlinkReason}
                        onChange={(e) => setUnlinkReason(e.target.value)}
                        placeholder={t('line.unlinkReasonPlaceholder', 'e.g., Employee terminated, Lost device, Security breach')}
                        required
                        minLength={10}
                    />

                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {t('line.forceUnlinkNote', 'This action will be logged in the audit trail with your user ID, IP address, and timestamp.')}
                    </p>
                </div>
                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setIsForceUnlinkModalOpen(false);
                            setUnlinkReason('');
                        }}
                    >
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleForceUnlink}
                        isLoading={isUnlinking}
                        disabled={!unlinkReason.trim() || unlinkReason.length < 10}
                    >
                        {t('line.confirmForceUnlink', 'Confirm Force Unlink')}
                    </Button>
                </ModalFooter>
            </Modal>

            {isUserAccountModalOpen && (
                <UserAccountFormModal
                    isOpen={isUserAccountModalOpen}
                    onClose={() => setIsUserAccountModalOpen(false)}
                    onSuccess={() => fetchEmployee()}
                    employeeId={employee.id}
                    employeeEmail={employee.email}
                />
            )}
        </div >
    );
}

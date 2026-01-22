import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Send, AlertCircle, CheckCircle, Users, FileText, ChevronDown } from 'lucide-react';
import { Button, Modal, ModalFooter, LoadingSpinner } from '../../components/common';
import { employeeService, type EmployeeWithUser } from '../../services/employee.service';
import { lineService, type LineMessageTemplate } from '../../services/line.service';
import type { BulkLineMessageResponse } from '../../types/employee.types';

interface LineMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee?: EmployeeWithUser | null;
    selectedEmployees?: EmployeeWithUser[];
    onSuccess?: () => void;
}

export default function LineMessageModal({
    isOpen,
    onClose,
    employee,
    selectedEmployees,
    onSuccess,
}: LineMessageModalProps) {
    const { t, i18n } = useTranslation();
    const [message, setMessage] = useState('');
    const [messageTh, setMessageTh] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{
        type: 'success' | 'error' | 'partial';
        message: string;
        details?: BulkLineMessageResponse;
    } | null>(null);

    // Template state
    const [templates, setTemplates] = useState<LineMessageTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<LineMessageTemplate | null>(null);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

    const isBulk = !employee && selectedEmployees && selectedEmployees.length > 0;
    const targetCount = isBulk ? selectedEmployees.length : 1;
    const lineLinkedCount = isBulk
        ? selectedEmployees.filter((e) => e.user?.isLineLinked).length
        : employee?.user?.isLineLinked
          ? 1
          : 0;

    // Load templates when modal opens
    useEffect(() => {
        if (isOpen) {
            loadTemplates();
        }
    }, [isOpen]);

    const loadTemplates = async () => {
        setIsLoadingTemplates(true);
        try {
            const data = await lineService.listTemplates({ isActive: true });
            setTemplates(data);
        } catch (error) {
            console.error('Failed to load templates:', error);
        } finally {
            setIsLoadingTemplates(false);
        }
    };

    const handleTemplateSelect = (template: LineMessageTemplate) => {
        setSelectedTemplate(template);
        setMessage(template.message);
        setMessageTh(template.messageTh || '');
        setShowTemplateDropdown(false);
    };

    const handleClearTemplate = () => {
        setSelectedTemplate(null);
        setMessage('');
        setMessageTh('');
    };

    const handleSend = async () => {
        if (!message.trim()) return;

        setIsLoading(true);
        setResult(null);

        try {
            if (isBulk && selectedEmployees) {
                // Bulk message
                const response = await employeeService.sendBulkLineMessage({
                    employeeIds: selectedEmployees.map((e) => e.id),
                    message: message.trim(),
                    messageTh: messageTh.trim() || undefined,
                });

                if (response.failureCount === 0) {
                    setResult({
                        type: 'success',
                        message: t(
                            'line.bulkSendSuccess',
                            `Successfully sent message to ${response.successCount} employees`
                        ),
                        details: response,
                    });
                } else if (response.successCount === 0) {
                    setResult({
                        type: 'error',
                        message: t('line.bulkSendFailed', 'Failed to send message to all employees'),
                        details: response,
                    });
                } else {
                    setResult({
                        type: 'partial',
                        message: t(
                            'line.bulkSendPartial',
                            `Sent to ${response.successCount}, failed for ${response.failureCount}`
                        ),
                        details: response,
                    });
                }
            } else if (employee) {
                // Single message
                const response = await employeeService.sendLineMessage(employee.id, {
                    message: message.trim(),
                    messageTh: messageTh.trim() || undefined,
                });

                if (response.success) {
                    setResult({
                        type: 'success',
                        message: t('line.sendSuccess', 'Message sent successfully'),
                    });
                } else {
                    setResult({
                        type: 'error',
                        message: response.error || t('line.sendFailed', 'Failed to send message'),
                    });
                }
            }

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            setResult({
                type: 'error',
                message: error instanceof Error ? error.message : t('line.sendFailed', 'Failed to send message'),
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setMessage('');
        setMessageTh('');
        setResult(null);
        setSelectedTemplate(null);
        onClose();
    };

    const canSend = message.trim().length > 0 && lineLinkedCount > 0;

    // Get category display name
    const getCategoryName = (category: string) => {
        const categoryNames: Record<string, string> = {
            shift_reminder: t('line.category.shiftReminder', 'Shift Reminder'),
            shift_change: t('line.category.shiftChange', 'Shift Change'),
            leave_approved: t('line.category.leaveApproved', 'Leave Approved'),
            leave_rejected: t('line.category.leaveRejected', 'Leave Rejected'),
            attendance_late: t('line.category.attendanceLate', 'Late Arrival'),
            attendance_missing: t('line.category.attendanceMissing', 'Missing Clock-in'),
            announcement: t('line.category.announcement', 'Announcement'),
            custom: t('line.category.custom', 'Custom'),
        };
        return categoryNames[category] || category;
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={
                isBulk
                    ? t('line.sendBulkMessage', 'Send LINE Message to Selected')
                    : t('line.sendMessage', 'Send LINE Message')
            }
            size="lg"
        >
            <div className="space-y-4">
                {/* Target Info */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                        {isBulk ? (
                            <Users size={20} className="text-green-600 dark:text-green-400" />
                        ) : (
                            <MessageCircle size={20} className="text-green-600 dark:text-green-400" />
                        )}
                    </div>
                    <div>
                        {isBulk ? (
                            <>
                                <p className="font-medium text-green-900 dark:text-green-100">
                                    {t('line.selectedEmployees', `${targetCount} employees selected`)}
                                </p>
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    {lineLinkedCount === targetCount
                                        ? t('line.allHaveLine', 'All have LINE linked')
                                        : t(
                                              'line.someHaveLine',
                                              `${lineLinkedCount} of ${targetCount} have LINE linked`
                                          )}
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="font-medium text-green-900 dark:text-green-100">
                                    {employee?.fullName}
                                </p>
                                {employee?.user?.lineDisplayName && (
                                    <p className="text-sm text-green-700 dark:text-green-300">
                                        LINE: {employee.user.lineDisplayName}
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Warning if no LINE linked */}
                {lineLinkedCount === 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                        <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            {isBulk
                                ? t('line.noLineLinkedBulk', 'None of the selected employees have LINE linked')
                                : t('line.noLineLinked', 'This employee has not linked their LINE account')}
                        </p>
                    </div>
                )}

                {/* Template Selector */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        {t('line.template', 'Template')} ({t('common.optional', 'Optional')})
                    </label>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                            className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600
                                     bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white
                                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                                     flex items-center justify-between"
                        >
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-neutral-400" />
                                <span className={selectedTemplate ? '' : 'text-neutral-400'}>
                                    {selectedTemplate
                                        ? i18n.language === 'th' && selectedTemplate.nameTh
                                            ? selectedTemplate.nameTh
                                            : selectedTemplate.name
                                        : t('line.selectTemplate', 'Select a template...')}
                                </span>
                            </div>
                            <ChevronDown size={16} className="text-neutral-400" />
                        </button>

                        {showTemplateDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 max-h-60 overflow-y-auto">
                                {isLoadingTemplates ? (
                                    <div className="p-4 text-center">
                                        <LoadingSpinner size="sm" />
                                    </div>
                                ) : templates.length === 0 ? (
                                    <div className="p-4 text-center text-neutral-500">
                                        {t('line.noTemplates', 'No templates available')}
                                    </div>
                                ) : (
                                    <>
                                        {selectedTemplate && (
                                            <button
                                                type="button"
                                                onClick={handleClearTemplate}
                                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-b border-neutral-200 dark:border-neutral-700"
                                            >
                                                {t('line.clearTemplate', 'Clear template')}
                                            </button>
                                        )}
                                        {templates.map((template) => (
                                            <button
                                                key={template.id}
                                                type="button"
                                                onClick={() => handleTemplateSelect(template)}
                                                className={`w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                                                    selectedTemplate?.id === template.id
                                                        ? 'bg-primary-50 dark:bg-primary-900/20'
                                                        : ''
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-sm">
                                                        {i18n.language === 'th' && template.nameTh
                                                            ? template.nameTh
                                                            : template.name}
                                                    </span>
                                                    <span className="text-xs text-neutral-500 bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded">
                                                        {getCategoryName(template.category)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-neutral-500 mt-1 truncate">
                                                    {i18n.language === 'th' && template.messageTh
                                                        ? template.messageTh
                                                        : template.message}
                                                </p>
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    {selectedTemplate && selectedTemplate.variables.length > 0 && (
                        <p className="text-xs text-neutral-500 mt-1">
                            {t('line.templateVariables', 'Variables')}: {selectedTemplate.variables.join(', ')}
                        </p>
                    )}
                </div>

                {/* Message Input */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        {t('line.message', 'Message')} *
                    </label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={t('line.messagePlaceholder', 'Enter your message...')}
                        rows={4}
                        maxLength={5000}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600
                                 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white
                                 placeholder-neutral-400 dark:placeholder-neutral-500
                                 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                                 resize-none"
                    />
                    <p className="text-xs text-neutral-500 mt-1 text-right">{message.length} / 5000</p>
                </div>

                {/* Thai Message (optional) */}
                {i18n.language !== 'th' && (
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                            {t('line.messageTh', 'Message (Thai)')} ({t('common.optional', 'Optional')})
                        </label>
                        <textarea
                            value={messageTh}
                            onChange={(e) => setMessageTh(e.target.value)}
                            placeholder={t('line.messageThPlaceholder', 'Enter Thai message (optional)...')}
                            rows={3}
                            maxLength={5000}
                            className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600
                                     bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white
                                     placeholder-neutral-400 dark:placeholder-neutral-500
                                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                                     resize-none"
                        />
                    </div>
                )}

                {/* Result */}
                {result && (
                    <div
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                            result.type === 'success'
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                : result.type === 'partial'
                                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}
                    >
                        {result.type === 'success' ? (
                            <CheckCircle
                                size={20}
                                className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
                            />
                        ) : (
                            <AlertCircle
                                size={20}
                                className={`flex-shrink-0 mt-0.5 ${
                                    result.type === 'partial'
                                        ? 'text-yellow-600 dark:text-yellow-400'
                                        : 'text-red-600 dark:text-red-400'
                                }`}
                            />
                        )}
                        <div className="flex-1">
                            <p
                                className={`text-sm font-medium ${
                                    result.type === 'success'
                                        ? 'text-green-700 dark:text-green-300'
                                        : result.type === 'partial'
                                          ? 'text-yellow-700 dark:text-yellow-300'
                                          : 'text-red-700 dark:text-red-300'
                                }`}
                            >
                                {result.message}
                            </p>
                            {result.details && result.details.results.some((r) => !r.success) && (
                                <div className="mt-2 text-xs space-y-1">
                                    {result.details.results
                                        .filter((r) => !r.success)
                                        .map((r) => (
                                            <p key={r.employeeId} className="text-red-600 dark:text-red-400">
                                                {r.employeeName}: {r.error}
                                            </p>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <ModalFooter>
                <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
                    {result ? t('common.close', 'Close') : t('common.cancel', 'Cancel')}
                </Button>
                {!result && (
                    <Button
                        variant="primary"
                        onClick={handleSend}
                        disabled={!canSend || isLoading}
                        leftIcon={isLoading ? <LoadingSpinner size="sm" /> : <Send size={16} />}
                    >
                        {isLoading ? t('line.sending', 'Sending...') : t('line.send', 'Send')}
                    </Button>
                )}
            </ModalFooter>
        </Modal>
    );
}

import { useState, useEffect } from 'react';
import { X, Calendar, FileText } from 'lucide-react';
import leaveService from '../../services/leave.service';
import type { LeaveRequestTemplate } from '../../types/leave.types';

interface TemplateSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (template: LeaveRequestTemplate) => void;
}

export default function TemplateSelector({ isOpen, onClose, onSelect }: TemplateSelectorProps) {
    const [templates, setTemplates] = useState<LeaveRequestTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
        }
    }, [isOpen]);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await leaveService.listTemplates(false); // Only active templates
            setTemplates(data);
        } catch (err) {
            console.error('Error loading templates:', err);
            setError('ไม่สามารถโหลดเทมเพลตได้');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTemplate = (template: LeaveRequestTemplate) => {
        onSelect(template);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

            {/* Modal */}
            <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-surface-200">
                        <h2 className="text-lg font-bold text-surface-900">
                            ✨ เลือกเทมเพลตด่วน
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-surface-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="spinner w-8 h-8 mb-2"></div>
                                <p className="text-surface-500">กำลังโหลดเทมเพลต...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="text-4xl mb-2">⚠️</div>
                                <p className="text-error-600">{error}</p>
                                <button
                                    onClick={loadTemplates}
                                    className="mt-4 btn-outline"
                                >
                                    ลองอีกครั้ง
                                </button>
                            </div>
                        ) : templates.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="text-4xl mb-2">📋</div>
                                <p className="text-surface-500">ไม่มีเทมเพลตที่พร้อมใช้งาน</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {templates.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => handleSelectTemplate(template)}
                                        className="text-left p-4 rounded-xl border-2 border-surface-200 hover:border-primary-500 hover:bg-primary-50 transition-all active:scale-[0.98]"
                                    >
                                        {/* Template Name */}
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-surface-900">
                                                    {template.nameTh || template.name}
                                                </h3>
                                                {template.nameTh && template.name !== template.nameTh && (
                                                    <p className="text-xs text-surface-500">{template.name}</p>
                                                )}
                                            </div>

                                            {/* Days Badge */}
                                            {template.defaultDaysCount && (
                                                <div className="flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium whitespace-nowrap">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {template.defaultDaysCount} วัน
                                                </div>
                                            )}
                                        </div>

                                        {/* Leave Type */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <div
                                                className={`w-2 h-2 rounded-full ${
                                                    template.leaveType?.isPaid
                                                        ? 'bg-success-500'
                                                        : 'bg-surface-400'
                                                }`}
                                            />
                                            <span className="text-sm text-surface-600">
                                                {template.leaveType?.nameTh || template.leaveType?.name}
                                            </span>
                                        </div>

                                        {/* Description */}
                                        {template.description && (
                                            <div className="flex items-start gap-2 mt-2 p-2 bg-surface-50 rounded-lg">
                                                <FileText className="w-4 h-4 text-surface-400 flex-shrink-0 mt-0.5" />
                                                <p className="text-sm text-surface-600 line-clamp-2">
                                                    {template.description}
                                                </p>
                                            </div>
                                        )}

                                        {/* Default Reason Preview */}
                                        {template.defaultReason && (
                                            <div className="mt-2 text-xs text-surface-500 italic">
                                                เหตุผล: {template.defaultReason.substring(0, 50)}
                                                {template.defaultReason.length > 50 && '...'}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-surface-200 bg-surface-50">
                        <p className="text-xs text-surface-500 text-center">
                            💡 เลือกเทมเพลตเพื่อกรอกแบบฟอร์มอัตโนมัติ คุณสามารถแก้ไขข้อมูลได้ภายหลัง
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

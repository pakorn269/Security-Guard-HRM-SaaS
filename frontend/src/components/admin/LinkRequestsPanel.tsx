import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Phone, Check, X, RefreshCw, MessageCircle, Clock } from 'lucide-react';
import linkRequestsService, { type LinkRequest } from '../../services/link-requests.service';
import { Button, Avatar, Badge } from '../common';

interface LinkRequestsPanelProps {
    onCountChange?: (count: number) => void;
}

export default function LinkRequestsPanel({ onCountChange }: LinkRequestsPanelProps) {
    const { t, i18n } = useTranslation();
    const [requests, setRequests] = useState<LinkRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchRequests = async () => {
        try {
            setIsLoading(true);
            const data = await linkRequestsService.listPending();
            setRequests(data);
            onCountChange?.(data.length);
        } catch (err) {
            console.error('Failed to fetch link requests:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleApprove = async (id: string) => {
        setProcessingId(id);
        try {
            await linkRequestsService.approve(id);
            // Refresh logic handled by re-fetching
            await fetchRequests();
        } catch (err) {
            console.error('Failed to approve:', err);
            // In a real app we'd use a toast notification here
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm(t('common.confirmReject', 'Are you sure you want to reject this request?'))) return;
        setProcessingId(id);
        try {
            await linkRequestsService.reject(id);
            await fetchRequests();
        } catch (err) {
            console.error('Failed to reject:', err);
        } finally {
            setProcessingId(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) {
            return i18n.language === 'th'
                ? `${diffMins} นาทีที่แล้ว`
                : `${diffMins} min ago`;
        } else if (diffHours < 24) {
            return i18n.language === 'th'
                ? `${diffHours} ชั่วโมงที่แล้ว`
                : `${diffHours} hr ago`;
        } else {
            return i18n.language === 'th'
                ? `${diffDays} วันที่แล้ว`
                : `${diffDays} days ago`;
        }
    };

    if (isLoading && requests.length === 0) {
        // Only show loading if we don't have data yet
        return null;
    }

    if (requests.length === 0) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-6">
            {/* Header */}
            <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-medium text-blue-800 dark:text-blue-200">
                        {i18n.language === 'th'
                            ? `คำขอเชื่อมต่อ LINE (${requests.length})`
                            : `LINE Link Requests (${requests.length})`}
                    </h3>
                </div>
                <button
                    onClick={fetchRequests}
                    className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded transition-colors"
                    title={t('common.refresh', 'Refresh')}
                >
                    <RefreshCw className={`w-4 h-4 text-blue-600 dark:text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Request List */}
            <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                {requests.map((request) => (
                    <div
                        key={request.id}
                        className="px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            {/* User Info */}
                            <div className="flex items-start gap-3">
                                <div className="relative">
                                    <Avatar
                                        src={request.line_picture_url}
                                        name={request.line_display_name || 'LINE'}
                                        size="md"
                                    />
                                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-neutral-900 rounded-full p-0.5">
                                        <MessageCircle size={14} className="text-[#06C755] fill-current" />
                                    </div>
                                </div>
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                                        {request.line_display_name}
                                        <Badge variant="warning" size="sm">Pending</Badge>
                                    </p>
                                    <div className="text-sm text-neutral-500 dark:text-neutral-400 space-y-0.5 mt-0.5">
                                        <p>
                                            {i18n.language === 'th' ? 'ต้องการเชื่อมต่อกับ: ' : 'Wants to link with: '}
                                            <span className="font-medium text-neutral-700 dark:text-neutral-300">
                                                {request.employees?.full_name}
                                            </span>
                                        </p>
                                        <div className="flex items-center gap-3 text-xs">
                                            <span className={`flex items-center gap-1 ${request.code_matched ? 'text-success-600' : 'text-error-500'}`}>
                                                Code: {request.entered_employee_code}
                                                {request.code_matched ? <Check size={12} /> : <X size={12} />}
                                            </span>
                                            <span className={`flex items-center gap-1 ${request.phone_matched ? 'text-success-600' : 'text-error-500'}`}>
                                                <Phone size={10} />
                                                {request.entered_phone}
                                                {request.phone_matched ? <Check size={12} /> : <X size={12} />}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 self-end sm:self-center">
                                <div className="text-right text-xs text-neutral-400 mr-2 hidden sm:block">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(request.created_at)}
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleReject(request.id)}
                                    disabled={!!processingId}
                                    className="text-error-600 hover:text-error-700 hover:bg-error-50"
                                >
                                    {t('common.reject', 'Reject')}
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleApprove(request.id)}
                                    isLoading={processingId === request.id}
                                    disabled={!!processingId}
                                >
                                    {t('common.approve', 'Approve')}
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

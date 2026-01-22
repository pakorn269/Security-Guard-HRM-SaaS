import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KeyRound, User, Phone, Clock, ChevronRight, RefreshCw } from 'lucide-react';
import authService from '../../services/auth.service';

interface PinResetRequest {
    id: string;
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    employeePhone: string;
    status: string;
    requestedAt: string;
}

interface PinResetRequestsPanelProps {
    onCountChange?: (count: number) => void;
}

const PinResetRequestsPanel = ({ onCountChange }: PinResetRequestsPanelProps) => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [requests, setRequests] = useState<PinResetRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRequests = async () => {
        try {
            setIsLoading(true);
            const data = await authService.getPinResetRequests();
            setRequests(data);
            onCountChange?.(data.length);
        } catch (err: any) {
            console.error('Failed to fetch PIN reset requests:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

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

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                </div>
            </div>
        );
    }

    if (error) {
        return null; // Silently fail
    }

    if (requests.length === 0) {
        return null; // Don't show panel if no requests
    }

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            {/* Header */}
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-amber-600" />
                    <h3 className="font-medium text-amber-800">
                        {i18n.language === 'th'
                            ? `คำขอรีเซ็ต PIN (${requests.length})`
                            : `PIN Reset Requests (${requests.length})`}
                    </h3>
                </div>
                <button
                    onClick={fetchRequests}
                    className="p-1 hover:bg-amber-100 rounded transition-colors"
                    title={t('common.refresh', 'Refresh')}
                >
                    <RefreshCw className="w-4 h-4 text-amber-600" />
                </button>
            </div>

            {/* Request List */}
            <div className="divide-y divide-gray-100">
                {requests.map((request) => (
                    <div
                        key={request.id}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/employees/${request.employeeId}`)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-primary-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {request.employeeName}
                                    </p>
                                    <div className="flex items-center gap-3 text-sm text-gray-500">
                                        <span>{request.employeeCode}</span>
                                        <span className="flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            {request.employeePhone}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                                <div className="text-right text-xs">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(request.requestedAt)}
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500">
                {i18n.language === 'th'
                    ? 'คลิกเพื่อดูรายละเอียดและรีเซ็ต PIN'
                    : 'Click to view details and reset PIN'}
            </div>
        </div>
    );
};

export default PinResetRequestsPanel;

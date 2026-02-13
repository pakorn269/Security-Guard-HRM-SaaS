import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Palmtree,
    CheckCircle,
    AlertTriangle,
    Plus,
    Clock,
    X,
    Loader2,
    Sparkles,
    Wifi,
    WifiOff,
    TrendingDown,
    Camera,
    Calendar,
    FileText,
} from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import leaveService, {
    type LeaveBalanceWithType,
    type LeaveRequestWithDetails,
    type MyLeaveDataResponse,
} from '../../services/leave.service';
import type { LeaveType, LeaveRequestTemplate } from '../../types/leave.types';
import FileUpload from '../../components/forms/FileUpload';
import TemplateSelector from '../../components/leave/TemplateSelector';
import offlineQueueService, { type OfflineQueueEvent } from '../../services/offline-queue.service';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: string }) {
    const styles = {
        pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    };

    const labels = {
        pending: 'รออนุมัติ',
        approved: 'อนุมัติ',
        rejected: 'ไม่อนุมัติ',
        cancelled: 'ยกเลิก',
    };

    const s = status as keyof typeof styles;

    return (
        <span className={`text-[10px] uppercase tracking-wide font-bold px-2.5 py-1 rounded-full ${styles[s] || styles.cancelled}`}>
            {labels[s] || status}
        </span>
    );
}

interface SwipeableRequestCardProps {
    request: LeaveRequestWithDetails;
    onCancel: (id: string) => void;
    formatDate: (date: string) => string;
}

function SwipeableRequestCard({ request, onCancel, formatDate }: SwipeableRequestCardProps) {
    const [swiped, setSwiped] = useState(false);

    const handlers = useSwipeable({
        onSwipedLeft: () => {
            setSwiped(true);
            if (window.navigator && 'vibrate' in window.navigator) {
                window.navigator.vibrate(50);
            }
        },
        onSwipedRight: () => setSwiped(false),
        trackMouse: false,
        trackTouch: true,
        delta: 10,
    });

    return (
        <div className="relative overflow-hidden">
            {/* Delete Background */}
            <div
                className={`absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-end px-6 transition-opacity duration-300 ${swiped ? 'opacity-100' : 'opacity-0'
                    }`}
            >
                <div className="flex items-center gap-2 text-white font-bold">
                    <span>ยกเลิก</span>
                    <X size={20} />
                </div>
            </div>

            {/* Content Card */}
            <div
                {...handlers}
                className={`relative bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border-l-4 border-orange-400 overflow-hidden transition-transform duration-300 ${swiped ? '-translate-x-24' : 'translate-x-0'
                    }`}
            >
                <div className="flex items-center gap-3">
                    {/* Date Badge */}
                    <div className="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-2 min-w-[56px]">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                            {new Date(request.startDate).getDate()}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                            {new Date(request.startDate).toLocaleDateString('th-TH', { month: 'short' })}
                        </span>
                    </div>

                    {/* Details */}
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-1 leading-tight">
                            {request.leaveType?.nameTh || request.leaveType?.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Clock size={12} className="text-orange-500" />
                            <span>{request.totalDays} วัน</span>
                        </div>
                    </div>
                </div>

                {/* Confirm Cancel Overlay */}
                {swiped && (
                    <div className="absolute inset-0 flex items-center justify-end pr-28 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm" onClick={() => setSwiped(false)}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onCancel(request.id);
                            }}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg active:scale-95 transition-transform"
                        >
                            ยืนยัน
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

const BalanceCard = ({ balance, index }: { balance: LeaveBalanceWithType; index: number }) => {
    // Vibrant gradients
    const gradients = [
        'from-blue-500 to-indigo-600 shadow-blue-500/30',
        'from-emerald-500 to-teal-600 shadow-emerald-500/30',
        'from-violet-500 to-purple-600 shadow-violet-500/30',
        'from-orange-400 to-red-500 shadow-orange-500/30',
        'from-pink-500 to-rose-600 shadow-pink-500/30',
    ];
    const gradient = gradients[index % gradients.length];

    const remaining = balance.remainingDays;
    const total = balance.entitledDays;
    const percentage = total > 0 ? (remaining / total) * 100 : 0;

    return (
        <div className={`min-w-[85%] h-48 snap-center rounded-3xl bg-gradient-to-br ${gradient} text-white shadow-xl p-6 relative overflow-hidden flex-shrink-0`}>
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl -ml-8 -mb-8" />

            <div className="relative z-10 h-full flex flex-col justify-between">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/90">
                        <FileText size={16} />
                        <span className="text-sm font-medium">{balance.leaveType?.nameTh || balance.leaveType?.name}</span>
                    </div>

                    {/* Circular Progress */}
                    <div className="relative w-12 h-12">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                className="text-white/20"
                            />
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeDasharray={`${percentage}, 100`}
                                strokeLinecap="round"
                                className="text-white"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">
                            {Math.round(percentage)}%
                        </div>
                    </div>
                </div>

                {/* Main Number */}
                <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-bold leading-none">{remaining}</span>
                    <span className="text-lg font-medium opacity-90">/ {total} วัน</span>
                </div>

                {/* Progress Bar */}
                <div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white rounded-full transition-all duration-1000"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    {balance.pendingDays > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-xs">
                            <Clock size={12} className="opacity-80" />
                            <span className="opacity-90">รออนุมัติ {balance.pendingDays} วัน</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface TimelineHistoryProps {
    requests: LeaveRequestWithDetails[];
    formatDate: (date: string) => string;
}

const TimelineHistory = ({ requests, formatDate }: TimelineHistoryProps) => {
    // Group by month
    const grouped = useMemo(() => {
        const groups: Record<string, LeaveRequestWithDetails[]> = {};
        requests.forEach(req => {
            const date = new Date(req.startDate);
            const key = date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
            if (!groups[key]) groups[key] = [];
            groups[key].push(req);
        });
        return groups;
    }, [requests]);

    if (!requests || requests.length === 0) {
        return (
            <div className="text-center py-12 text-slate-400">
                <p className="text-sm">ยังไม่มีประวัติการลา</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {Object.entries(grouped).map(([month, items]) => (
                <div key={month}>
                    {/* Month Header */}
                    <div className="sticky top-16 z-10 mb-4">
                        <span className="inline-block bg-slate-800 dark:bg-slate-700 text-white px-4 py-1 rounded-full text-sm font-bold">
                            {month}
                        </span>
                    </div>

                    {/* Timeline Items */}
                    <div className="relative border-l-2 border-dashed border-slate-300 dark:border-slate-600 ml-2 pl-6 space-y-4">
                        {items.map((req) => (
                            <div key={req.id} className="relative">
                                {/* Status Dot */}
                                <div
                                    className={`absolute -left-[29px] top-4 w-4 h-4 rounded-full border-4 border-slate-50 dark:border-slate-900 ${req.status === 'approved' ? 'bg-green-500' :
                                        req.status === 'pending' ? 'bg-orange-500' :
                                            req.status === 'rejected' ? 'bg-red-500' : 'bg-slate-400'
                                        }`}
                                />

                                {/* Card */}
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-900 dark:text-white">
                                            {req.leaveType?.nameTh || req.leaveType?.name}
                                        </h4>
                                        <StatusBadge status={req.status} />
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-sm text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center gap-1 mb-1">
                                                <Calendar size={12} />
                                                <span>
                                                    {formatDate(req.startDate)}
                                                    {req.startDate !== req.endDate && ` - ${formatDate(req.endDate)}`}
                                                </span>
                                            </div>
                                            {req.reason && (
                                                <p className="text-xs italic line-clamp-1">"{req.reason}"</p>
                                            )}
                                        </div>
                                        <div className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                                            {req.totalDays} วัน
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LiffLeavePage() {
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Data
    const [leaveData, setLeaveData] = useState<MyLeaveDataResponse | null>(null);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

    // Template selector
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [applyingTemplate, setApplyingTemplate] = useState(false);

    // Offline state
    const [isOnline, setIsOnline] = useState(offlineQueueService.getOnlineStatus());
    const [pendingQueueCount, setPendingQueueCount] = useState(0);

    // Form state
    const [formData, setFormData] = useState({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        reason: '',
    });
    const [documentFile, setDocumentFile] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);

    // Load data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [leaveDataRes, leaveTypesRes] = await Promise.all([
                leaveService.getMyLeaveData(),
                leaveService.listLeaveTypes(),
            ]);

            setLeaveData(leaveDataRes);
            setLeaveTypes(leaveTypesRes.filter(t => t.isActive));
        } catch (err) {
            console.error('Error loading leave data:', err);
            setError('ไม่สามารถโหลดข้อมูลการลาได้');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Setup offline queue listeners
    useEffect(() => {
        const updatePendingCount = async () => {
            const count = await offlineQueueService.getPendingCount();
            setPendingQueueCount(count);
        };

        const unsubscribe = offlineQueueService.on((event: OfflineQueueEvent) => {
            if (event.type === 'online') {
                setIsOnline(true);
            } else if (event.type === 'offline') {
                setIsOnline(false);
            } else if (event.type === 'queued' || event.type === 'synced') {
                updatePendingCount();
            } else if (event.type === 'sync-complete') {
                loadData();
                updatePendingCount();
            }
        });

        updatePendingCount();

        return unsubscribe;
    }, [loadData]);

    // Calculate days between dates
    const calculateDays = (start: string, end: string): number => {
        if (!start || !end) return 0;
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    // Balance prediction
    const balancePrediction = useMemo(() => {
        if (!formData.leaveTypeId || !formData.startDate || !formData.endDate || !leaveData) {
            return null;
        }

        const requestDays = calculateDays(formData.startDate, formData.endDate);
        const currentYear = new Date().getFullYear();

        const balance = leaveData.balances.find(
            (b) => b.leaveTypeId === formData.leaveTypeId && b.year === currentYear
        );

        if (!balance) return null;

        const remainingAfter = balance.remainingDays - requestDays;

        return {
            currentRemaining: balance.remainingDays,
            requestDays,
            remainingAfter,
            leaveTypeName: balance.leaveType?.nameTh || balance.leaveType?.name || 'การลา',
        };
    }, [formData.leaveTypeId, formData.startDate, formData.endDate, leaveData]);

    // Check if selected leave type requires document
    const requiresDocument = () => {
        const selectedType = leaveTypes.find(t => t.id === formData.leaveTypeId);
        return selectedType?.requiresDocument || false;
    };

    // Handle form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.leaveTypeId || !formData.startDate || !formData.endDate) {
            setError('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        if (requiresDocument() && documentFile.length === 0) {
            setError('ต้องแนบเอกสารสำหรับการลาประเภทนี้');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            if (!isOnline) {
                await offlineQueueService.queueRequest(
                    {
                        leaveTypeId: formData.leaveTypeId,
                        startDate: formData.startDate,
                        endDate: formData.endDate,
                        reason: formData.reason || undefined,
                    },
                    documentFile[0]
                );

                setSuccess('✅ บันทึกไว้แล้ว! จะส่งเมื่อมีอินเทอร์เน็ต');
                setShowForm(false);
                setFormData({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
                setDocumentFile([]);

                if (window.navigator && 'vibrate' in window.navigator) {
                    window.navigator.vibrate(50);
                }

                setTimeout(() => setSuccess(null), 5000);
                return;
            }

            const createdRequest = await leaveService.createLeaveRequest({
                leaveTypeId: formData.leaveTypeId,
                startDate: formData.startDate,
                endDate: formData.endDate,
                reason: formData.reason || undefined,
            });

            if (documentFile.length > 0 && createdRequest.id) {
                try {
                    setUploading(true);
                    await leaveService.uploadLeaveDocument(createdRequest.id, documentFile[0]);
                } catch (uploadErr) {
                    console.error('Error uploading document:', uploadErr);
                    setError('คำขอลาถูกสร้างแล้ว แต่การอัพโหลดเอกสารล้มเหลว');
                } finally {
                    setUploading(false);
                }
            }

            setSuccess('ส่งคำขอลาสำเร็จ');
            setShowForm(false);
            setFormData({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
            setDocumentFile([]);

            if (window.navigator && 'vibrate' in window.navigator) {
                window.navigator.vibrate([50, 100, 50]);
            }

            await loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถส่งคำขอลาได้';
            setError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle cancel leave request
    const handleCancel = async (requestId: string) => {
        if (!confirm('คุณต้องการยกเลิกคำขอลานี้หรือไม่?')) return;

        try {
            await leaveService.cancelLeaveRequest(requestId);
            setSuccess('ยกเลิกคำขอลาสำเร็จ');
            await loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถยกเลิกคำขอลาได้';
            setError(errorMessage);
        }
    };

    // Handle template selection
    const handleTemplateSelect = async (template: LeaveRequestTemplate) => {
        try {
            setApplyingTemplate(true);
            setError(null);

            const startDate = formData.startDate || new Date().toISOString().split('T')[0];
            const draft = await leaveService.applyTemplate(template.id, startDate);

            setFormData({
                leaveTypeId: draft.leaveTypeId,
                startDate: draft.startDate || startDate,
                endDate: draft.endDate || '',
                reason: draft.reason || '',
            });

            setSuccess('ใช้เทมเพลตสำเร็จ! กรุณาตรวจสอบข้อมูล');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error applying template:', err);
            setError('ไม่สามารถใช้เทมเพลตได้');
        } finally {
            setApplyingTemplate(false);
        }
    };

    // Format date for display
    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 size={40} className="text-blue-500 animate-spin" />
                    <p className="text-slate-500">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 px-4 py-3">
                <div className="flex items-center justify-center gap-2">
                    <div className="bg-blue-500 text-white p-1.5 rounded-lg">
                        <Palmtree size={18} fill="currentColor" />
                    </div>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">การลา</h1>
                </div>
            </div>

            <div className="space-y-6">
                {/* Offline Banner */}
                {!isOnline && (
                    <div className="mx-4 mt-4 bg-slate-800 text-white px-4 py-3 rounded-xl flex items-center gap-3">
                        <WifiOff size={20} className="text-red-400" />
                        <div className="flex-1">
                            <p className="font-bold text-sm">ไม่มีสัญญาณอินเทอร์เน็ต</p>
                            <p className="text-xs opacity-80">ใช้งานโหมดออฟไลน์</p>
                        </div>
                    </div>
                )}

                {/* Pending Queue */}
                {pendingQueueCount > 0 && (
                    <div className="mx-4 bg-orange-500 text-white px-4 py-3 rounded-xl flex items-center gap-3">
                        <Wifi size={20} />
                        <div className="flex-1">
                            <p className="font-bold text-sm">{pendingQueueCount} รายการรอการส่ง</p>
                            <p className="text-xs opacity-90">จะอัปโหลดอัตโนมัติเมื่อออนไลน์</p>
                        </div>
                    </div>
                )}

                {/* Notifications */}
                {success && (
                    <div className="fixed top-20 left-4 right-4 z-50 bg-green-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-down">
                        <CheckCircle size={20} />
                        <span className="font-medium text-sm">{success}</span>
                    </div>
                )}
                {error && (
                    <div className="fixed top-20 left-4 right-4 z-50 bg-red-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-down">
                        <AlertTriangle size={20} />
                        <span className="font-medium text-sm flex-1">{error}</span>
                        <button onClick={() => setError(null)}><X size={18} /></button>
                    </div>
                )}

                {/* Balance Cards - Horizontal Scroll */}
                <section>
                    <div className="flex items-center justify-between px-4 mb-3">
                        <h2 className="font-bold text-lg text-slate-900 dark:text-white">วันลาคงเหลือ</h2>
                        <span className="text-xs text-slate-500 font-medium">ปี {new Date().getFullYear()}</span>
                    </div>

                    {(!leaveData?.balances || leaveData.balances.length === 0) ? (
                        <div className="mx-4 bg-white dark:bg-slate-800 rounded-2xl p-8 text-center text-slate-400">
                            <Palmtree size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">ไม่มีข้อมูลวันลา</p>
                        </div>
                    ) : (
                        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-4 py-2 scrollbar-hide">
                            {leaveData.balances.map((balance, index) => (
                                <BalanceCard key={balance.id} balance={balance} index={index} />
                            ))}
                        </div>
                    )}
                </section>

                {/* Pending Requests */}
                {leaveData?.pendingRequests && leaveData.pendingRequests.length > 0 && (
                    <section className="px-4">
                        <div className="flex items-center gap-2 mb-3">
                            <h2 className="font-bold text-lg text-slate-900 dark:text-white">รออนุมัติ</h2>
                            <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-bold px-2 py-0.5 rounded-full">
                                {leaveData.pendingRequests.length}
                            </span>
                        </div>
                        <div className="space-y-3">
                            {leaveData.pendingRequests.map((request: LeaveRequestWithDetails) => (
                                <SwipeableRequestCard
                                    key={request.id}
                                    request={request}
                                    onCancel={handleCancel}
                                    formatDate={formatDate}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* History Timeline */}
                <section className="px-4">
                    <h2 className="font-bold text-lg text-slate-900 dark:text-white mb-4">ประวัติการลา</h2>
                    {leaveData?.recentRequests && (
                        <TimelineHistory requests={leaveData.recentRequests} formatDate={formatDate} />
                    )}
                </section>
            </div>

            {/* Floating Action Button (FAB) */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-8 py-3 rounded-full shadow-lg shadow-cyan-500/40 active:scale-95 transition-transform font-bold"
                >
                    <Plus size={24} strokeWidth={2.5} />
                    <span>ขอลาใหม่</span>
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50 animate-fade-in">
                    <div className="w-full bg-white dark:bg-slate-800 rounded-t-3xl p-6 max-h-[85vh] overflow-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">ขอลาใหม่</h2>
                            <button
                                onClick={() => {
                                    setShowForm(false);
                                    setFormData({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
                                }}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Template Button */}
                        <button
                            type="button"
                            onClick={() => setShowTemplateSelector(true)}
                            disabled={applyingTemplate}
                            className="w-full mb-4 py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                        >
                            {applyingTemplate ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    กำลังใช้เทมเพลต...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    ✨ ใช้เทมเพลตด่วน
                                </>
                            )}
                        </button>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    ประเภทการลา <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="input-base"
                                    value={formData.leaveTypeId}
                                    onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                                    required
                                >
                                    <option value="">เลือกประเภทการลา</option>
                                    {leaveTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.nameTh || type.name}
                                            {type.maxDaysPerYear && ` (สูงสุด ${type.maxDaysPerYear} วัน/ปี)`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        วันที่เริ่ม <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        className="input-base"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        min={new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        วันที่สิ้นสุด <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        className="input-base"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        min={formData.startDate || new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                </div>
                            </div>

                            {formData.startDate && formData.endDate && (
                                <div className="space-y-2">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
                                        <span className="text-blue-700 dark:text-blue-300 font-bold">
                                            จำนวนวันลา: {calculateDays(formData.startDate, formData.endDate)} วัน
                                        </span>
                                    </div>

                                    {balancePrediction && (
                                        <div
                                            className={`rounded-lg p-3 border text-sm ${balancePrediction.remainingAfter < 0
                                                    ? 'bg-red-50 border-red-200 text-red-700'
                                                    : balancePrediction.remainingAfter <= 2
                                                        ? 'bg-orange-50 border-orange-200 text-orange-700'
                                                        : 'bg-green-50 border-green-200 text-green-700'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <TrendingDown size={14} />
                                                <span className="font-bold">{balancePrediction.leaveTypeName}</span>
                                            </div>
                                            <div className="text-xs">
                                                คงเหลือปัจจุบัน: {balancePrediction.currentRemaining} วัน
                                                <br />
                                                คงเหลือหลังลา: <span className="font-bold">{balancePrediction.remainingAfter} วัน</span>
                                                {balancePrediction.remainingAfter < 0 && <span className="ml-2">⚠️ เกินสิทธิ์!</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    เหตุผล
                                </label>
                                <textarea
                                    className="input-base"
                                    rows={3}
                                    placeholder="ระบุเหตุผลการลา..."
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                />
                            </div>

                            <div>
                                <FileUpload
                                    label="แนบเอกสาร"
                                    accept="application/pdf,image/jpeg,image/png"
                                    maxSize={5 * 1024 * 1024}
                                    files={documentFile}
                                    onChange={setDocumentFile}
                                    required={requiresDocument()}
                                    showPreview={true}
                                    size="md"
                                    capture="environment"
                                    helperText={
                                        requiresDocument()
                                            ? 'ต้องแนบเอกสาร (PDF, JPG, PNG) ขนาดไม่เกิน 5MB'
                                            : 'แนบเอกสารประกอบ (ถ้ามี)'
                                    }
                                    dropzoneText="ลากไฟล์มาวางที่นี่ หรือ"
                                    browseText="เลือกไฟล์"
                                />
                                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                    <Camera size={14} />
                                    <span>คลิกเพื่อถ่ายรูปหรือเลือกไฟล์</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full btn-primary py-3 disabled:opacity-50"
                                disabled={submitting || uploading}
                            >
                                {submitting || uploading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 size={20} className="animate-spin" />
                                        {uploading ? 'กำลังอัพโหลด...' : 'กำลังส่ง...'}
                                    </span>
                                ) : (
                                    'ส่งคำขอ'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Template Selector Modal */}
            <TemplateSelector
                isOpen={showTemplateSelector}
                onClose={() => setShowTemplateSelector(false)}
                onSelect={handleTemplateSelect}
            />
        </div>
    );
}

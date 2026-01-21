import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import leaveService, { type LeaveRequestWithDetails } from '../../services/leave.service';

export default function PendingLeaveRequestsWidget() {
    const [requests, setRequests] = useState<LeaveRequestWithDetails[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            setLoading(true);
            const { requests } = await leaveService.listLeaveRequests({
                status: 'pending',
                pageSize: 5
            });
            setRequests(requests);
        } catch (err) {
            console.error('Failed to load pending requests', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleApprove = async (id: string, name: string) => {
        if (!confirm(`ยืนยันการอนุมัติคำขอลาของ ${name}?`)) return;
        try {
            await leaveService.approveLeaveRequest(id);
            await loadData();
        } catch (err) {
            alert('ไม่สามารถอนุมัติได้');
        }
    };

    const handleReject = async (id: string, name: string) => {
        const reason = prompt(`ระบุเหตุผลการไม่อนุมัติสำหรับ ${name}:`);
        if (reason === null) return; // Cancelled
        if (!reason.trim()) {
            alert('กรุณาระบุเหตุผล');
            return;
        }

        try {
            await leaveService.rejectLeaveRequest(id, reason);
            await loadData();
        } catch (err) {
            alert('ไม่สามารถดำเนินการได้');
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm h-full flex items-center justify-center min-h-[300px]">
                <div className="spinner w-8 h-8"></div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm h-full">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-neutral-800 dark:text-white">
                    คำขอลารออนุมัติ
                </h2>
                <Link to="/leave" className="text-sm text-primary-600 hover:text-primary-700">
                    ดูทั้งหมด
                </Link>
            </div>

            <div className="space-y-3">
                {requests.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                        ไม่มีคำขอลารออนุมัติ
                    </div>
                ) : (
                    requests.map((request) => (
                        <div
                            key={request.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700"
                        >
                            <div className="w-10 h-10 rounded-full bg-accent-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                                {request.employee?.fullName.charAt(0) || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-neutral-800 dark:text-white truncate">
                                    {request.employee?.fullName}
                                </p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                                    {request.leaveType?.nameTh || request.leaveType?.name} • {request.totalDays} วัน
                                </p>
                                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                                    {new Date(request.startDate).toLocaleDateString('th-TH')} - {new Date(request.endDate).toLocaleDateString('th-TH')}
                                </p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => request.employee && handleApprove(request.id, request.employee.fullName)}
                                    className="p-2 rounded-lg bg-success-500 text-white hover:bg-success-600 transition-colors shadow-sm"
                                    title="อนุมัติ"
                                >
                                    ✓
                                </button>
                                <button
                                    onClick={() => request.employee && handleReject(request.id, request.employee.fullName)}
                                    className="p-2 rounded-lg bg-error-500 text-white hover:bg-error-600 transition-colors shadow-sm"
                                    title="ไม่อนุมัติ"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

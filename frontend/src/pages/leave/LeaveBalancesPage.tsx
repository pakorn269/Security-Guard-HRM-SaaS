import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Edit, History } from 'lucide-react';
import leaveService from '../../services/leave.service';
import { useAuth } from '../../context/AuthContext';
import BalanceAdjustmentModal from '../../components/leave/BalanceAdjustmentModal';
import AdjustmentHistoryModal from '../../components/leave/AdjustmentHistoryModal';
import type { LeaveBalance, LeaveType, AdjustBalanceRequest } from '../../types/leave.types';

export default function LeaveBalancesPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [balances, setBalances] = useState<LeaveBalance[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [total, setTotal] = useState(0);
    const [searchParams, setSearchParams] = useSearchParams();

    // Modal states
    const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedBalance, setSelectedBalance] = useState<LeaveBalance | null>(null);

    const [yearInputVal, setYearInputVal] = useState(new Date().getFullYear().toString());

    // Sync local state when searchParams year changes
    useEffect(() => {
        const yearParam = searchParams.get('year') || new Date().getFullYear().toString();
        setYearInputVal(yearParam);
    }, [searchParams]);

    // Check if user is manager/admin
    const isManager = user?.role === 'manager' || user?.role === 'company_admin' || user?.role === 'super_admin';

    // Filters
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const leaveTypeId = searchParams.get('leaveTypeId') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = 50;

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [balancesData, typesData] = await Promise.all([
                leaveService.listBalances({
                    year,
                    leaveTypeId: leaveTypeId || undefined,
                    page,
                    pageSize
                }),
                leaveService.listLeaveTypes()
            ]);

            setBalances(balancesData.balances);
            setTotal(balancesData.total);
            setLeaveTypes(typesData);
        } catch (err) {
            console.error('Error loading balances:', err);
        } finally {
            setLoading(false);
        }
    }, [year, leaveTypeId, page]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleInitialize = async () => {
        if (!confirm(`ยืนยันการสร้างข้อมูลวันลาสำหรับปี ${year}? ข้อมูลที่มีอยู่แล้วจะไม่ถูกเขียนทับ`)) return;
        try {
            setLoading(true);
            await leaveService.initializeBalances(year);
            await loadData();
            alert('สร้างข้อมูลวันลาเรียบร้อยแล้ว');
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการสร้างข้อมูล');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateParam = (key: string, value: string) => {
        const nextParams = new URLSearchParams(searchParams);
        if (value) nextParams.set(key, value);
        else nextParams.delete(key);
        if (key !== 'page') nextParams.delete('page');
        setSearchParams(nextParams);
    };

    const handlePageChange = (newPage: number) => {
        handleUpdateParam('page', newPage.toString());
    };

    const totalPages = Math.ceil(total / pageSize);

    const handleOpenAdjustment = (balance: LeaveBalance) => {
        setSelectedBalance(balance);
        setAdjustmentModalOpen(true);
    };

    const handleOpenHistory = (balance: LeaveBalance) => {
        setSelectedBalance(balance);
        setHistoryModalOpen(true);
    };

    const handleAdjustBalance = async (data: AdjustBalanceRequest) => {
        if (!selectedBalance) return;

        try {
            if (data.fieldName === 'entitled_days') {
                try {
                    await leaveService.updateLeaveBalance(
                        selectedBalance.employeeId,
                        selectedBalance.leaveTypeId,
                        data.newValue
                    );
                } catch (e) {
                    console.warn('Legacy updateLeaveBalance failed:', e);
                }
            }
            if (typeof leaveService.adjustLeaveBalance === 'function') {
                await leaveService.adjustLeaveBalance(selectedBalance.id, data);
            }
            await loadData(); // Reload data to show updated balance
            alert('ปรับยอดวันลาเรียบร้อยแล้ว');
        } catch (err) {
            console.error('Error adjusting balance:', err);
            throw err; // Let modal handle error display
        }
    };

    const handleLoadHistory = async (balanceId: string) => {
        return await leaveService.getBalanceAdjustments(balanceId);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-800">จัดการวันลาคงเหลือ</h1>
                    <p className="text-surface-500">ตรวจสอบวันลาคงเหลือของพนักงานรายปี</p>
                </div>
                <button
                    onClick={handleInitialize}
                    className="btn-primary flex items-center gap-2"
                    disabled={loading}
                >
                    ⚡ สร้างข้อมูลวันลาปี {year}
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end bg-white p-4 rounded-xl shadow-sm border border-surface-200">
                <div>
                    <label htmlFor="year-filter" className="block text-sm font-medium text-surface-700 mb-1">ปี</label>
                    <input
                        id="year-filter"
                        type="number"
                        className="input-base w-32"
                        value={yearInputVal}
                        onChange={(e) => setYearInputVal(e.target.value)}
                        onBlur={() => handleUpdateParam('year', yearInputVal)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleUpdateParam('year', yearInputVal);
                            }
                        }}
                        min={2020}
                        max={2100}
                    />
                </div>
                <div>
                    <label htmlFor="leave-type-filter" className="block text-sm font-medium text-surface-700 mb-1">ประเภทการลา</label>
                    <select
                        id="leave-type-filter"
                        className="input-base min-w-[200px]"
                        value={leaveTypeId}
                        onChange={(e) => handleUpdateParam('leaveTypeId', e.target.value)}
                    >
                        <option value="">ทั้งหมด</option>
                        {leaveTypes.map(t => (
                            <option key={t.id} value={t.id}>{t.nameTh || t.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr>
                                <th className="w-1/3">พนักงาน</th>
                                <th>ประเภทการลา</th>
                                <th className="text-center w-24">สิทธิ์</th>
                                <th className="text-center w-24">ใช้ไป</th>
                                <th className="text-center w-24">รออนุมัติ</th>
                                <th className="text-center w-24">คงเหลือ</th>
                                {isManager && <th className="text-center w-32">การจัดการ</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && balances.length === 0 ? (
                                <tr>
                                    <td colSpan={isManager ? 7 : 6} className="text-center py-12">
                                        <div className="spinner w-8 h-8 mx-auto mb-2"></div>
                                        <p className="text-surface-500">กำลังโหลด...</p>
                                    </td>
                                </tr>
                            ) : balances.length > 0 ? (
                                balances.map(b => (
                                    <tr key={b.id} className="hover:bg-surface-50 transition-colors">
                                        <td>
                                            <div className="font-medium text-surface-900">
                                                {b.employee?.fullName || b.employeeId}
                                            </div>
                                            <div className="text-xs text-surface-500">
                                                {b.employee?.employeeCode || '-'}
                                            </div>
                                        </td>
                                        <td>
                                            {(() => {
                                                const lt = b.leaveType || leaveTypes.find(t => t.id === b.leaveTypeId);
                                                return (
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${lt?.isPaid ? 'bg-success-500' : 'bg-surface-400'}`} />
                                                        <span className="text-surface-700 font-medium">
                                                            {lt?.nameTh || lt?.name || b.leaveTypeId}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="text-center">
                                            <span className="inline-block min-w-[2rem] py-0.5 rounded-md bg-surface-100 font-medium">
                                                {b.entitledDays}
                                            </span>
                                        </td>
                                        <td className="text-center text-surface-600">{b.usedDays}</td>
                                        <td className="text-center">
                                            {b.pendingDays > 0 ? (
                                                <span className="text-warning-600 font-medium">
                                                    {b.pendingDays}
                                                </span>
                                            ) : (
                                                <span className="text-surface-300">-</span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <span className={`inline-block min-w-[2rem] py-0.5 rounded-md font-bold ${b.remainingDays <= 0
                                                    ? 'bg-error-100 text-error-700'
                                                    : b.remainingDays <= 2
                                                        ? 'bg-warning-100 text-warning-700'
                                                        : 'bg-success-100 text-success-700'
                                                }`}>
                                                {b.remainingDays}
                                            </span>
                                        </td>
                                        {isManager && (
                                            <td className="text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleOpenAdjustment(b)}
                                                        className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                                        title="ปรับยอดวันลา"
                                                        aria-label="แก้ไข"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenHistory(b)}
                                                        className="p-1.5 text-surface-600 hover:bg-surface-100 rounded transition-colors"
                                                        title="ดูประวัติการปรับยอด"
                                                    >
                                                        <History className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={isManager ? 7 : 6} className="text-center py-12 text-surface-500">
                                        <div className="text-4xl mb-2">📭</div>
                                        ไม่มีข้อมูลวันลาสำหรับเงื่อนไขที่เลือก
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > 0 && (
                    <div role="navigation" className="p-4 border-t border-surface-200 flex items-center justify-between">
                        <div className="text-sm text-surface-500">
                            แสดง {((page - 1) * pageSize) + 1} ถึง {Math.min(page * pageSize, total)} จาก {total} รายการ
                            <span className="hidden">ทั้งหมด {total} รายการ</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page <= 1}
                                className="px-3 py-1 rounded border border-surface-300 disabled:opacity-50 hover:bg-surface-50"
                                aria-label="ก่อนหน้า"
                            >
                                ก่อนหน้า
                            </button>
                            <span className="px-3 py-1 text-surface-600 bg-surface-50 rounded">
                                หน้า {page} / {totalPages || 1}
                            </span>
                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page >= totalPages}
                                className="px-3 py-1 rounded border border-surface-300 disabled:opacity-50 hover:bg-surface-50"
                                aria-label="ถัดไป"
                            >
                                ถัดไป
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Balance Adjustment Modal */}
            {selectedBalance && (
                <BalanceAdjustmentModal
                    isOpen={adjustmentModalOpen}
                    onClose={() => {
                        setAdjustmentModalOpen(false);
                        setSelectedBalance(null);
                    }}
                    balance={selectedBalance}
                    onSubmit={handleAdjustBalance}
                />
            )}

            {/* Adjustment History Modal */}
            {selectedBalance && (
                <AdjustmentHistoryModal
                    isOpen={historyModalOpen}
                    onClose={() => {
                        setHistoryModalOpen(false);
                        setSelectedBalance(null);
                    }}
                    balance={selectedBalance}
                    onLoadHistory={handleLoadHistory}
                />
            )}
        </div>
    );
}

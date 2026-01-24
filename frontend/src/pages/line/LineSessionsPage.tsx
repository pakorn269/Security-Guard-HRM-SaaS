import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Filter, Search, XCircle, Monitor, MapPin, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button, Card, Input, Modal, ModalFooter, LoadingSpinner } from '../../components/common';
import { lineLinkService, type LineSessionToken } from '../../services/line-link.service';

// Session card component
function SessionCard({ session, onRevoke }: { session: LineSessionToken; onRevoke: (session: LineSessionToken) => void }) {
    const { t, i18n } = useTranslation();

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString(i18n.language === 'th' ? 'th-TH' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getSessionStatus = () => {
        if (!session.isActive) {
            return {
                label: t('line.revoked', 'Revoked'),
                className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
                icon: <XCircle size={12} />,
            };
        }

        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilExpiry < 24) {
            return {
                label: t('line.expiringSoon', 'Expiring Soon'),
                className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                icon: <AlertTriangle size={12} />,
            };
        }

        return {
            label: t('line.active', 'Active'),
            className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            icon: <CheckCircle2 size={12} />,
        };
    };

    const status = getSessionStatus();

    return (
        <Card>
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Session Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                            {status.icon}
                            {status.label}
                        </span>
                    </div>

                    <div className="space-y-2 text-sm">
                        {/* User Agent */}
                        {session.userAgent && (
                            <div className="flex items-start gap-2">
                                <Monitor size={16} className="text-neutral-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-neutral-600 dark:text-neutral-400 break-words">
                                        {session.userAgent}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* IP Address */}
                        {session.ipAddress && (
                            <div className="flex items-center gap-2">
                                <MapPin size={16} className="text-neutral-400 flex-shrink-0" />
                                <p className="text-neutral-600 dark:text-neutral-400">
                                    {session.ipAddress}
                                </p>
                            </div>
                        )}

                        {/* Issued At */}
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-neutral-400 flex-shrink-0" />
                            <p className="text-neutral-600 dark:text-neutral-400">
                                <span className="font-medium">{t('line.issuedAt', 'Issued')}:</span>{' '}
                                {formatDate(session.issuedAt)}
                            </p>
                        </div>

                        {/* Expires At */}
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-neutral-400 flex-shrink-0" />
                            <p className="text-neutral-600 dark:text-neutral-400">
                                <span className="font-medium">{t('line.expiresAt', 'Expires')}:</span>{' '}
                                {formatDate(session.expiresAt)}
                            </p>
                        </div>

                        {/* Revoked Info */}
                        {!session.isActive && session.revokedAt && (
                            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                                <p className="text-sm text-error-600 dark:text-error-400">
                                    <span className="font-medium">{t('line.revokedAt', 'Revoked')}:</span>{' '}
                                    {formatDate(session.revokedAt)}
                                </p>
                                {session.revokedByName && (
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                        <span className="font-medium">{t('line.revokedBy', 'By')}:</span>{' '}
                                        {session.revokedByName}
                                    </p>
                                )}
                                {session.revokeReason && (
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                        <span className="font-medium">{t('line.reason', 'Reason')}:</span>{' '}
                                        {session.revokeReason}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                {session.isActive && (
                    <div className="flex sm:flex-col gap-2">
                        <Button
                            size="sm"
                            variant="danger"
                            leftIcon={<XCircle size={14} />}
                            onClick={() => onRevoke(session)}
                        >
                            {t('line.revoke', 'Revoke')}
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    );
}

export default function LineSessionsPage() {
    const { t, i18n } = useTranslation();

    const [sessions, setSessions] = useState<LineSessionToken[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterActive, setFilterActive] = useState<boolean | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Revoke modal state
    const [revokeSession, setRevokeSession] = useState<LineSessionToken | null>(null);
    const [revokeReason, setRevokeReason] = useState('');
    const [isRevoking, setIsRevoking] = useState(false);

    useEffect(() => {
        fetchSessions();
    }, [filterActive, page]);

    const fetchSessions = async () => {
        setIsLoading(true);
        try {
            const result = await lineLinkService.listSessions({
                isActive: filterActive === 'all' ? undefined : filterActive,
                page,
                pageSize: 20,
            });

            setSessions(result.data);
            setTotalPages(result.pagination.totalPages);
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRevoke = (session: LineSessionToken) => {
        setRevokeSession(session);
        setRevokeReason('');
    };

    const handleConfirmRevoke = async () => {
        if (!revokeSession) return;

        if (!revokeReason.trim() || revokeReason.length < 10) {
            alert(
                i18n.language === 'th'
                    ? 'กรุณาระบุเหตุผลอย่างน้อย 10 ตัวอักษร'
                    : 'Please provide a reason (minimum 10 characters)'
            );
            return;
        }

        setIsRevoking(true);
        try {
            await lineLinkService.revokeSession(revokeSession.id, revokeReason);

            // Close modal and refresh
            setRevokeSession(null);
            setRevokeReason('');
            alert(
                i18n.language === 'th'
                    ? 'ยกเลิกเซสชันเรียบร้อยแล้ว'
                    : 'Session revoked successfully'
            );
            fetchSessions();
        } catch (error) {
            console.error('Failed to revoke session:', error);
            alert(
                i18n.language === 'th'
                    ? 'ยกเลิกเซสชันไม่สำเร็จ'
                    : 'Failed to revoke session'
            );
        } finally {
            setIsRevoking(false);
        }
    };

    // Filter sessions by search query (local filtering)
    const filteredSessions = sessions.filter((session) => {
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        return (
            session.userAgent?.toLowerCase().includes(query) ||
            session.ipAddress?.toLowerCase().includes(query) ||
            session.liffSessionId?.toLowerCase().includes(query)
        );
    });

    if (isLoading && page === 1) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <Shield size={28} className="text-primary-500" />
                        {t('line.sessions', 'LINE Sessions')}
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                        {t('line.sessionsDesc', 'Manage active LINE sessions and revoke access')}
                    </p>
                </div>
            </div>

            {/* Filters and Search */}
            <Card>
                <div className="space-y-4">
                    {/* Status Filter */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Filter size={18} className="text-neutral-400" />
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            {t('common.filter', 'Filter')}:
                        </span>
                        {(['all', true, false] as const).map((filter) => (
                            <button
                                key={String(filter)}
                                onClick={() => {
                                    setFilterActive(filter);
                                    setPage(1);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    filterActive === filter
                                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                }`}
                            >
                                {filter === 'all'
                                    ? t('common.all', 'All')
                                    : filter === true
                                    ? t('line.active', 'Active')
                                    : t('line.revoked', 'Revoked')}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="flex items-center gap-2">
                        <Search size={18} className="text-neutral-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={
                                i18n.language === 'th'
                                    ? 'ค้นหาด้วย IP, User Agent, Session ID...'
                                    : 'Search by IP, User Agent, Session ID...'
                            }
                            className="flex-1"
                        />
                    </div>
                </div>
            </Card>

            {/* Sessions List */}
            {filteredSessions.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <Shield size={48} className="text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                        <p className="text-neutral-500 dark:text-neutral-400">
                            {t('line.noSessions', 'No sessions found')}
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredSessions.map((session) => (
                        <SessionCard key={session.id} session={session} onRevoke={handleRevoke} />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        {t('common.previous', 'Previous')}
                    </Button>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {t('common.pageOf', 'Page {{page}} of {{total}}', { page, total: totalPages })}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        {t('common.next', 'Next')}
                    </Button>
                </div>
            )}

            {/* Revoke Modal */}
            {revokeSession && (
                <Modal
                    isOpen={true}
                    onClose={() => {
                        setRevokeSession(null);
                        setRevokeReason('');
                    }}
                    title={t('line.revokeSession', 'Revoke Session')}
                    size="sm"
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                ⚠️{' '}
                                {i18n.language === 'th'
                                    ? 'การยกเลิกเซสชันจะบังคับให้ผู้ใช้ออกจากระบบทันที'
                                    : 'Revoking this session will immediately log the user out'}
                            </p>
                        </div>

                        {/* Session Info */}
                        <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg text-sm space-y-1">
                            {revokeSession.userAgent && (
                                <p className="text-neutral-700 dark:text-neutral-300 break-words">
                                    <span className="font-medium">{t('line.device', 'Device')}:</span>{' '}
                                    {revokeSession.userAgent}
                                </p>
                            )}
                            {revokeSession.ipAddress && (
                                <p className="text-neutral-700 dark:text-neutral-300">
                                    <span className="font-medium">IP:</span> {revokeSession.ipAddress}
                                </p>
                            )}
                        </div>

                        <Input
                            label={t('line.revokeReason', 'Revoke Reason (minimum 10 characters)')}
                            value={revokeReason}
                            onChange={(e) => setRevokeReason(e.target.value)}
                            placeholder={
                                i18n.language === 'th'
                                    ? 'เช่น พบการเข้าถึงที่ผิดปกติ'
                                    : 'e.g., Suspicious activity detected'
                            }
                        />
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {revokeReason.length} / 10 {i18n.language === 'th' ? 'ตัวอักษร' : 'characters'}
                        </p>
                    </div>
                    <ModalFooter>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setRevokeSession(null);
                                setRevokeReason('');
                            }}
                        >
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleConfirmRevoke}
                            isLoading={isRevoking}
                            disabled={revokeReason.length < 10}
                        >
                            {t('line.revoke', 'Revoke')}
                        </Button>
                    </ModalFooter>
                </Modal>
            )}
        </div>
    );
}

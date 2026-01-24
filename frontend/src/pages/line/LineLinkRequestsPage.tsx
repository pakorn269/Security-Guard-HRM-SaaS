import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Clock, Users, Filter } from 'lucide-react';
import { Button, Card, LoadingSpinner, Modal, ModalFooter, Input } from '../../components/common';
import { lineLinkService, type LineLinkRequest, type LineLinkRequestStatus } from '../../services/line-link.service';

// Status badge component
function StatusBadge({ status }: { status: LineLinkRequestStatus }) {
    const statusStyles: Record<LineLinkRequestStatus, string> = {
        pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        expired: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
        cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    };

    const statusLabels: Record<LineLinkRequestStatus, string> = {
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        expired: 'Expired',
        cancelled: 'Cancelled',
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}
        >
            {statusLabels[status]}
        </span>
    );
}

// Request type badge
function RequestTypeBadge({ type }: { type: 'link' | 'unlink' }) {
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                type === 'link'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
            }`}
        >
            {type === 'link' ? 'Link' : 'Unlink'}
        </span>
    );
}

export default function LineLinkRequestsPage() {
    const { t } = useTranslation();

    const [requests, setRequests] = useState<LineLinkRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState<LineLinkRequestStatus | 'all'>('pending');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Review modal state
    const [reviewRequest, setReviewRequest] = useState<LineLinkRequest | null>(null);
    const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
    const [reviewNotes, setReviewNotes] = useState('');
    const [isReviewing, setIsReviewing] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, [selectedStatus, page]);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const result = await lineLinkService.listLinkRequests({
                status: selectedStatus === 'all' ? undefined : selectedStatus,
                page,
                pageSize: 20,
            });

            setRequests(result.data);
            setTotalPages(result.pagination.totalPages);
        } catch (error) {
            console.error('Failed to fetch link requests:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReview = (request: LineLinkRequest, action: 'approve' | 'reject') => {
        setReviewRequest(request);
        setReviewAction(action);
        setReviewNotes('');
    };

    const handleConfirmReview = async () => {
        if (!reviewRequest || !reviewAction) return;

        setIsReviewing(true);
        try {
            if (reviewRequest.requestType === 'link') {
                if (reviewAction === 'approve') {
                    await lineLinkService.approveLinkRequest(reviewRequest.id, {
                        reviewNotes: reviewNotes || undefined,
                    });
                } else {
                    await lineLinkService.rejectLinkRequest(reviewRequest.id, {
                        reviewNotes: reviewNotes || 'Rejected by admin',
                    });
                }
            } else {
                // Unlink request
                if (reviewAction === 'approve') {
                    await lineLinkService.approveUnlinkRequest(reviewRequest.id, {
                        reviewNotes: reviewNotes || undefined,
                    });
                } else {
                    await lineLinkService.rejectLinkRequest(reviewRequest.id, {
                        reviewNotes: reviewNotes || 'Rejected by admin',
                    });
                }
            }

            // Close modal and refresh
            setReviewRequest(null);
            setReviewAction(null);
            setReviewNotes('');
            fetchRequests();
        } catch (error) {
            console.error('Failed to review request:', error);
            alert('Failed to process request');
        } finally {
            setIsReviewing(false);
        }
    };

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
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                        {t('line.linkRequests', 'LINE Link Requests')}
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                        {t('line.linkRequestsDesc', 'Approve or reject LINE account link requests')}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="flex items-center gap-2 flex-wrap">
                    <Filter size={18} className="text-neutral-400" />
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {t('common.filter', 'Filter')}:
                    </span>
                    {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => {
                                setSelectedStatus(status);
                                setPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                selectedStatus === status
                                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            }`}
                        >
                            {status === 'all' ? t('common.all', 'All') : status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </Card>

            {/* Requests List */}
            {requests.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <Users size={48} className="text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                        <p className="text-neutral-500 dark:text-neutral-400">
                            {t('line.noLinkRequests', 'No link requests found')}
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-4">
                    {requests.map((request) => (
                        <Card key={request.id}>
                            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                {/* LINE Profile */}
                                <div className="flex items-start gap-3 flex-1">
                                    {request.linePictureUrl ? (
                                        <img
                                            src={request.linePictureUrl}
                                            alt={request.lineDisplayName || 'LINE User'}
                                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                                            <Users size={24} className="text-green-600 dark:text-green-400" />
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-medium text-neutral-900 dark:text-white">
                                                {request.lineDisplayName || 'LINE User'}
                                            </h3>
                                            <RequestTypeBadge type={request.requestType} />
                                            <StatusBadge status={request.status} />
                                        </div>

                                        <div className="mt-2 space-y-1 text-sm">
                                            <p className="text-neutral-600 dark:text-neutral-400">
                                                <span className="font-medium">{t('employees.employee', 'Employee')}:</span>{' '}
                                                {request.employeeName || 'Unknown'} ({request.employeeCode})
                                            </p>
                                            <p className="text-neutral-600 dark:text-neutral-400">
                                                <span className="font-medium">{t('common.company', 'Company')}:</span>{' '}
                                                {request.companyName}
                                            </p>

                                            {request.requestType === 'link' && (
                                                <>
                                                    <p className="text-neutral-600 dark:text-neutral-400">
                                                        <span className="font-medium">{t('employees.phone', 'Phone')}:</span>{' '}
                                                        {request.enteredPhone}{' '}
                                                        {request.phoneMatched && (
                                                            <span className="text-green-600 dark:text-green-400">✓</span>
                                                        )}
                                                    </p>
                                                    <p className="text-neutral-600 dark:text-neutral-400">
                                                        <span className="font-medium">{t('employees.code', 'Code')}:</span>{' '}
                                                        {request.enteredEmployeeCode}{' '}
                                                        {request.codeMatched && (
                                                            <span className="text-green-600 dark:text-green-400">✓</span>
                                                        )}
                                                    </p>
                                                </>
                                            )}

                                            {request.requestType === 'unlink' && request.unlinkReason && (
                                                <p className="text-neutral-600 dark:text-neutral-400">
                                                    <span className="font-medium">{t('line.reason', 'Reason')}:</span>{' '}
                                                    {request.unlinkReason}
                                                </p>
                                            )}

                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                <Clock size={12} className="inline mr-1" />
                                                {t('common.requested', 'Requested')}: {new Date(request.createdAt).toLocaleString()}
                                            </p>

                                            {request.reviewedAt && (
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                    {t('common.reviewedBy', 'Reviewed by')}: {request.reviewedByName} on{' '}
                                                    {new Date(request.reviewedAt).toLocaleString()}
                                                </p>
                                            )}

                                            {request.reviewNotes && (
                                                <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded">
                                                    <span className="font-medium">{t('common.notes', 'Notes')}:</span>{' '}
                                                    {request.reviewNotes}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                {request.status === 'pending' && (
                                    <div className="flex gap-2 sm:flex-col">
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            leftIcon={<CheckCircle size={14} />}
                                            onClick={() => handleReview(request, 'approve')}
                                        >
                                            {t('common.approve', 'Approve')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="danger"
                                            leftIcon={<XCircle size={14} />}
                                            onClick={() => handleReview(request, 'reject')}
                                        >
                                            {t('common.reject', 'Reject')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card>
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

            {/* Review Modal */}
            {reviewRequest && reviewAction && (
                <Modal
                    isOpen={true}
                    onClose={() => {
                        setReviewRequest(null);
                        setReviewAction(null);
                        setReviewNotes('');
                    }}
                    title={
                        reviewAction === 'approve'
                            ? t('line.approveRequest', 'Approve Request')
                            : t('line.rejectRequest', 'Reject Request')
                    }
                    size="sm"
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                                {reviewRequest.lineDisplayName}
                            </p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                {reviewRequest.requestType === 'link'
                                    ? t('line.linkRequestFor', 'Link request for {{name}}', {
                                          name: reviewRequest.employeeName,
                                      })
                                    : t('line.unlinkRequestFor', 'Unlink request for {{name}}', {
                                          name: reviewRequest.employeeName,
                                      })}
                            </p>

                            {reviewRequest.requestType === 'unlink' && reviewRequest.unlinkReason && (
                                <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-2">
                                    <span className="font-medium">{t('line.reason', 'Reason')}:</span>{' '}
                                    {reviewRequest.unlinkReason}
                                </p>
                            )}
                        </div>

                        {reviewAction === 'approve' && reviewRequest.requestType === 'unlink' && (
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                    ⚠️ {t('line.unlinkWarning', 'Approving this will unlink the LINE account and revoke all active sessions.')}
                                </p>
                            </div>
                        )}

                        <Input
                            label={t('line.reviewNotes', 'Review Notes (optional)')}
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder={
                                reviewAction === 'approve'
                                    ? t('line.approveNotesPlaceholder', 'e.g., Verified employee identity')
                                    : t('line.rejectNotesPlaceholder', 'e.g., Unable to verify identity')
                            }
                        />
                    </div>
                    <ModalFooter>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setReviewRequest(null);
                                setReviewAction(null);
                                setReviewNotes('');
                            }}
                        >
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button
                            variant={reviewAction === 'approve' ? 'primary' : 'danger'}
                            onClick={handleConfirmReview}
                            isLoading={isReviewing}
                        >
                            {reviewAction === 'approve'
                                ? t('common.approve', 'Approve')
                                : t('common.reject', 'Reject')}
                        </Button>
                    </ModalFooter>
                </Modal>
            )}
        </div>
    );
}

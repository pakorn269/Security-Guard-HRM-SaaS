import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, Trash2, X } from 'lucide-react';
import { Button } from '../common';

interface BulkActionsToolbarProps {
    selectedCount: number;
    onActivate?: () => void;
    onDeactivate?: () => void;
    onDelete?: () => void;
    onClear: () => void;
    isProcessing?: boolean;
}

export default function BulkActionsToolbar({
    selectedCount,
    onActivate,
    onDeactivate,
    onDelete,
    onClear,
    isProcessing = false,
}: BulkActionsToolbarProps) {
    const { t } = useTranslation();

    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-lg rounded-lg px-4 py-3 flex items-center gap-4">
                {/* Selection Count */}
                <div className="flex items-center gap-2 pr-4 border-r border-neutral-200 dark:border-neutral-700">
                    <div className="w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                            {selectedCount}
                        </span>
                    </div>
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {selectedCount === 1
                            ? t('common.selectedSingular', '1 selected')
                            : t('common.selectedPlural', `${selectedCount} selected`)}
                    </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {onActivate && (
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<CheckCircle2 size={14} />}
                            onClick={onActivate}
                            disabled={isProcessing}
                            className="bg-success-50 dark:bg-success-950/30 border-success-200 dark:border-success-800 text-success-700 dark:text-success-400 hover:bg-success-100 dark:hover:bg-success-900/50"
                        >
                            {t('common.activate', 'Activate')}
                        </Button>
                    )}

                    {onDeactivate && (
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<XCircle size={14} />}
                            onClick={onDeactivate}
                            disabled={isProcessing}
                            className="bg-warning-50 dark:bg-warning-950/30 border-warning-200 dark:border-warning-800 text-warning-700 dark:text-warning-400 hover:bg-warning-100 dark:hover:bg-warning-900/50"
                        >
                            {t('common.deactivate', 'Deactivate')}
                        </Button>
                    )}

                    {onDelete && (
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Trash2 size={14} />}
                            onClick={onDelete}
                            disabled={isProcessing}
                            className="bg-error-50 dark:bg-error-950/30 border-error-200 dark:border-error-800 text-error-700 dark:text-error-400 hover:bg-error-100 dark:hover:bg-error-900/50"
                        >
                            {t('common.delete', 'Delete')}
                        </Button>
                    )}
                </div>

                {/* Clear Selection */}
                <button
                    onClick={onClear}
                    disabled={isProcessing}
                    className="ml-2 p-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors disabled:opacity-50"
                    title={t('common.clearSelection', 'Clear selection')}
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}

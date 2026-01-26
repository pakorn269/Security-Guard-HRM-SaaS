import { useTranslation } from 'react-i18next';
import { CheckSquare, Send, Trash2, X } from 'lucide-react';
import { Button } from '../common';

export interface BulkActionToolbarProps {
  /** Number of currently selected shifts */
  selectedCount: number;
  /** Callback when "Select All" is clicked */
  onSelectAll: () => void;
  /** Callback when "Publish" is clicked */
  onPublish: () => void;
  /** Callback when "Delete" is clicked */
  onDelete: () => void;
  /** Callback when "Cancel" (clear selection) is clicked */
  onCancel: () => void;
}

/**
 * BulkActionToolbar - Floating bottom toolbar for bulk shift operations
 *
 * Appears when one or more shifts are selected. Provides actions:
 * - Select All: Select all visible shifts
 * - Publish: Publish selected draft shifts
 * - Delete: Delete selected shifts
 * - Cancel: Clear the selection
 */
export default function BulkActionToolbar({
  selectedCount,
  onSelectAll,
  onPublish,
  onDelete,
  onCancel,
}: BulkActionToolbarProps) {
  const { t } = useTranslation();

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-4 flex items-center gap-4">
        {/* Selection info */}
        <div className="flex items-center gap-2">
          <CheckSquare size={20} className="text-primary-600 dark:text-primary-400" />
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {selectedCount} {t('schedule.shiftsSelected', 'กะที่เลือก')}
          </span>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-600" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onSelectAll}>
            {t('schedule.selectAll', 'เลือกทั้งหมด')}
          </Button>

          <Button variant="primary" size="sm" leftIcon={<Send size={16} />} onClick={onPublish}>
            {t('schedule.publish', 'ประกาศ')}
          </Button>

          <Button variant="danger" size="sm" leftIcon={<Trash2 size={16} />} onClick={onDelete}>
            {t('common.delete', 'ลบ')}
          </Button>

          <Button variant="ghost" size="sm" leftIcon={<X size={16} />} onClick={onCancel}>
            {t('common.cancel', 'ยกเลิก')}
          </Button>
        </div>
      </div>
    </div>
  );
}

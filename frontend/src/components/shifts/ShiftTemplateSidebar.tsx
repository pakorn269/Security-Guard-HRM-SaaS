import { useEffect, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Clock, Grip, X } from 'lucide-react';
import { listShiftTemplates } from '../../services/shift.service';
import type { ShiftTemplate } from '../../types/shift.types';
import Card from '../common/Card';
import LoadingSpinner from '../common/LoadingSpinner';
import { useTranslation } from 'react-i18next';

interface ShiftTemplateSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DraggableTemplateCardProps {
  template: ShiftTemplate;
}

function DraggableTemplateCard({ template }: DraggableTemplateCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `template-${template.id}`,
    data: {
      type: 'template',
      template,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        group relative p-3 rounded-lg border-2 border-dashed cursor-grab active:cursor-grabbing
        transition-all hover:shadow-md
        ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}
        bg-white dark:bg-neutral-800
        border-neutral-300 dark:border-neutral-600
        hover:border-primary-400 dark:hover:border-primary-500
        hover:bg-primary-50/50 dark:hover:bg-primary-900/10
      `}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: template.color,
      }}
    >
      {/* Drag Handle Icon */}
      <div className="absolute top-2 right-2 text-neutral-400 dark:text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity">
        <Grip size={16} />
      </div>

      {/* Template Name */}
      <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100 mb-2 pr-6">
        {template.nameTh || template.name}
      </div>

      {/* Time Range */}
      <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
        <Clock size={12} />
        <span className="font-mono">
          {template.startTime} - {template.endTime}
        </span>
        {template.isOvernight && (
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400">
            +1
          </span>
        )}
      </div>

      {/* Break Minutes */}
      {template.breakMinutes > 0 && (
        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
          พัก {template.breakMinutes} นาที
        </div>
      )}
    </div>
  );
}

export default function ShiftTemplateSidebar({ isOpen, onClose }: ShiftTemplateSidebarProps) {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
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
      const data = await listShiftTemplates(false); // Only active templates
      setTemplates(data);
    } catch (err: any) {
      console.error('Error loading shift templates:', err);
      setError(err?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
              {t('schedule.templateSidebar', 'กะสำเร็จรูป')}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {t('schedule.dragToSchedule', 'ลากไปวางในตาราง')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
            <button
              onClick={loadTemplates}
              className="mt-3 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              {t('common.retry', 'ลองอีกครั้ง')}
            </button>
          </div>
        ) : templates.length === 0 ? (
          <Card variant="bordered">
            <div className="text-center py-8">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {t('schedule.noTemplates', 'ไม่มีกะสำเร็จรูป')}
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                {t('schedule.createTemplatesFirst', 'สร้างกะสำเร็จรูปในเมนู "รูปแบบกะ"')}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <DraggableTemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}
      </div>

      {/* Footer Hint */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        <div className="flex items-start gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex-shrink-0 mt-0.5">💡</div>
          <div>
            <p className="font-medium mb-1">
              {t('schedule.quickApplyTip', 'วิธีใช้: ลากกะไปวางในช่องว่าง')}
            </p>
            <p className="text-[11px]">
              {t(
                'schedule.quickApplyDetail',
                'ระบบจะสร้างกะงานให้อัตโนมัติตามเวลาและรายละเอียดของกะสำเร็จรูป'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

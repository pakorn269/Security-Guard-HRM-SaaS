import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { Button } from '../common';
import { sitesService, type Zone } from '../../services/sites.service';

interface InlineZoneFormProps {
    siteId: string;
    existingZoneCodes: string[];
    onSuccess: (zone: Zone) => void;
    onCancel: () => void;
}

export default function InlineZoneForm({
    siteId,
    existingZoneCodes,
    onSuccess,
    onCancel,
}: InlineZoneFormProps) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus name input when component mounts
    useEffect(() => {
        nameInputRef.current?.focus();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!name.trim()) {
            setError(t('sites.zoneNameRequired', 'Zone name is required'));
            return;
        }

        // Check for duplicate zone code
        if (code.trim() && existingZoneCodes.includes(code.trim())) {
            setError(t('sites.codeExists', 'Zone code already exists'));
            return;
        }

        setIsSubmitting(true);

        try {
            const newZone = await sitesService.createZone({
                siteId,
                name: name.trim(),
                code: code.trim() || undefined,
            });

            // Clear form
            setName('');
            setCode('');
            setError('');

            // Notify parent
            onSuccess(newZone);
        } catch (err) {
            console.error('Failed to create zone:', err);
            setError(t('common.error', 'An error occurred'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            {error && (
                <div className="mb-3 text-xs text-error-600 dark:text-error-400">
                    {error}
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
                {/* Zone Name Input */}
                <div className="flex-1">
                    <input
                        ref={nameInputRef}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('sites.zoneName', 'Zone Name')}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
                    />
                </div>

                {/* Zone Code Input */}
                <div className="w-full sm:w-32">
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder={t('sites.zoneCode', 'Code')}
                        disabled={isSubmitting}
                        maxLength={50}
                        className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        leftIcon={<Plus size={14} />}
                        isLoading={isSubmitting}
                        className="whitespace-nowrap"
                    >
                        {t('common.add', 'Add')}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        leftIcon={<X size={14} />}
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        {t('common.cancel', 'Cancel')}
                    </Button>
                </div>
            </div>

            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                {t('sites.inlineZoneHint', 'Quick add - Use edit button for description and other details')}
            </p>
        </form>
    );
}

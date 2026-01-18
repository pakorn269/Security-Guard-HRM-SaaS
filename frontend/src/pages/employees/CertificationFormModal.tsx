import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalFooter, Button, Input } from '../../components/common';
import { employeeService, type CreateCertificationData, type UpdateCertificationData } from '../../services/employee.service';
import type { Certification } from '../../types/employee.types';

interface CertificationFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    employeeId: string;
    certification?: Certification | null;
}

export default function CertificationFormModal({
    isOpen,
    onClose,
    onSuccess,
    employeeId,
    certification,
}: CertificationFormModalProps) {
    const { t } = useTranslation();
    const isEditing = !!certification;

    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        type: certification?.type || '',
        typeTh: certification?.typeTh || '',
        licenseNumber: certification?.licenseNumber || '',
        issueDate: certification?.issueDate || new Date().toISOString().split('T')[0],
        expiryDate: certification?.expiryDate || '',
        documentUrl: certification?.documentUrl || '',
        notes: certification?.notes || '',
    });

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: '' }));
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.type.trim()) {
            newErrors.type = t('validation.required', 'This field is required');
        }
        if (!formData.issueDate) {
            newErrors.issueDate = t('validation.required', 'This field is required');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setIsLoading(true);
        try {
            if (isEditing && certification) {
                const updateData: UpdateCertificationData = {
                    type: formData.type,
                    typeTh: formData.typeTh || null,
                    licenseNumber: formData.licenseNumber || null,
                    issueDate: formData.issueDate,
                    expiryDate: formData.expiryDate || null,
                    documentUrl: formData.documentUrl || null,
                    notes: formData.notes || null,
                };
                await employeeService.updateCertification(employeeId, certification.id, updateData);
            } else {
                const createData: CreateCertificationData = {
                    type: formData.type,
                    typeTh: formData.typeTh || undefined,
                    licenseNumber: formData.licenseNumber || undefined,
                    issueDate: formData.issueDate,
                    expiryDate: formData.expiryDate || undefined,
                    documentUrl: formData.documentUrl || undefined,
                    notes: formData.notes || undefined,
                };
                await employeeService.createCertification(employeeId, createData);
            }
            onSuccess();
        } catch (error: unknown) {
            console.error('Failed to save certification:', error);
            if (error && typeof error === 'object' && 'message' in error) {
                setErrors({ submit: (error as { message: string }).message });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? t('certifications.edit', 'Edit Certification') : t('certifications.add', 'Add Certification')}
            size="md"
        >
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label={t('certifications.type', 'Type (English)')}
                            value={formData.type}
                            onChange={(e) => handleChange('type', e.target.value)}
                            error={errors.type}
                            placeholder="Security Guard License"
                            required
                        />
                        <Input
                            label={t('certifications.typeTh', 'Type (Thai)')}
                            value={formData.typeTh}
                            onChange={(e) => handleChange('typeTh', e.target.value)}
                            placeholder="ใบอนุญาตรักษาความปลอดภัย"
                        />
                    </div>

                    <Input
                        label={t('certifications.licenseNumber', 'License Number')}
                        value={formData.licenseNumber}
                        onChange={(e) => handleChange('licenseNumber', e.target.value)}
                        placeholder="ABC123456"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label={t('certifications.issueDate', 'Issue Date')}
                            type="date"
                            value={formData.issueDate}
                            onChange={(e) => handleChange('issueDate', e.target.value)}
                            error={errors.issueDate}
                            required
                        />
                        <Input
                            label={t('certifications.expiryDate', 'Expiry Date')}
                            type="date"
                            value={formData.expiryDate}
                            onChange={(e) => handleChange('expiryDate', e.target.value)}
                        />
                    </div>

                    <Input
                        label={t('certifications.documentUrl', 'Document URL')}
                        value={formData.documentUrl}
                        onChange={(e) => handleChange('documentUrl', e.target.value)}
                        placeholder="https://..."
                    />

                    <Input
                        label={t('certifications.notes', 'Notes')}
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                    />

                    {errors.submit && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
                            {errors.submit}
                        </div>
                    )}
                </div>

                <ModalFooter>
                    <Button variant="ghost" onClick={onClose} type="button">
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button type="submit" isLoading={isLoading}>
                        {isEditing ? t('common.save', 'Save') : t('certifications.add', 'Add Certification')}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}

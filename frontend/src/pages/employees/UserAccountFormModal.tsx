import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalFooter, Button, Input, Select } from '../../components/common';
import { employeeService, type CreateUserAccountData } from '../../services/employee.service';

interface UserAccountFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    employeeId: string;
    employeeEmail?: string | null;
}

export default function UserAccountFormModal({
    isOpen,
    onClose,
    onSuccess,
    employeeId,
    employeeEmail,
}: UserAccountFormModalProps) {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState<CreateUserAccountData>({
        email: employeeEmail || '',
        password: '',
        role: 'guard',
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                email: employeeEmail || '',
                password: '',
                role: 'guard',
            });
            setErrors({});
        }
    }, [isOpen, employeeEmail]);

    const handleChange = (field: keyof CreateUserAccountData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: '' }));
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.email) {
            newErrors.email = t('validation.required', 'This field is required');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = t('validation.invalidEmail', 'Invalid email address');
        }

        if (!formData.password || formData.password.length < 8) {
            newErrors.password = t('validation.passwordMinLength', 'Password must be at least 8 characters');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setIsLoading(true);
        try {
            await employeeService.createUserAccount(employeeId, formData);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Failed to create user account:', error);
            if (error.response?.data?.message) {
                setErrors({ submit: error.response.data.message });
            } else if (error.message) {
                setErrors({ submit: error.message });
            } else {
                setErrors({ submit: 'Failed to create user account' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const roleOptions = [
        { value: 'guard', label: t('roles.guard', 'Security Guard') },
        { value: 'manager', label: t('roles.manager', 'Manager') },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('employees.createUserAccount', 'Create User Account')}
            size="md"
        >
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <Input
                        label={t('employees.email', 'Email')}
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        error={errors.email}
                        required
                    />

                    <Input
                        label={t('employees.password', 'Password')}
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        error={errors.password}
                        placeholder="••••••••"
                        required
                    />

                    <Select
                        label={t('employees.userRole', 'User Role')}
                        options={roleOptions}
                        value={formData.role}
                        onChange={(e) => handleChange('role', e.target.value as 'manager' | 'guard')}
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
                        {t('employees.createAccount', 'Create Account')}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}

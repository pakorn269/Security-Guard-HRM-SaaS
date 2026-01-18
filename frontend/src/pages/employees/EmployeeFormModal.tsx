import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalFooter, Button, Input, Select } from '../../components/common';
import { employeeService, type EmployeeWithUser, type CreateEmployeeData, type UpdateEmployeeData } from '../../services/employee.service';

interface EmployeeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    employee?: EmployeeWithUser | null;
}

export default function EmployeeFormModal({
    isOpen,
    onClose,
    onSuccess,
    employee,
}: EmployeeFormModalProps) {
    const { t } = useTranslation();
    const isEditing = !!employee;

    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Form state
    const [formData, setFormData] = useState({
        employeeCode: employee?.employeeCode || '',
        fullName: employee?.fullName || '',
        fullNameTh: employee?.fullNameTh || '',
        phone: employee?.phone || '',
        email: employee?.email || '',
        address: employee?.address || '',
        emergencyContactName: employee?.emergencyContactName || '',
        emergencyContactPhone: employee?.emergencyContactPhone || '',
        hireDate: employee?.hireDate || new Date().toISOString().split('T')[0],
        notes: employee?.notes || '',
        createUserAccount: false,
        userRole: 'guard' as 'manager' | 'guard',
        userPassword: '',
    });

    const handleChange = (field: string, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: '' }));
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.employeeCode.trim()) {
            newErrors.employeeCode = t('validation.required', 'This field is required');
        }
        if (!formData.fullName.trim()) {
            newErrors.fullName = t('validation.required', 'This field is required');
        }
        if (!formData.hireDate) {
            newErrors.hireDate = t('validation.required', 'This field is required');
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = t('validation.invalidEmail', 'Invalid email address');
        }
        if (formData.createUserAccount) {
            if (!formData.email) {
                newErrors.email = t('validation.emailRequiredForAccount', 'Email is required for user account');
            }
            if (!formData.userPassword || formData.userPassword.length < 8) {
                newErrors.userPassword = t('validation.passwordMinLength', 'Password must be at least 8 characters');
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setIsLoading(true);
        try {
            if (isEditing && employee) {
                const updateData: UpdateEmployeeData = {
                    employeeCode: formData.employeeCode,
                    fullName: formData.fullName,
                    fullNameTh: formData.fullNameTh || null,
                    phone: formData.phone || null,
                    email: formData.email || null,
                    address: formData.address || null,
                    emergencyContactName: formData.emergencyContactName || null,
                    emergencyContactPhone: formData.emergencyContactPhone || null,
                    hireDate: formData.hireDate,
                    notes: formData.notes || null,
                };
                await employeeService.update(employee.id, updateData);
            } else {
                const createData: CreateEmployeeData = {
                    employeeCode: formData.employeeCode,
                    fullName: formData.fullName,
                    fullNameTh: formData.fullNameTh || undefined,
                    phone: formData.phone || undefined,
                    email: formData.email || undefined,
                    address: formData.address || undefined,
                    emergencyContactName: formData.emergencyContactName || undefined,
                    emergencyContactPhone: formData.emergencyContactPhone || undefined,
                    hireDate: formData.hireDate,
                    notes: formData.notes || undefined,
                    createUserAccount: formData.createUserAccount,
                    userRole: formData.createUserAccount ? formData.userRole : undefined,
                    userPassword: formData.createUserAccount ? formData.userPassword : undefined,
                };
                await employeeService.create(createData);
            }
            onSuccess();
        } catch (error: unknown) {
            console.error('Failed to save employee:', error);
            // Handle API error
            if (error && typeof error === 'object' && 'message' in error) {
                setErrors({ submit: (error as { message: string }).message });
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
            title={isEditing ? t('employees.editEmployee', 'Edit Employee') : t('employees.addEmployee', 'Add Employee')}
            size="lg"
        >
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label={t('employees.code', 'Employee Code')}
                            value={formData.employeeCode}
                            onChange={(e) => handleChange('employeeCode', e.target.value)}
                            error={errors.employeeCode}
                            placeholder="EMP001"
                            required
                        />
                        <Input
                            label={t('employees.hireDate', 'Hire Date')}
                            type="date"
                            value={formData.hireDate}
                            onChange={(e) => handleChange('hireDate', e.target.value)}
                            error={errors.hireDate}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label={t('employees.fullName', 'Full Name (English)')}
                            value={formData.fullName}
                            onChange={(e) => handleChange('fullName', e.target.value)}
                            error={errors.fullName}
                            required
                        />
                        <Input
                            label={t('employees.fullNameTh', 'Full Name (Thai)')}
                            value={formData.fullNameTh}
                            onChange={(e) => handleChange('fullNameTh', e.target.value)}
                        />
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label={t('employees.phone', 'Phone')}
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            placeholder="0812345678"
                        />
                        <Input
                            label={t('employees.email', 'Email')}
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            error={errors.email}
                        />
                    </div>

                    <Input
                        label={t('employees.address', 'Address')}
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                    />

                    {/* Emergency Contact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label={t('employees.emergencyContactName', 'Emergency Contact Name')}
                            value={formData.emergencyContactName}
                            onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                        />
                        <Input
                            label={t('employees.emergencyContactPhone', 'Emergency Contact Phone')}
                            type="tel"
                            value={formData.emergencyContactPhone}
                            onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
                        />
                    </div>

                    <Input
                        label={t('employees.notes', 'Notes')}
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                    />

                    {/* Create User Account */}
                    {!isEditing && (
                        <div className="border-t border-surface-200 dark:border-surface-700 pt-4 mt-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.createUserAccount}
                                    onChange={(e) => handleChange('createUserAccount', e.target.checked)}
                                    className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                                    {t('employees.createUserAccount', 'Create user account for this employee')}
                                </span>
                            </label>

                            {formData.createUserAccount && (
                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                                    <Select
                                        label={t('employees.userRole', 'User Role')}
                                        options={roleOptions}
                                        value={formData.userRole}
                                        onChange={(e) => handleChange('userRole', e.target.value)}
                                    />
                                    <Input
                                        label={t('employees.password', 'Password')}
                                        type="password"
                                        value={formData.userPassword}
                                        onChange={(e) => handleChange('userPassword', e.target.value)}
                                        error={errors.userPassword}
                                        placeholder="••••••••"
                                    />
                                </div>
                            )}
                        </div>
                    )}

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
                        {isEditing ? t('common.save', 'Save') : t('employees.addEmployee', 'Add Employee')}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}

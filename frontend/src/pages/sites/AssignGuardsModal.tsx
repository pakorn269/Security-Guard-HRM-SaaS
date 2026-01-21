import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, UserPlus, Clock } from 'lucide-react';
import { Modal, Button, Input, Select, Badge, Avatar } from '../../components/common'; // Assuming these exist
import { employeeService, type EmployeeWithUser } from '../../services/employee.service';
import {
    listShiftTemplates,
    bulkCreateShifts,
    type ShiftTemplate,
    type CreateShiftRequest
} from '../../services/shift.service';
import type { Site } from '../../services/sites.service';

interface AssignGuardsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    site: Site | null;
}

const assignSchema = z.object({
    date: z.string().min(1, 'Date is required'),
    shiftTemplateId: z.string().min(1, 'Shift template is required'),
    zoneId: z.string().optional(),
});

export default function AssignGuardsModal({ isOpen, onClose, onSuccess, site }: AssignGuardsModalProps) {
    const { t } = useTranslation();
    const [employees, setEmployees] = useState<EmployeeWithUser[]>([]);
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    const { control, register, handleSubmit, watch, formState: { errors } } = useForm({
        resolver: zodResolver(assignSchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            shiftTemplateId: '',
            zoneId: 'all' // 'all' means no specific zone (default to site)
        }
    });

    const selectedTemplateId = watch('shiftTemplateId');
    const selectedTemplate = templates.find(temp => temp.id === selectedTemplateId);

    // Fetch initial data
    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                setIsLoading(true);
                try {
                    const [empData, tempData] = await Promise.all([
                        employeeService.list({ status: 'active', pageSize: 100 }), // Fetch active employees
                        listShiftTemplates(false)
                    ]);
                    setEmployees(empData.data);
                    setTemplates(tempData);
                } catch (err) {
                    console.error('Failed to load data', err);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
            setSelectedEmployeeIds(new Set());
        }
    }, [isOpen]);

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp =>
            emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [employees, searchQuery]);

    const toggleEmployee = (id: string) => {
        const newSet = new Set(selectedEmployeeIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedEmployeeIds(newSet);
    };

    const handleSelectAll = () => {
        if (selectedEmployeeIds.size === filteredEmployees.length) {
            setSelectedEmployeeIds(new Set());
        } else {
            const newSet = new Set(selectedEmployeeIds);
            filteredEmployees.forEach(emp => newSet.add(emp.id));
            setSelectedEmployeeIds(newSet);
        }
    };

    const onSubmit = async (data: any) => {
        if (selectedEmployeeIds.size === 0) return;

        setIsLoading(true);
        try {
            const shiftsToCreate: CreateShiftRequest[] = [];
            const template = templates.find(t => t.id === data.shiftTemplateId);
            if (!template) throw new Error('Template not found');

            // Determine location string
            let locationName = site?.name || '';
            if (data.zoneId && data.zoneId !== 'all') {
                const zone = site?.zones?.find(z => z.id === data.zoneId);
                if (zone) locationName += ` - ${zone.name}`;
            }

            selectedEmployeeIds.forEach(empId => {
                shiftsToCreate.push({
                    employeeId: empId,
                    templateId: template.id,
                    date: data.date,
                    startTime: template.startTime,
                    endTime: template.endTime,
                    location: locationName,
                });
            });

            await bulkCreateShifts(shiftsToCreate);
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to assign guards', err);
            // Handle error (show toast etc)
        } finally {
            setIsLoading(false);
        }
    };

    const zoneOptions = useMemo(() => {
        const opts = [{ value: 'all', label: 'Entire Site' }];
        if (site?.zones) {
            site.zones.forEach(z => opts.push({ value: z.id, label: z.name }));
        }
        return opts;
    }, [site]);

    const templateOptions = useMemo(() => {
        return templates.map(t => ({
            value: t.id,
            label: `${t.name} (${t.startTime.substring(0, 5)} - ${t.endTime.substring(0, 5)})`
        }));
    }, [templates]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('sites.assignGuards', 'Assign Guards')}
            size="xl"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-[600px]">
                {/* Steps Indicator could go here */}

                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                    {/* 1. Shift & Date Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-50 dark:bg-neutral-800 p-4 rounded-lg">
                        <Input
                            type="date"
                            label={t('common.date', 'Date')}
                            {...register('date')}
                            error={errors.date?.message as string}
                            required
                        />
                        <Controller
                            name="shiftTemplateId"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    label={t('shifts.template', 'Shift')}
                                    options={templateOptions}
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors.shiftTemplateId?.message as string}
                                    required
                                />
                            )}
                        />
                        <Controller
                            name="zoneId"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    label={t('sites.zone', 'Zone (Optional)')}
                                    options={zoneOptions}
                                    value={field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        />
                        {selectedTemplate && (
                            <div className="md:col-span-2 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                                <Clock size={14} />
                                <span>
                                    Time: <span className="font-medium text-neutral-900 dark:text-white">{selectedTemplate.startTime.substring(0, 5)} - {selectedTemplate.endTime.substring(0, 5)}</span>
                                </span>
                                {selectedTemplate.breakMinutes > 0 && <span>(Break: {selectedTemplate.breakMinutes}m)</span>}
                            </div>
                        )}
                    </div>

                    {/* 2. Guard Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                                <UserPlus size={18} />
                                {t('sites.selectGuards', 'Select Guards')}
                            </h3>
                            <div className="text-sm text-neutral-500">
                                {selectedEmployeeIds.size} selected
                            </div>
                        </div>

                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                            <input
                                type="text"
                                placeholder={t('employees.searchPlaceholder', 'Search guards...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 h-9 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden flex flex-col h-[300px]">
                            {/* Header */}
                            <div className="bg-neutral-50 dark:bg-neutral-800 p-2 border-b border-neutral-200 dark:border-neutral-700 flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={filteredEmployees.length > 0 && selectedEmployeeIds.size === filteredEmployees.length}
                                    onChange={handleSelectAll}
                                    className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Select All</span>
                            </div>

                            {/* List */}
                            <div className="overflow-y-auto flex-1 p-2 space-y-1">
                                {filteredEmployees.map(emp => (
                                    <label
                                        key={emp.id}
                                        className={`flex items-center gap-3 p-2 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors ${selectedEmployeeIds.has(emp.id) ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedEmployeeIds.has(emp.id)}
                                            onChange={() => toggleEmployee(emp.id)}
                                            className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <Avatar name={emp.fullName} size="sm" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-neutral-900 dark:text-white truncate">{emp.fullName}</div>
                                            <div className="text-xs text-neutral-500 truncate">{emp.employeeCode}</div>
                                        </div>
                                        {emp.status !== 'active' && (
                                            <Badge variant="warning" size="sm">{emp.status}</Badge>
                                        )}
                                    </label>
                                ))}
                                {filteredEmployees.length === 0 && (
                                    <div className="p-4 text-center text-neutral-500 text-sm">
                                        No guards found
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 mt-auto border-t border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
                    <div className="text-sm text-neutral-500">
                        Creating shifts for <strong>{site?.name}</strong>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose} type="button">
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={selectedEmployeeIds.size === 0}
                            isLoading={isLoading}
                        >
                            {t('common.confirm', 'Assign')} ({selectedEmployeeIds.size})
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}

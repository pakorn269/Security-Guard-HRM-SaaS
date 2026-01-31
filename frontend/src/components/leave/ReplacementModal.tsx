/**
 * ReplacementModal Component
 * Modal for assigning replacement guards to shifts affected by leave
 */

import { useState, useEffect } from 'react';
import { X, Users, MapPin, Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import leaveService from '@/services/leave.service';
import type {
    ReplacementConflict,
    AvailableReplacement,
    ReplacementAssignment,
} from '@/types/leave.types';

interface ReplacementModalProps {
    isOpen: boolean;
    onClose: () => void;
    conflicts: ReplacementConflict[];
    onSubmit: (replacements: ReplacementAssignment[], reviewNotes?: string) => Promise<void>;
    leaveRequestId: string;
}

interface ReplacementSelection {
    [shiftId: string]: string; // shiftId -> employeeId
}

export default function ReplacementModal({
    isOpen,
    onClose,
    conflicts,
    onSubmit,
    leaveRequestId,
}: ReplacementModalProps) {
    const [selections, setSelections] = useState<ReplacementSelection>({});
    const [availableReplacements, setAvailableReplacements] = useState<{
        [shiftId: string]: AvailableReplacement[];
    }>({});
    const [loadingReplacements, setLoadingReplacements] = useState<{
        [shiftId: string]: boolean;
    }>({});
    const [reviewNotes, setReviewNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load available replacements for each conflict
    useEffect(() => {
        if (isOpen && conflicts.length > 0) {
            loadAllReplacements();
        }
    }, [isOpen, conflicts]);

    const loadAllReplacements = async () => {
        for (const conflict of conflicts) {
            setLoadingReplacements((prev) => ({ ...prev, [conflict.shiftId]: true }));
            try {
                const replacements = await leaveService.getAvailableReplacements(conflict.shiftId);
                setAvailableReplacements((prev) => ({
                    ...prev,
                    [conflict.shiftId]: replacements,
                }));
            } catch (err) {
                console.error(`Error loading replacements for shift ${conflict.shiftId}:`, err);
                setAvailableReplacements((prev) => ({
                    ...prev,
                    [conflict.shiftId]: [],
                }));
            } finally {
                setLoadingReplacements((prev) => ({ ...prev, [conflict.shiftId]: false }));
            }
        }
    };

    const handleSelectionChange = (shiftId: string, employeeId: string) => {
        setSelections((prev) => ({
            ...prev,
            [shiftId]: employeeId,
        }));
    };

    const handleSelectAll = () => {
        const autoSelections: ReplacementSelection = {};
        conflicts.forEach((conflict) => {
            const available = availableReplacements[conflict.shiftId] || [];
            if (available.length > 0) {
                // Select the guard with the least shifts (first in the list, as backend sorts by shift count)
                autoSelections[conflict.shiftId] = available[0].id;
            }
        });
        setSelections(autoSelections);
    };

    const handleClearAll = () => {
        setSelections({});
    };

    const handleSubmit = async () => {
        setError(null);

        // Validate that all shifts have replacements
        const unassignedShifts = conflicts.filter((c) => !selections[c.shiftId]);
        if (unassignedShifts.length > 0) {
            setError(
                `Please assign replacements for all ${unassignedShifts.length} unassigned shift(s).`
            );
            return;
        }

        // Build replacement assignments
        const replacements: ReplacementAssignment[] = Object.entries(selections).map(
            ([shiftId, employeeId]) => ({
                shiftId,
                replacementEmployeeId: employeeId,
                reason: `Leave Request: ${leaveRequestId}`,
            })
        );

        setIsSubmitting(true);
        try {
            await onSubmit(replacements, reviewNotes);
            // Success - modal will be closed by parent
        } catch (err: any) {
            setError(err.message || 'Failed to assign replacements');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApproveWithoutReplacements = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            await onSubmit([], reviewNotes);
        } catch (err: any) {
            setError(err.message || 'Failed to approve leave');
        } finally {
            setIsSubmitting(false);
        }
    };

    const assignedCount = Object.keys(selections).length;
    const totalConflicts = conflicts.length;

    const formatTime = (time: string) => time.substring(0, 5);
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('th-TH', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" title="">
            <div className="flex max-h-[85vh] flex-col">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            Assign Replacement Guards
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                            Select replacement guards for {totalConflicts} conflicting{' '}
                            {totalConflicts === 1 ? 'shift' : 'shifts'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {/* Error Alert */}
                    {error && (
                        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
                            <div className="text-sm text-red-800">{error}</div>
                        </div>
                    )}

                    {/* Progress Indicator */}
                    <div className="mb-4 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-600" />
                            <span className="font-medium text-blue-900">
                                {assignedCount} of {totalConflicts} shifts assigned
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSelectAll}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                disabled={isSubmitting}
                            >
                                Auto-Assign
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                                onClick={handleClearAll}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                disabled={isSubmitting}
                            >
                                Clear All
                            </button>
                        </div>
                    </div>

                    {/* Shifts List */}
                    <div className="space-y-4">
                        {conflicts.map((conflict, index) => {
                            const replacements = availableReplacements[conflict.shiftId] || [];
                            const isLoading = loadingReplacements[conflict.shiftId];
                            const selectedId = selections[conflict.shiftId];
                            const isAssigned = !!selectedId;

                            return (
                                <div
                                    key={conflict.shiftId}
                                    className={`rounded-lg border-2 p-4 transition-colors ${isAssigned
                                        ? 'border-green-200 bg-green-50'
                                        : 'border-gray-200 bg-white'
                                        }`}
                                >
                                    {/* Shift Info */}
                                    <div className="mb-3 flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${isAssigned
                                                    ? 'bg-green-100 text-green-600'
                                                    : 'bg-gray-100 text-gray-600'
                                                    }`}
                                            >
                                                {isAssigned ? (
                                                    <CheckCircle className="h-5 w-5" />
                                                ) : (
                                                    <span className="text-sm font-medium">
                                                        {index + 1}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {formatDate(conflict.date)}
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-4 w-4" />
                                                        <span>
                                                            {formatTime(conflict.startTime)} -{' '}
                                                            {formatTime(conflict.endTime)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="h-4 w-4" />
                                                        <span>{conflict.siteName}</span>
                                                        {conflict.siteZone && (
                                                            <span className="text-gray-500">
                                                                ({conflict.siteZone})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Replacement Selection */}
                                    <div className="ml-11">
                                        {isLoading ? (
                                            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Loading available guards...</span>
                                            </div>
                                        ) : replacements.length === 0 ? (
                                            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                                                No available replacement guards found
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                                    Select Replacement Guard
                                                </label>
                                                <select
                                                    value={selectedId || ''}
                                                    onChange={(e) =>
                                                        handleSelectionChange(
                                                            conflict.shiftId,
                                                            e.target.value
                                                        )
                                                    }
                                                    className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    disabled={isSubmitting}
                                                >
                                                    <option value="">
                                                        -- Select a guard ({replacements.length}{' '}
                                                        available) --
                                                    </option>
                                                    {replacements.map((replacement) => (
                                                        <option
                                                            key={replacement.id}
                                                            value={replacement.id}
                                                        >
                                                            {replacement.fullName} ({replacement.employeeCode})
                                                            {replacement.position && ` - ${replacement.position}`}
                                                            {` • ${replacement.shiftCount} shift${replacement.shiftCount !== 1 ? 's' : ''} next 7 days`}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Review Notes */}
                    <div className="mt-6">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Review Notes (Optional)
                        </label>
                        <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            rows={3}
                            className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Add notes about the approval or replacement assignments..."
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
                    <button
                        onClick={handleApproveWithoutReplacements}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isSubmitting}
                    >
                        Approve Without Replacements
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isSubmitting || assignedCount !== totalConflicts}
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {isSubmitting
                                ? 'Approving...'
                                : `Approve & Assign ${assignedCount}/${totalConflicts}`}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

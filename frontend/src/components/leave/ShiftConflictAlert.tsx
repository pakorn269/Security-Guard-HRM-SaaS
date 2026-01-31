/**
 * ShiftConflictAlert Component
 * Displays a warning alert with a table of shifts that conflict with a leave request
 */

import { AlertTriangle, MapPin, Clock } from 'lucide-react';
import type { ReplacementConflict } from '@/types/leave.types';

interface ShiftConflictAlertProps {
    conflicts: ReplacementConflict[];
    onAssignReplacements?: () => void;
    showAssignButton?: boolean;
}

export default function ShiftConflictAlert({
    conflicts,
    onAssignReplacements,
    showAssignButton = true,
}: ShiftConflictAlertProps) {
    if (!conflicts || conflicts.length === 0) {
        return null;
    }

    const formatTime = (time: string) => {
        // Convert HH:MM:SS or HH:MM to HH:MM format
        return time.substring(0, 5);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('th-TH', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <div className="rounded-full bg-yellow-100 p-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-yellow-900">
                            Shift Conflicts Detected
                        </h3>
                        <p className="mt-1 text-sm text-yellow-700">
                            This leave request overlaps with {conflicts.length} scheduled{' '}
                            {conflicts.length === 1 ? 'shift' : 'shifts'}. Please assign replacement
                            guards to ensure coverage.
                        </p>
                    </div>
                </div>
                {showAssignButton && onAssignReplacements && (
                    <button
                        onClick={onAssignReplacements}
                        className="ml-4 flex-shrink-0 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                    >
                        Assign Replacements
                    </button>
                )}
            </div>

            {/* Conflicts Table */}
            <div className="overflow-hidden rounded-lg border border-yellow-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-yellow-200">
                        <thead className="bg-yellow-100">
                            <tr>
                                <th
                                    scope="col"
                                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-yellow-900"
                                >
                                    Date
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-yellow-900"
                                >
                                    Time
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-yellow-900"
                                >
                                    Site
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-yellow-900"
                                >
                                    Employee
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-yellow-900"
                                >
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-yellow-100 bg-white">
                            {conflicts.map((conflict, index) => (
                                <tr
                                    key={conflict.shiftId}
                                    className={index % 2 === 0 ? 'bg-white' : 'bg-yellow-50/50'}
                                >
                                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                                        {formatDate(conflict.date)}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-4 w-4 text-gray-400" />
                                            <span>
                                                {formatTime(conflict.startTime)} -{' '}
                                                {formatTime(conflict.endTime)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                        <div className="flex items-start gap-1">
                                            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                                            <div>
                                                <div className="font-medium">{conflict.siteName}</div>
                                                {conflict.siteZone && (
                                                    <div className="text-xs text-gray-500">
                                                        {conflict.siteZone}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                                        {conflict.originalEmployeeName}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${conflict.status === 'published'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}
                                        >
                                            {conflict.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary Footer */}
            <div className="mt-3 flex items-center justify-between rounded-lg bg-yellow-100 px-4 py-2">
                <p className="text-sm font-medium text-yellow-900">
                    Total Conflicts: {conflicts.length}
                </p>
                {showAssignButton && (
                    <p className="text-xs text-yellow-700">
                        Click "Assign Replacements" to manage shift coverage
                    </p>
                )}
            </div>
        </div>
    );
}

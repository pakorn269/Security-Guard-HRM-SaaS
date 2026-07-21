
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShiftConflictAlert from './ShiftConflictAlert';
import ReplacementModal from './ReplacementModal';
import leaveService from '@/services/leave.service';
import type { ReplacementConflict, AvailableReplacement } from '@/types/leave.types';

// Mock the leaveService
vi.mock('@/services/leave.service', () => {
    const mockService = {
        getAvailableReplacements: vi.fn(),
    };
    return {
        leaveService: mockService,
        default: mockService,
    };
});

// Mock the Modal component to simplify testing (avoid Portals)
vi.mock('../common/Modal', () => ({
    default: ({ isOpen, children, title }: any) => {
        if (!isOpen) return null;
        return (
            <div data-testid="mock-modal">
                <h2>{title}</h2>
                {children}
            </div>
        );
    },
}));

// Sample Data
const mockConflicts: ReplacementConflict[] = [
    {
        shiftId: 'shift-1',
        date: '2026-02-01T00:00:00Z',
        siteId: 'site-1',
        siteName: 'Headquarters',
        siteZone: 'Zone A',
        startTime: '08:00',
        endTime: '16:00',
        requiresReplacement: true,
        originalEmployeeId: 'emp-1',
        originalEmployeeName: 'John Doe',
        status: 'scheduled',
    },
    {
        shiftId: 'shift-2',
        date: '2026-02-02T00:00:00Z',
        siteId: 'site-1',
        siteName: 'Headquarters',
        siteZone: 'Zone B',
        startTime: '08:00',
        endTime: '16:00',
        requiresReplacement: true,
        originalEmployeeId: 'emp-1',
        originalEmployeeName: 'John Doe',
        status: 'scheduled',
    },
];

const mockReplacements: AvailableReplacement[] = [
    {
        id: 'rep-1',
        fullName: 'Jane Smith',
        employeeCode: 'E002',
        position: 'Guard',
        shiftCount: 0,
    },
    {
        id: 'rep-2',
        fullName: 'Bob Johnson',
        employeeCode: 'E003',
        position: 'Guard',
        shiftCount: 2,
    },
];

describe('Replacement Workflow Components', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('ShiftConflictAlert', () => {
        it('should render warning message regarding conflicts', () => {
            render(<ShiftConflictAlert conflicts={mockConflicts} />);

            expect(screen.getByText(/Shift Conflicts Detected/i)).toBeInTheDocument();
            expect(screen.getByText(/2 scheduled shifts/i)).toBeInTheDocument();
        });

        it('should call onAssignReplacements when button is clicked', () => {
            const handleAssign = vi.fn();
            render(
                <ShiftConflictAlert
                    conflicts={mockConflicts}
                    onAssignReplacements={handleAssign}
                />
            );

            fireEvent.click(screen.getByText('Assign Replacements'));
            expect(handleAssign).toHaveBeenCalledTimes(1);
        });

        it('should not render if there are no conflicts', () => {
            const { container } = render(<ShiftConflictAlert conflicts={[]} />);
            expect(container).toBeEmptyDOMElement();
        });
    });

    describe('ReplacementModal', () => {
        const defaultProps = {
            isOpen: true,
            onClose: vi.fn(),
            conflicts: mockConflicts,
            onSubmit: vi.fn(),
            leaveRequestId: 'req-123',
        };

        it('should fetch and display available replacements on open', async () => {
            vi.mocked(leaveService.getAvailableReplacements).mockResolvedValue(mockReplacements);

            render(<ReplacementModal {...defaultProps} />);

            await waitFor(() => {
                expect(leaveService.getAvailableReplacements).toHaveBeenCalledTimes(2); // Once for each conflict
            });

            // Check if dropdowns are populated
            // We search for comboboxes (select elements)
            const selects = screen.getAllByRole('combobox');
            expect(selects).toHaveLength(2);

            // Check content of the first dropdown options
            // Note: Selects with options are a bit tricky in RTL sometimes, let's just check the text content if possible or interaction
            // However, since we mock getAvailableReplacements, we assume the component renders options based on data.
            // Let's verify that "Jane Smith" is in the document (inside the option)
            // Note: Options might not be visible until clicked depending on browser, but in JSDOM usually standard <select> options are transparently readable?
            // Actually RTL typically can find options if they are in the DOM even if inside a select.

            // Wait for options to render
            await waitFor(() => {
                expect(screen.getAllByText(/Jane Smith/i).length).toBeGreaterThan(0);
            });
        });

        it('should allow selecting a replacement and enable submit button', async () => {
            vi.mocked(leaveService.getAvailableReplacements).mockResolvedValue(mockReplacements);
            const onSubmit = vi.fn();

            render(<ReplacementModal {...defaultProps} onSubmit={onSubmit} />);

            await waitFor(() => {
                expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
            });

            // Button should be disabled initially (0/2 assigned)
            const submitBtn = screen.getByText(/Approve & Assign 0\/2/i);
            expect(submitBtn).toBeDisabled();

            // Select replacement for first shift
            const selects = screen.getAllByRole('combobox');
            fireEvent.change(selects[0], { target: { value: 'rep-1' } });

            // Button still disabled (1/2 assigned)
            expect(screen.getByText(/Approve & Assign 1\/2/i)).toBeDisabled();

            // Select replacement for second shift
            fireEvent.change(selects[1], { target: { value: 'rep-2' } });

            // Button enabled (2/2 assigned)
            const enabledBtn = screen.getByText(/Approve & Assign 2\/2/i);
            expect(enabledBtn).not.toBeDisabled();

            // Click submit
            fireEvent.click(enabledBtn);

            await waitFor(() => {
                expect(onSubmit).toHaveBeenCalledTimes(1);
                const assignedReplacements = onSubmit.mock.calls[0][0];
                expect(assignedReplacements).toHaveLength(2);
                expect(assignedReplacements[0].replacementEmployeeId).toBe('rep-1');
                expect(assignedReplacements[1].replacementEmployeeId).toBe('rep-2');
            });
        });

        it('should handle auto-assign functionality', async () => {
            vi.mocked(leaveService.getAvailableReplacements).mockResolvedValue(mockReplacements);

            render(<ReplacementModal {...defaultProps} />);

            await waitFor(() => {
                expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
            });

            const autoAssignBtn = screen.getByText('Auto-Assign');
            fireEvent.click(autoAssignBtn);

            // Should have valid selections now
            const enabledBtn = screen.getByText(/Approve & Assign 2\/2/i);
            expect(enabledBtn).not.toBeDisabled();
        });
    });
});

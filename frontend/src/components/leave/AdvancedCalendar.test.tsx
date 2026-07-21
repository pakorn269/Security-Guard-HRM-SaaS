
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeaveCalendar from './LeaveCalendar';
import leaveService from '../../services/leave.service';
import '@testing-library/jest-dom';

// Mock dependencies
vi.mock('../../services/leave.service', () => ({
    default: {
        getLeaveCalendar: vi.fn(),
        exportICalendar: vi.fn(),
    },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    Calendar: () => <div data-testid="icon-calendar">Calendar</div>,
    X: () => <div data-testid="icon-x">X</div>,
    ChevronLeft: () => <div data-testid="icon-chevron-left">ChevronLeft</div>,
    ChevronRight: () => <div data-testid="icon-chevron-right">ChevronRight</div>,
    AlertTriangle: () => <div data-testid="icon-alert-triangle">AlertTriangle</div>,
    Loader2: () => <div data-testid="icon-loader" className="animate-spin">Loader2</div>,
    Download: () => <div data-testid="icon-download">Download</div>,
    Filter: () => <div data-testid="icon-filter">Filter</div>,
    Grid3x3: () => <div data-testid="icon-grid">Month</div>,
    List: () => <div data-testid="icon-list">Week</div>,
    Eye: () => <div data-testid="icon-eye">Day</div>,
}));

describe('Advanced Calendar Features', () => {
    const user = userEvent.setup();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2024-07-15')); // Set a fixed date

        // Setup default mock response with matching date
        const fixedMockData = [
            {
                date: '2024-07-15',
                employees: [
                    {
                        id: 'emp-1',
                        fullName: 'Test Employee 1',
                        employeeCode: 'E001',
                        leaveType: {
                            id: 'lt-1',
                            name: 'Annual Leave',
                            nameTh: 'ลาพักผ่อน',
                        },
                    },
                    {
                        id: 'emp-2',
                        fullName: 'Test Employee 2',
                        employeeCode: 'E002',
                        leaveType: {
                            id: 'lt-2',
                            name: 'Sick Leave',
                            nameTh: 'ลาป่วย',
                        },
                    },
                ],
            },
        ];
        (leaveService.getLeaveCalendar as any).mockResolvedValue(fixedMockData);
        (leaveService.exportICalendar as any).mockResolvedValue(new Blob(['test-ics-data'], { type: 'text/calendar' }));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('View Switching', () => {
        it('should switch between Month, Week, and Day views', async () => {
            render(<LeaveCalendar />);

            await waitFor(() => {
                expect(screen.queryByTestId('icon-loader')).not.toBeInTheDocument();
            });

            // Default is Month view (Grid present)
            expect(document.querySelector('.grid-cols-7')).toBeInTheDocument();

            // Switch to Week view
            const weekBtn = screen.getByTitle('มุมมองสัปดาห์');
            await user.click(weekBtn);

            await waitFor(() => {
                expect(document.querySelector('.grid-cols-7')).not.toBeInTheDocument();
            });

            // Switch to Day view
            const dayBtn = screen.getByTitle('มุมมองวัน');
            await user.click(dayBtn);

            await waitFor(() => {
                expect(screen.getByText(/มีพนักงานลา/)).toBeInTheDocument();
            });
        });
    });

    describe('Filtering', () => {
        it('should allow selecting a team filter which updates state used for export', async () => {
            render(<LeaveCalendar />);

            await waitFor(() => {
                expect(screen.queryByTestId('icon-loader')).not.toBeInTheDocument();
            });

            // Open filters
            const filterBtn = screen.getByText('ตัวกรอง');
            await user.click(filterBtn);

            // Select team
            const teamSelect = screen.getByRole('combobox');
            await user.selectOptions(teamSelect, 'team1');

            expect(teamSelect).toHaveValue('team1');

            // Trigger export to verify the filter is used
            const exportBtn = screen.getByText('ส่งออก iCal');
            await user.click(exportBtn);

            await waitFor(() => {
                expect(leaveService.exportICalendar).toHaveBeenCalledWith(expect.objectContaining({
                    teamId: 'team1'
                }));
            });
        });
    });

    describe('Export', () => {
        it('should call export service when button is clicked', async () => {
            render(<LeaveCalendar />);

            await waitFor(() => {
                expect(screen.queryByTestId('icon-loader')).not.toBeInTheDocument();
            });

            const exportBtn = screen.getByText('ส่งออก iCal');
            await user.click(exportBtn);

            await waitFor(() => {
                expect(leaveService.exportICalendar).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('Tooltips', () => {
        it('should show tooltip with employee names on hover', async () => {
            render(<LeaveCalendar />);

            await waitFor(() => {
                expect(screen.queryByTestId('icon-loader')).not.toBeInTheDocument();
            });

            const dayButtons = screen.getAllByRole('button');
            const targetDay = dayButtons.find(btn =>
                btn.textContent?.includes('15') &&
                !btn.className.includes('opacity-30')
            );

            expect(targetDay).toBeDefined();

            if (targetDay) {
                fireEvent.mouseEnter(targetDay);

                await waitFor(() => {
                    expect(screen.getByText('2 คนลา')).toBeInTheDocument();
                    expect(screen.getAllByText(/Test Employee 1/).length).toBeGreaterThan(0);
                    expect(screen.getAllByText(/Test Employee 2/).length).toBeGreaterThan(0);
                });

                fireEvent.mouseLeave(targetDay);

                await waitFor(() => {
                    expect(screen.queryByText('2 คนลา')).not.toBeInTheDocument();
                });
            }
        });
    });
});

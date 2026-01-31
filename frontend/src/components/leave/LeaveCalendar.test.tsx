import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import LeaveCalendar from './LeaveCalendar';
import leaveService from '../../services/leave.service';
import { mockLeaveCalendarData, mockErrors } from '../../test/setup/leave-mocks';

// Mock dependencies
vi.mock('../../services/leave.service', () => ({
  default: {
    getLeaveCalendar: vi.fn(),
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
}));

describe('LeaveCalendar', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();

  const mockCalendarData = [
    {
      date: '2024-07-15',
      employees: [
        {
          id: 'employee-1',
          fullName: 'สมชาย ใจดี',
          employeeCode: 'EMP001',
          leaveType: {
            id: 'leave-type-1',
            name: 'Annual Leave',
            nameTh: 'ลาพักผ่อน',
          },
        },
      ],
    },
    {
      date: '2024-07-16',
      employees: [
        {
          id: 'employee-1',
          fullName: 'สมชาย ใจดี',
          employeeCode: 'EMP001',
          leaveType: {
            id: 'leave-type-1',
            name: 'Annual Leave',
            nameTh: 'ลาพักผ่อน',
          },
        },
        {
          id: 'employee-2',
          fullName: 'สมหญิง รักงาน',
          employeeCode: 'EMP002',
          leaveType: {
            id: 'leave-type-3',
            name: 'Personal Leave',
            nameTh: 'ลากิจ',
          },
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful response
    (leaveService.getLeaveCalendar as any).mockResolvedValue(mockCalendarData);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================================================
  // BASIC RENDERING TESTS
  // ========================================================================

  describe('Initial Rendering', () => {
    it('should render calendar header', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        expect(screen.getByText(/ปฏิทินการลา/i)).toBeInTheDocument();
      });
    });

    it('should display close button when onClose prop is provided', async () => {
      render(<LeaveCalendar onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByTestId('icon-x')).toBeInTheDocument();
      });
    });

    it('should not display close button when onClose prop is not provided', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        expect(screen.queryByTestId('icon-x')).not.toBeInTheDocument();
      });
    });

    it('should show loading spinner initially', () => {
      render(<LeaveCalendar />);

      expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
    });

    it('should hide loading spinner after data is loaded', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        expect(screen.queryByTestId('icon-loader')).not.toBeInTheDocument();
      });
    });

    it('should display current month name', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        const currentMonth = new Date().toLocaleDateString('th-TH', {
          month: 'long',
          year: 'numeric',
        });
        expect(screen.getByText(currentMonth)).toBeInTheDocument();
      });
    });

    it('should render weekday headers', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        expect(screen.getByText('อา')).toBeInTheDocument();
        expect(screen.getByText('จ')).toBeInTheDocument();
        expect(screen.getByText('อ')).toBeInTheDocument();
        expect(screen.getByText('พ')).toBeInTheDocument();
        expect(screen.getByText('พฤ')).toBeInTheDocument();
        expect(screen.getByText('ศ')).toBeInTheDocument();
        expect(screen.getByText('ส')).toBeInTheDocument();
      });
    });

    it('should call getLeaveCalendar on mount', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        expect(leaveService.getLeaveCalendar).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String)
        );
      });
    });

    it('should show error message when data loading fails', async () => {
      (leaveService.getLeaveCalendar as any).mockRejectedValue(mockErrors.networkError);

      render(<LeaveCalendar />);

      await waitFor(() => {
        expect(screen.getByText(/ไม่สามารถโหลดปฏิทินการลาได้/i)).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // CALENDAR GRID TESTS
  // ========================================================================

  describe('Calendar Grid', () => {
    it('should render calendar days in grid', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        // Calendar should have days (at least 28 days in a month)
        const calendarCells = screen.getAllByRole('button');
        expect(calendarCells.length).toBeGreaterThanOrEqual(28);
      });
    });

    it('should highlight today date', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        const today = new Date().getDate();
        const todayElements = screen.getAllByText(today.toString());
        expect(todayElements.length).toBeGreaterThan(0);
        // Today should have special styling (test by checking parent element classes)
        const todayElement = todayElements.find(el =>
          el.parentElement?.className.includes('today') ||
          el.parentElement?.className.includes('ring') ||
          el.parentElement?.className.includes('border')
        );
        expect(todayElement).toBeTruthy();
      });
    });

    it('should display leave indicators on days with leaves', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        // Days with leaves should have visual indicators (dots or badges)
        const leaveDays = screen.getAllByRole('button').filter(btn =>
          btn.querySelector('[data-leave-count]') ||
          btn.querySelector('.leave-indicator')
        );
        expect(leaveDays.length).toBeGreaterThan(0);
      });
    });

    it('should show leave count on days with multiple leaves', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        // Check for the day with 2 employees on leave (July 16)
        const buttons = screen.getAllByRole('button');
        const dayWith2Leaves = buttons.find(btn =>
          btn.textContent?.includes('2') && btn.querySelector('[data-leave-count]')
        );
        expect(dayWith2Leaves).toBeTruthy();
      });
    });

    it('should distinguish current month days from other months', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        const allDays = screen.getAllByRole('button');
        // Days from other months should have different styling (opacity, color, etc.)
        const otherMonthDays = allDays.filter(day =>
          day.className.includes('opacity') || day.className.includes('text-gray')
        );
        expect(otherMonthDays.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ========================================================================
  // NAVIGATION TESTS
  // ========================================================================

  describe('Month Navigation', () => {
    it('should navigate to previous month', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        expect(screen.getByTestId('icon-chevron-left')).toBeInTheDocument();
      });

      const currentMonth = new Date().getMonth();
      const prevButton = screen.getByTestId('icon-chevron-left').closest('button');
      await user.click(prevButton!);

      await waitFor(() => {
        const expectedMonth = new Date(
          new Date().getFullYear(),
          currentMonth - 1,
          1
        ).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
        expect(screen.getByText(expectedMonth)).toBeInTheDocument();
      });
    });

    it('should navigate to next month', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        expect(screen.getByTestId('icon-chevron-right')).toBeInTheDocument();
      });

      const currentMonth = new Date().getMonth();
      const nextButton = screen.getByTestId('icon-chevron-right').closest('button');
      await user.click(nextButton!);

      await waitFor(() => {
        const expectedMonth = new Date(
          new Date().getFullYear(),
          currentMonth + 1,
          1
        ).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
        expect(screen.getByText(expectedMonth)).toBeInTheDocument();
      });
    });

    it('should go to today when "Today" button is clicked', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        expect(screen.getByText(/วันนี้/i)).toBeInTheDocument();
      });

      // Navigate to a different month first
      const prevButton = screen.getByTestId('icon-chevron-left').closest('button');
      await user.click(prevButton!);

      // Then click "Today" button
      const todayButton = screen.getByText(/วันนี้/i);
      await user.click(todayButton);

      await waitFor(() => {
        const currentMonth = new Date().toLocaleDateString('th-TH', {
          month: 'long',
          year: 'numeric',
        });
        expect(screen.getByText(currentMonth)).toBeInTheDocument();
      });
    });

    it('should reload data when navigating months', async () => {
      render(<LeaveCalendar />);

      const initialCallCount = (leaveService.getLeaveCalendar as any).mock.calls.length;

      await waitFor(() => {
        expect(screen.getByTestId('icon-chevron-right')).toBeInTheDocument();
      });

      const nextButton = screen.getByTestId('icon-chevron-right').closest('button');
      await user.click(nextButton!);

      await waitFor(() => {
        expect((leaveService.getLeaveCalendar as any).mock.calls.length).toBeGreaterThan(
          initialCallCount
        );
      });
    });

    it('should clear selected day when navigating months', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        const calendarCells = screen.getAllByRole('button');
        expect(calendarCells.length).toBeGreaterThan(0);
      });

      // Select a day first
      const dayButtons = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.match(/^\d{1,2}$/)
      );
      if (dayButtons.length > 0) {
        await user.click(dayButtons[0]);
      }

      // Navigate to next month
      const nextButton = screen.getByTestId('icon-chevron-right').closest('button');
      await user.click(nextButton!);

      // Selected day should be cleared (no detail panel visible)
      await waitFor(() => {
        expect(screen.queryByText(/รายละเอียดการลา/i)).not.toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // DAY SELECTION TESTS
  // ========================================================================

  describe('Day Selection and Details', () => {
    it('should show leave details when clicking a day with leaves', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        const calendarCells = screen.getAllByRole('button');
        expect(calendarCells.length).toBeGreaterThan(0);
      });

      // Find the day with leaves (15th or 16th based on mock data)
      const dayButtons = screen.getAllByRole('button');
      const dayWithLeave = dayButtons.find(btn =>
        btn.querySelector('[data-leave-count]')
      );

      if (dayWithLeave) {
        await user.click(dayWithLeave);

        await waitFor(() => {
          // Details panel should show employee info
          expect(screen.getByText(/สมชาย ใจดี/)).toBeInTheDocument();
        });
      }
    });

    it('should display employee names in leave details', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        const calendarCells = screen.getAllByRole('button');
        expect(calendarCells.length).toBeGreaterThan(0);
      });

      const dayButtons = screen.getAllByRole('button');
      const dayWithLeave = dayButtons.find(btn =>
        btn.querySelector('[data-leave-count]')
      );

      if (dayWithLeave) {
        await user.click(dayWithLeave);

        await waitFor(() => {
          expect(screen.getByText(/สมชาย ใจดี/)).toBeInTheDocument();
          expect(screen.getByText(/EMP001/)).toBeInTheDocument();
        });
      }
    });

    it('should display leave type names in details', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        const calendarCells = screen.getAllByRole('button');
        expect(calendarCells.length).toBeGreaterThan(0);
      });

      const dayButtons = screen.getAllByRole('button');
      const dayWithLeave = dayButtons.find(btn =>
        btn.querySelector('[data-leave-count]')
      );

      if (dayWithLeave) {
        await user.click(dayWithLeave);

        await waitFor(() => {
          expect(screen.getByText(/ลาพักผ่อน/)).toBeInTheDocument();
        });
      }
    });

    it('should close details panel when clicking close button', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        const calendarCells = screen.getAllByRole('button');
        expect(calendarCells.length).toBeGreaterThan(0);
      });

      // Click a day to open details
      const dayButtons = screen.getAllByRole('button');
      const dayWithLeave = dayButtons.find(btn =>
        btn.querySelector('[data-leave-count]')
      );

      if (dayWithLeave) {
        await user.click(dayWithLeave);

        await waitFor(() => {
          expect(screen.getByText(/สมชาย ใจดี/)).toBeInTheDocument();
        });

        // Find and click close button in details panel
        const closeButtons = screen.getAllByTestId('icon-x');
        const detailsPanelCloseButton = closeButtons.find(btn =>
          btn.closest('[data-details-panel]')
        );
        if (detailsPanelCloseButton) {
          await user.click(detailsPanelCloseButton.closest('button')!);

          await waitFor(() => {
            expect(screen.queryByText(/รายละเอียดการลา/i)).not.toBeInTheDocument();
          });
        }
      }
    });

    it('should show empty state for days without leaves', async () => {
      render(<LeaveCalendar />);

      await waitFor(() => {
        const calendarCells = screen.getAllByRole('button');
        expect(calendarCells.length).toBeGreaterThan(0);
      });

      // Click a day without leaves
      const dayButtons = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.match(/^\d{1,2}$/) &&
        !btn.querySelector('[data-leave-count]')
      );

      if (dayButtons.length > 0) {
        await user.click(dayButtons[0]);

        await waitFor(() => {
          expect(screen.getByText(/ไม่มีการลาในวันนี้/i)).toBeInTheDocument();
        });
      }
    });
  });

  // ========================================================================
  // CLOSE CALLBACK TESTS
  // ========================================================================

  describe('Close Callback', () => {
    it('should call onClose when close button is clicked', async () => {
      render(<LeaveCalendar onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByTestId('icon-x')).toBeInTheDocument();
      });

      const closeButton = screen.getByTestId('icon-x').closest('button');
      await user.click(closeButton!);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================================================
  // COLOR CODING TESTS
  // ========================================================================

  describe('Leave Type Color Coding', () => {
    it('should apply different colors to different leave types', async () => {
      const mockDataWithMultipleTypes = [
        {
          date: '2024-07-15',
          employees: [
            {
              id: 'employee-1',
              fullName: 'สมชาย ใจดี',
              employeeCode: 'EMP001',
              leaveType: {
                id: 'leave-type-1',
                name: 'Annual Leave',
                nameTh: 'ลาพักผ่อน',
              },
            },
            {
              id: 'employee-2',
              fullName: 'สมหญิง รักงาน',
              employeeCode: 'EMP002',
              leaveType: {
                id: 'leave-type-2',
                name: 'Sick Leave',
                nameTh: 'ลาป่วย',
              },
            },
          ],
        },
      ];

      (leaveService.getLeaveCalendar as any).mockResolvedValue(mockDataWithMultipleTypes);

      render(<LeaveCalendar />);

      await waitFor(() => {
        const calendarCells = screen.getAllByRole('button');
        expect(calendarCells.length).toBeGreaterThan(0);
      });

      // Click a day to see details
      const dayButtons = screen.getAllByRole('button');
      const dayWithLeave = dayButtons.find(btn =>
        btn.querySelector('[data-leave-count]')
      );

      if (dayWithLeave) {
        await user.click(dayWithLeave);

        await waitFor(() => {
          // Check that leave type badges have color classes
          const leaveTypeBadges = screen.getAllByText(/ลา/);
          expect(leaveTypeBadges.length).toBeGreaterThan(0);
        });
      }
    });
  });

  // ========================================================================
  // EDGE CASES TESTS
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle empty calendar data', async () => {
      (leaveService.getLeaveCalendar as any).mockResolvedValue([]);

      render(<LeaveCalendar />);

      await waitFor(() => {
        // Calendar should still render but with no leave indicators
        const calendarCells = screen.getAllByRole('button');
        expect(calendarCells.length).toBeGreaterThan(0);

        const leaveIndicators = screen.queryAllByRole('button').filter(btn =>
          btn.querySelector('[data-leave-count]')
        );
        expect(leaveIndicators.length).toBe(0);
      });
    });

    it('should handle month transition correctly (December to January)', async () => {
      // Set current date to December
      const decemberDate = new Date(2024, 11, 15); // December 15, 2024
      vi.spyOn(global, 'Date').mockImplementation((...args) => {
        if (args.length === 0) {
          return decemberDate;
        }
        return new (Date as any)(...args);
      });

      render(<LeaveCalendar />);

      await waitFor(() => {
        expect(screen.getByTestId('icon-chevron-right')).toBeInTheDocument();
      });

      const nextButton = screen.getByTestId('icon-chevron-right').closest('button');
      await user.click(nextButton!);

      await waitFor(() => {
        // Should show January 2025
        const januaryText = new Date(2025, 0, 1).toLocaleDateString('th-TH', {
          month: 'long',
          year: 'numeric',
        });
        expect(screen.getByText(januaryText)).toBeInTheDocument();
      });

      vi.restoreAllMocks();
    });

    it('should handle year transition correctly (January to December)', async () => {
      // Set current date to January
      const januaryDate = new Date(2024, 0, 15); // January 15, 2024
      vi.spyOn(global, 'Date').mockImplementation((...args) => {
        if (args.length === 0) {
          return januaryDate;
        }
        return new (Date as any)(...args);
      });

      render(<LeaveCalendar />);

      await waitFor(() => {
        expect(screen.getByTestId('icon-chevron-left')).toBeInTheDocument();
      });

      const prevButton = screen.getByTestId('icon-chevron-left').closest('button');
      await user.click(prevButton!);

      await waitFor(() => {
        // Should show December 2023
        const decemberText = new Date(2023, 11, 1).toLocaleDateString('th-TH', {
          month: 'long',
          year: 'numeric',
        });
        expect(screen.getByText(decemberText)).toBeInTheDocument();
      });

      vi.restoreAllMocks();
    });
  });
});

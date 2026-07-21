import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import LeaveBalancesPage from './LeaveBalancesPage';
import leaveService from '../../services/leave.service';
import {
  mockLeaveBalances,
  mockLeaveTypes,
  mockPaginationMeta,
  mockErrors,
  createMockLeaveBalance,
} from '../../test/setup/leave-mocks';

// Mock dependencies
vi.mock('../../services/leave.service', () => ({
  default: {
    listBalances: vi.fn(),
    listLeaveTypes: vi.fn(),
    updateLeaveBalance: vi.fn(),
    initializeBalances: vi.fn(),
  },
}));

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-123',
      role: 'company_admin',
      companyId: 'company-123',
    },
  }),
}));

// Helper wrapper for components that use router
const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('LeaveBalancesPage', () => {
  const user = userEvent.setup();
  const currentYear = new Date().getFullYear();

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');

    // Default successful responses
    (leaveService.listBalances as any).mockResolvedValue({
      balances: mockLeaveBalances,
      total: mockLeaveBalances.length,
      pagination: mockPaginationMeta,
    });

    (leaveService.listLeaveTypes as any).mockResolvedValue(mockLeaveTypes);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  // ========================================================================
  // BASIC RENDERING TESTS
  // ========================================================================

  describe('Initial Rendering', () => {
    it('should render page header', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByText(/จัดการวันลาคงเหลือ/i)).toBeInTheDocument();
      });
    });

    it('should render page description', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByText(/ตรวจสอบวันลาคงเหลือของพนักงานรายปี/i)).toBeInTheDocument();
      });
    });

    it('should show initialize button', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByText(/สร้างข้อมูลวันลาปี/i)).toBeInTheDocument();
      });
    });

    it('should display current year by default', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        const yearInput = screen.getByLabelText(/ปี/i) as HTMLInputElement;
        expect(yearInput.value).toBe(currentYear.toString());
      });
    });

    it('should load balances on mount', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(leaveService.listBalances).toHaveBeenCalledWith(
          expect.objectContaining({
            year: currentYear,
            page: 1,
            pageSize: 50,
          })
        );
      });
    });

    it('should load leave types on mount', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(leaveService.listLeaveTypes).toHaveBeenCalled();
      });
    });

    it('should display loading state initially', () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      // The loading state might be indicated by disabled buttons or spinner
      const initializeButton = screen.getByText(/สร้างข้อมูลวันลาปี/i);
      expect(initializeButton).toBeDisabled();
    });

    it('should show error message when data loading fails', async () => {
      (leaveService.listBalances as any).mockRejectedValue(mockErrors.networkError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  // ========================================================================
  // DATA TABLE TESTS
  // ========================================================================

  describe('Balances Table', () => {
    it('should display leave balances after loading', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        // Check for data in table
        expect(screen.getAllByText(/employee-1/i).length).toBeGreaterThan(0);
      });
    });

    it('should show employee information', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        mockLeaveBalances.forEach(balance => {
          expect(screen.getAllByText(balance.employeeId).length).toBeGreaterThan(0);
        });
      });
    });

    it('should display entitled days', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument(); // entitledDays
        expect(screen.getByText('15')).toBeInTheDocument();
      });
    });

    it('should display used days', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // usedDays
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });

    it('should display remaining days', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getAllByText('5').length).toBeGreaterThan(0); // remainingDays
        expect(screen.getAllByText('14').length).toBeGreaterThan(0);
      });
    });

    it('should display pending days when greater than zero', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // pendingDays
      });
    });

    it('should show empty state when no balances exist', async () => {
      (leaveService.listBalances as any).mockResolvedValue({
        balances: [],
        total: 0,
        pagination: mockPaginationMeta,
      });

      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByText(/ไม่มีข้อมูล/i)).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // FILTER TESTS
  // ========================================================================

  describe('Filters', () => {
    it('should filter by year', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByLabelText(/ปี/i)).toBeInTheDocument();
      });

      const yearInput = screen.getByLabelText(/ปี/i);
      await user.clear(yearInput);
      await user.type(yearInput, '2023');

      // Trigger filter by unfocusing or pressing Enter
      fireEvent.blur(yearInput);

      await waitFor(() => {
        expect(leaveService.listBalances).toHaveBeenCalledWith(
          expect.objectContaining({ year: 2023 })
        );
      });
    });

    it('should filter by leave type', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByLabelText(/ประเภทการลา/i)).toBeInTheDocument();
      });

      const leaveTypeSelect = screen.getByLabelText(/ประเภทการลา/i);
      await user.selectOptions(leaveTypeSelect, mockLeaveTypes[0].id);

      await waitFor(() => {
        expect(leaveService.listBalances).toHaveBeenCalledWith(
          expect.objectContaining({ leaveTypeId: mockLeaveTypes[0].id })
        );
      });
    });

    it('should reset to page 1 when filter changes', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByLabelText(/ปี/i)).toBeInTheDocument();
      });

      // Change year filter
      const yearInput = screen.getByLabelText(/ปี/i);
      await user.clear(yearInput);
      await user.type(yearInput, '2023');
      fireEvent.blur(yearInput);

      await waitFor(() => {
        expect(leaveService.listBalances).toHaveBeenCalledWith(
          expect.objectContaining({ page: 1 })
        );
      });
    });

    it('should clear leave type filter when "All" is selected', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByLabelText(/ประเภทการลา/i)).toBeInTheDocument();
      });

      const leaveTypeSelect = screen.getByLabelText(/ประเภทการลา/i);

      // Select a type first
      await user.selectOptions(leaveTypeSelect, mockLeaveTypes[0].id);

      // Then select "All"
      await user.selectOptions(leaveTypeSelect, '');

      await waitFor(() => {
        expect(leaveService.listBalances).toHaveBeenCalledWith(
          expect.objectContaining({ leaveTypeId: undefined })
        );
      });
    });
  });

  // ========================================================================
  // PAGINATION TESTS
  // ========================================================================

  describe('Pagination', () => {
    it('should render pagination controls', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });
    });

    it('should navigate to next page', async () => {
      (leaveService.listBalances as any).mockResolvedValue({
        balances: mockLeaveBalances,
        total: 100,
        pagination: { ...mockPaginationMeta, hasNextPage: true },
      });

      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByLabelText(/ถัดไป/i) || screen.getByText(/ถัดไป/i)).toBeInTheDocument();
      });

      const nextButton = screen.getByLabelText(/ถัดไป/i) || screen.getByText(/ถัดไป/i);
      await user.click(nextButton);

      await waitFor(() => {
        expect(leaveService.listBalances).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 })
        );
      });
    });

    it('should navigate to previous page', async () => {
      // Set initial page to 2
      (leaveService.listBalances as any).mockResolvedValue({
        balances: mockLeaveBalances,
        total: 100,
        pagination: { ...mockPaginationMeta, page: 2, hasPreviousPage: true },
      });

      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByLabelText(/ก่อนหน้า/i) || screen.getByText(/ก่อนหน้า/i)).toBeInTheDocument();
      });

      const prevButton = screen.getByLabelText(/ก่อนหน้า/i) || screen.getByText(/ก่อนหน้า/i);
      await user.click(prevButton);

      await waitFor(() => {
        expect(leaveService.listBalances).toHaveBeenCalledWith(
          expect.objectContaining({ page: 1 })
        );
      });
    });

    it('should disable next button on last page', async () => {
      (leaveService.listBalances as any).mockResolvedValue({
        balances: mockLeaveBalances,
        total: 50,
        pagination: { ...mockPaginationMeta, hasNextPage: false, page: 1 },
      });

      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        const nextButton = screen.getByLabelText(/ถัดไป/i) || screen.getByText(/ถัดไป/i);
        expect(nextButton).toBeDisabled();
      });
    });

    it('should disable previous button on first page', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        const prevButton = screen.getByLabelText(/ก่อนหน้า/i) || screen.getByText(/ก่อนหน้า/i);
        expect(prevButton).toBeDisabled();
      });
    });
  });

  // ========================================================================
  // INITIALIZE BALANCES TESTS
  // ========================================================================

  describe('Initialize Balances', () => {
    it('should show confirmation dialog before initializing', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm');

      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByText(/สร้างข้อมูลวันลาปี/i)).toBeInTheDocument();
      });

      const initButton = screen.getByText(/สร้างข้อมูลวันลาปี/i);
      await user.click(initButton);

      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining(`ยืนยันการสร้างข้อมูลวันลาสำหรับปี ${currentYear}`)
      );
    });

    it('should initialize balances when confirmed', async () => {
      (leaveService.initializeBalances as any).mockResolvedValue({ created: 10 });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByText(/สร้างข้อมูลวันลาปี/i)).toBeInTheDocument();
      });

      const initButton = screen.getByText(/สร้างข้อมูลวันลาปี/i);
      await user.click(initButton);

      await waitFor(() => {
        expect(leaveService.initializeBalances).toHaveBeenCalledWith(currentYear);
      });
    });

    it('should not initialize if user cancels confirmation', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByText(/สร้างข้อมูลวันลาปี/i)).toBeInTheDocument();
      });

      const initButton = screen.getByText(/สร้างข้อมูลวันลาปี/i);
      await user.click(initButton);

      expect(leaveService.initializeBalances).not.toHaveBeenCalled();
    });

    it('should reload data after successful initialization', async () => {
      (leaveService.initializeBalances as any).mockResolvedValue({ created: 10 });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      const initialCallCount = (leaveService.listBalances as any).mock.calls.length;

      await waitFor(() => {
        expect(screen.getByText(/สร้างข้อมูลวันลาปี/i)).toBeInTheDocument();
      });

      const initButton = screen.getByText(/สร้างข้อมูลวันลาปี/i);
      await user.click(initButton);

      await waitFor(() => {
        expect((leaveService.listBalances as any).mock.calls.length).toBeGreaterThan(
          initialCallCount
        );
      });
    });

    it('should show success alert after initialization', async () => {
      (leaveService.initializeBalances as any).mockResolvedValue({ created: 10 });
      const alertSpy = vi.spyOn(window, 'alert');
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByText(/สร้างข้อมูลวันลาปี/i)).toBeInTheDocument();
      });

      const initButton = screen.getByText(/สร้างข้อมูลวันลาปี/i);
      await user.click(initButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('สร้างข้อมูลวันลาเรียบร้อยแล้ว');
      });
    });

    it('should show error alert if initialization fails', async () => {
      (leaveService.initializeBalances as any).mockRejectedValue(mockErrors.networkError);
      const alertSpy = vi.spyOn(window, 'alert');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByText(/สร้างข้อมูลวันลาปี/i)).toBeInTheDocument();
      });

      const initButton = screen.getByText(/สร้างข้อมูลวันลาปี/i);
      await user.click(initButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('เกิดข้อผิดพลาดในการสร้างข้อมูล');
      });

      consoleSpy.mockRestore();
    });

    it('should disable initialize button during loading', async () => {
      (leaveService.initializeBalances as any).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByText(/สร้างข้อมูลวันลาปี/i)).toBeInTheDocument();
      });

      const initButton = screen.getByText(/สร้างข้อมูลวันลาปี/i);
      await user.click(initButton);

      expect(initButton).toBeDisabled();
    });
  });

  // ========================================================================
  // UPDATE BALANCE TESTS
  // ========================================================================

  describe('Update Balance', () => {
    it('should allow editing entitled days', async () => {
      (leaveService.updateLeaveBalance as any).mockResolvedValue(
        createMockLeaveBalance({ entitledDays: 12 })
      );

      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
      });

      // Find and click edit button (implementation depends on actual UI)
      const editButtons = screen.getAllByRole('button', { name: /แก้ไข/i });
      if (editButtons.length > 0) {
        await user.click(editButtons[0]);

        // Update entitled days
        const entitledInput = screen.getByLabelText(/วันที่ได้รับ/i);
        await user.clear(entitledInput);
        await user.type(entitledInput, '12');

        const saveButton = screen.getByRole('button', { name: /บันทึก/i });
        await user.click(saveButton);

        await waitFor(() => {
          expect(leaveService.updateLeaveBalance).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(String),
            12
          );
        });
      }
    });

    it('should validate entitled days as a positive number', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /แก้ไข/i });
      if (editButtons.length > 0) {
        await user.click(editButtons[0]);

        const entitledInput = screen.getByLabelText(/วันที่ได้รับ/i);
        await user.clear(entitledInput);
        await user.type(entitledInput, '-5');

        const saveButton = screen.getByRole('button', { name: /บันทึก/i });
        await user.click(saveButton);

        await waitFor(() => {
          expect(screen.getByText(/กรุณาระบุจำนวนวันที่ถูกต้อง/i)).toBeInTheDocument();
        });

        expect(leaveService.updateLeaveBalance).not.toHaveBeenCalled();
      }
    });

    it('should reload data after successful update', async () => {
      (leaveService.updateLeaveBalance as any).mockResolvedValue({});

      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      const initialCallCount = (leaveService.listBalances as any).mock.calls.length;

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /แก้ไข/i });
      if (editButtons.length > 0) {
        await user.click(editButtons[0]);

        const saveButton = screen.getByRole('button', { name: /บันทึก/i });
        await user.click(saveButton);

        await waitFor(() => {
          expect((leaveService.listBalances as any).mock.calls.length).toBeGreaterThan(
            initialCallCount
          );
        });
      }
    });
  });

  // ========================================================================
  // TOTAL COUNT TESTS
  // ========================================================================

  describe('Total Count Display', () => {
    it('should display total count of balances', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByText(new RegExp(`ทั้งหมด ${mockLeaveBalances.length} รายการ`))).toBeInTheDocument();
      });
    });

    it('should update total when filter changes', async () => {
      render(<LeaveBalancesPage />, { wrapper: RouterWrapper });

      await waitFor(() => {
        expect(screen.getByLabelText(/ประเภทการลา/i)).toBeInTheDocument();
      });

      (leaveService.listBalances as any).mockResolvedValue({
        balances: [mockLeaveBalances[0]],
        total: 1,
        pagination: mockPaginationMeta,
      });

      const leaveTypeSelect = screen.getByLabelText(/ประเภทการลา/i);
      await user.selectOptions(leaveTypeSelect, mockLeaveTypes[0].id);

      await waitFor(() => {
        expect(screen.getByText(/ทั้งหมด 1 รายการ/)).toBeInTheDocument();
      });
    });
  });
});

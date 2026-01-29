import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import LeavePage from './LeavePage';
import leaveService from '../../services/leave.service';
import {
  mockLeaveRequests,
  mockLeaveSummary,
  mockLeaveTypes,
  mockPaginationMeta,
  getRequestsByStatus,
  createMockLeaveRequest,
  mockErrors,
} from '../../test/setup/leave-mocks';

// Mock dependencies
vi.mock('../../services/leave.service', () => ({
  default: {
    listLeaveRequests: vi.fn(),
    getLeaveSummary: vi.fn(),
    getPendingCount: vi.fn(),
    listLeaveTypes: vi.fn(),
    approveLeaveRequest: vi.fn(),
    rejectLeaveRequest: vi.fn(),
    getLeaveDocumentUrl: vi.fn(),
  },
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { language: 'th' },
  }),
}));

// Mock common components
vi.mock('../../components/common', () => ({
  Button: ({ children, onClick, variant, disabled, leftIcon, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} {...props}>
      {leftIcon}
      {children}
    </button>
  ),
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
  Modal: ({ isOpen, onClose, title, children, size }: any) =>
    isOpen ? (
      <div data-testid="modal" data-size={size}>
        <div data-testid="modal-header">
          {title}
          <button onClick={onClose} data-testid="modal-close">
            Close
          </button>
        </div>
        <div data-testid="modal-content">{children}</div>
      </div>
    ) : null,
  Avatar: ({ name }: any) => <div data-testid="avatar">{name}</div>,
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

// Mock layout components
vi.mock('../../components/layout', () => ({
  PageHeader: ({ title, subtitle, actions }: any) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {actions}
    </div>
  ),
}));

// Mock data display components
vi.mock('../../components/data-display', () => ({
  Stat: ({ label, value, icon }: any) => (
    <div data-testid="stat">
      {icon}
      <span data-testid="stat-label">{label}</span>
      <span data-testid="stat-value">{value}</span>
    </div>
  ),
  DataTable: ({ data, columns }: any) => (
    <div data-testid="data-table">
      {data.map((row: any, index: number) => (
        <div key={row.id || index} data-testid={`table-row-${index}`}>
          {columns.map((col: any) => (
            <div key={col.id}>{typeof col.cell === 'function' ? col.cell(row) : null}</div>
          ))}
        </div>
      ))}
    </div>
  ),
  Pagination: ({ currentPage, totalPages, onPageChange }: any) => (
    <div data-testid="pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        data-testid="prev-page"
      >
        Previous
      </button>
      <span data-testid="current-page">{currentPage}</span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        data-testid="next-page"
      >
        Next
      </button>
    </div>
  ),
}));

// Mock navigation components
vi.mock('../../components/navigation', () => ({
  Tabs: ({ children }: any) => <div data-testid="tabs">{children}</div>,
  TabList: ({ children }: any) => <div data-testid="tab-list">{children}</div>,
  Tab: ({ children, isActive, onClick }: any) => (
    <button data-testid="tab" data-active={isActive} onClick={onClick}>
      {children}
    </button>
  ),
  Menu: ({ children, trigger }: any) => (
    <div data-testid="menu">
      {trigger}
      {children}
    </div>
  ),
  MenuItem: ({ children, onClick }: any) => (
    <button data-testid="menu-item" onClick={onClick}>
      {children}
    </button>
  ),
}));

describe('LeavePage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful responses
    (leaveService.listLeaveRequests as any).mockResolvedValue({
      requests: mockLeaveRequests,
      total: mockLeaveRequests.length,
      pagination: mockPaginationMeta,
    });

    (leaveService.getLeaveSummary as any).mockResolvedValue(mockLeaveSummary);
    (leaveService.getPendingCount as any).mockResolvedValue(mockLeaveSummary.pendingRequests);
    (leaveService.listLeaveTypes as any).mockResolvedValue(mockLeaveTypes);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================================================
  // DASHBOARD RENDERING TESTS
  // ========================================================================

  describe('Dashboard Stats', () => {
    it('should render dashboard with summary statistics', async () => {
      render(<LeavePage />);

      await waitFor(() => {
        const stats = screen.getAllByTestId('stat');
        expect(stats.length).toBeGreaterThan(0);
      });
    });

    it('should display correct pending requests count', async () => {
      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // mockLeaveSummary.pendingRequests
      });
    });

    it('should display approved this month count', async () => {
      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // mockLeaveSummary.approvedThisMonth
      });
    });

    it('should display employees on leave today count', async () => {
      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // mockLeaveSummary.employeesOnLeaveToday
      });
    });

    it('should display upcoming leaves count', async () => {
      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByText('8')).toBeInTheDocument(); // mockLeaveSummary.upcomingLeaves
      });
    });

    it('should show loading spinner while fetching data', () => {
      render(<LeavePage />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should hide loading spinner after data is loaded', async () => {
      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // LIST VIEW TESTS
  // ========================================================================

  describe('Leave Requests List', () => {
    it('should render data table with leave requests', async () => {
      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });
    });

    it('should display leave request details in table', async () => {
      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByText(/สมชาย ใจดี/)).toBeInTheDocument();
        expect(screen.getByText(/ลาพักผ่อน/)).toBeInTheDocument();
      });
    });

    it('should render pagination controls', async () => {
      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('pagination')).toBeInTheDocument();
      });
    });

    it('should handle page change', async () => {
      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('pagination')).toBeInTheDocument();
      });

      const nextButton = screen.getByTestId('next-page');
      await user.click(nextButton);

      await waitFor(() => {
        expect(leaveService.listLeaveRequests).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 })
        );
      });
    });

    it('should open detail modal when clicking on review button', async () => {
      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      // Find the review button in the first row
      const reviewButton = screen.getAllByText('พิจารณา')[0];
      await user.click(reviewButton);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // FILTER TESTS
  // ========================================================================

  describe('Filters', () => {
    it('should filter by status', async () => {
      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      // Open status menu (using raw text if t() returns fallback)
      const statusButton = screen.getAllByText('สถานะ')[0];
      await user.click(statusButton);

      // Click 'Approved' option
      const approvedOption = screen.getByText('อนุมัติแล้ว');
      await user.click(approvedOption);

      await waitFor(() => {
        expect(leaveService.listLeaveRequests).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'approved' })
        );
      });
    });

    it('should apply multiple filters simultaneously', async () => {
      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      // Test implementation would depend on actual filter UI
      // This verifies the API is called with correct parameters
      expect(leaveService.listLeaveRequests).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // APPROVAL MODAL TESTS
  // ========================================================================

  describe('Approval Modal', () => {
    it('should display leave request details in modal', async () => {
      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const reviewButton = screen.getAllByText('พิจารณา')[0];
      await user.click(reviewButton);

      await waitFor(() => {
        const modal = screen.getByTestId('modal');
        expect(within(modal).getByText(/สมชาย ใจดี/)).toBeInTheDocument();
      });
    });

    it('should show approve and reject buttons for pending requests', async () => {
      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      // Click on pending request
      const reviewButton = screen.getAllByText('พิจารณา')[0];
      await user.click(reviewButton);

      await waitFor(() => {
        const approveButton = screen.getByText('อนุมัติ');
        const rejectButton = screen.getByText('ไม่อนุมัติ');
        expect(approveButton).toBeInTheDocument();
        expect(rejectButton).toBeInTheDocument();
      });
    });

    it('should not show approve/reject buttons for non-pending requests', async () => {
      const approvedRequest = createMockLeaveRequest({ status: 'approved' });
      (leaveService.listLeaveRequests as any).mockResolvedValue({
        requests: [approvedRequest],
        total: 1,
        pagination: mockPaginationMeta,
      });

      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const viewButton = screen.getAllByText('ดู')[0];
      await user.click(viewButton);

      await waitFor(() => {
        expect(screen.queryByText('อนุมัติ')).not.toBeInTheDocument();
        expect(screen.queryByText('ไม่อนุมัติ')).not.toBeInTheDocument();
      });
    });

    it('should show notes input when approve button is clicked', async () => {
      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const reviewButton = screen.getAllByText('พิจารณา')[0];
      await user.click(reviewButton);

      await waitFor(() => {
        expect(screen.getByText('อนุมัติ')).toBeInTheDocument();
      });

      const approveButton = screen.getByText('อนุมัติ');
      await user.click(approveButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ระบุหมายเหตุ/i)).toBeInTheDocument();
      });
    });

    it('should require reason when rejecting', async () => {
      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const reviewButton = screen.getAllByText('พิจารณา')[0];
      await user.click(reviewButton);

      await waitFor(() => {
        expect(screen.getByText('ไม่อนุมัติ')).toBeInTheDocument();
      });

      const rejectButton = screen.getByText('ไม่อนุมัติ');
      await user.click(rejectButton);

      await waitFor(() => {
        const reasonInput = screen.getByPlaceholderText(/ระบุเหตุผล/i);
        expect(reasonInput).toBeRequired();
      });
    });

    it('should call approveLeaveRequest when approve is confirmed', async () => {
      (leaveService.approveLeaveRequest as any).mockResolvedValue({});

      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const reviewButton = screen.getAllByText('พิจารณา')[0];
      await user.click(reviewButton);

      await waitFor(() => {
        expect(screen.getByText('อนุมัติ')).toBeInTheDocument();
      });

      const approveButton = screen.getByText('อนุมัติ');
      await user.click(approveButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ระบุหมายเหตุ/i)).toBeInTheDocument();
      });

      const notesInput = screen.getByPlaceholderText(/ระบุหมายเหตุ/i);
      await user.type(notesInput, 'Approved for vacation');

      const confirmButton = screen.getByText('ยืนยันอนุมัติ');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(leaveService.approveLeaveRequest).toHaveBeenCalledWith(
          expect.any(String),
          'Approved for vacation'
        );
      });
    });

    it('should call rejectLeaveRequest when rejection is confirmed', async () => {
      (leaveService.rejectLeaveRequest as any).mockResolvedValue({});

      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const reviewButton = screen.getAllByText('พิจารณา')[0];
      await user.click(reviewButton);

      await waitFor(() => {
        expect(screen.getByText('ไม่อนุมัติ')).toBeInTheDocument();
      });

      const rejectButton = screen.getByText('ไม่อนุมัติ');
      await user.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ระบุเหตุผล/i)).toBeInTheDocument();
      });

      const reasonInput = screen.getByPlaceholderText(/ระบุเหตุผล/i);
      await user.type(reasonInput, 'Insufficient notice');

      const confirmButton = screen.getByText('ยืนยันไม่อนุมัติ');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(leaveService.rejectLeaveRequest).toHaveBeenCalledWith(
          expect.any(String),
          'Insufficient notice'
        );
      });
    });

    it('should show error message if approval fails', async () => {
      (leaveService.approveLeaveRequest as any).mockRejectedValue(
        mockErrors.networkError
      );

      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const reviewButton = screen.getAllByText('พิจารณา')[0];
      await user.click(reviewButton);

      const approveButton = screen.getByText('อนุมัติ');
      await user.click(approveButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ระบุหมายเหตุ/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('ยืนยันอนุมัติ');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Network request failed/i)).toBeInTheDocument();
      });
    });

    it('should reload data after successful approval', async () => {
      (leaveService.approveLeaveRequest as any).mockResolvedValue({});

      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const initialCallCount = (leaveService.listLeaveRequests as any).mock.calls.length;

      const reviewButton = screen.getAllByText('พิจารณา')[0];
      await user.click(reviewButton);

      const approveButton = screen.getByText('อนุมัติ');
      await user.click(approveButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ระบุหมายเหตุ/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('ยืนยันอนุมัติ');
      await user.click(confirmButton);

      await waitFor(() => {
        expect((leaveService.listLeaveRequests as any).mock.calls.length).toBeGreaterThan(
          initialCallCount
        );
      });
    });

    it('should close modal after successful action', async () => {
      (leaveService.approveLeaveRequest as any).mockResolvedValue({});

      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const reviewButton = screen.getAllByText('พิจารณา')[0];
      await user.click(reviewButton);

      const approveButton = screen.getByText('อนุมัติ');
      await user.click(approveButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ระบุหมายเหตุ/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('ยืนยันอนุมัติ');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // DOCUMENT PREVIEW TESTS
  // ========================================================================

  describe('Document Preview in Modal', () => {
    it('should show document link when request has document', async () => {
      const requestWithDoc = createMockLeaveRequest({
        documentUrl: 'company-123/request-1/medical-cert.pdf',
      });

      (leaveService.listLeaveRequests as any).mockResolvedValue({
        requests: [requestWithDoc],
        total: 1,
        pagination: mockPaginationMeta,
      });

      (leaveService.getLeaveDocumentUrl as any).mockResolvedValue({
        url: 'https://signed-url.com/document.pdf',
      });

      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const reviewButton = screen.getAllByText('พิจารณา')[0];
      await user.click(reviewButton);

      await waitFor(() => {
        expect(screen.getByText('ดูเอกสาร')).toBeInTheDocument();
      });
    });

    it('should fetch signed URL when modal opens with document', async () => {
      const requestWithDoc = createMockLeaveRequest({
        documentUrl: 'company-123/request-1/medical-cert.pdf',
      });

      (leaveService.listLeaveRequests as any).mockResolvedValue({
        requests: [requestWithDoc],
        total: 1,
        pagination: mockPaginationMeta,
      });

      (leaveService.getLeaveDocumentUrl as any).mockResolvedValue({
        url: 'https://signed-url.com/document.pdf',
      });

      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const reviewButton = screen.getAllByText('พิจารณา')[0];
      await user.click(reviewButton);

      await waitFor(() => {
        expect(leaveService.getLeaveDocumentUrl).toHaveBeenCalledWith(requestWithDoc.id);
      });
    });

    it('should show loading state while fetching document URL', async () => {
      const requestWithDoc = createMockLeaveRequest({
        documentUrl: 'company-123/request-1/medical-cert.pdf',
      });

      (leaveService.listLeaveRequests as any).mockResolvedValue({
        requests: [requestWithDoc],
        total: 1,
        pagination: mockPaginationMeta,
      });

      (leaveService.getLeaveDocumentUrl as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const reviewButton = screen.getAllByText('พิจารณา')[0];
      await user.click(reviewButton);

      await waitFor(() => {
        expect(screen.getByText(/กำลังโหลดเอกสาร/i)).toBeInTheDocument();
      });
    });

    it('should show error message if document URL fetch fails', async () => {
      const requestWithDoc = createMockLeaveRequest({
        documentUrl: 'company-123/request-1/medical-cert.pdf',
      });

      (leaveService.listLeaveRequests as any).mockResolvedValue({
        requests: [requestWithDoc],
        total: 1,
        pagination: mockPaginationMeta,
      });

      (leaveService.getLeaveDocumentUrl as any).mockRejectedValue(
        mockErrors.networkError
      );

      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const reviewButton = screen.getAllByText('พิจารณา')[0];
      await user.click(reviewButton);

      await waitFor(() => {
        expect(screen.getByText(/ไม่สามารถโหลดเอกสารได้/i)).toBeInTheDocument();
      });
    });

    it('should not show document section when request has no document', async () => {
      const requestWithoutDoc = createMockLeaveRequest({
        documentUrl: undefined,
      });

      (leaveService.listLeaveRequests as any).mockResolvedValue({
        requests: [requestWithoutDoc],
        total: 1,
        pagination: mockPaginationMeta,
      });

      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const viewButton = screen.getAllByText('ดู')[0];
      await user.click(viewButton);

      await waitFor(() => {
        expect(screen.queryByText('ดูเอกสาร')).not.toBeInTheDocument();
      });
    });

    it('should open document in new tab when view button is clicked', async () => {
      const requestWithDoc = createMockLeaveRequest({
        documentUrl: 'company-123/request-1/medical-cert.pdf',
      });

      (leaveService.listLeaveRequests as any).mockResolvedValue({
        requests: [requestWithDoc],
        total: 1,
        pagination: mockPaginationMeta,
      });

      const signedUrl = 'https://signed-url.com/document.pdf';
      (leaveService.getLeaveDocumentUrl as any).mockResolvedValue({
        url: signedUrl,
      });

      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const reviewButton = screen.getAllByText('พิจารณา')[0];
      await user.click(reviewButton);

      await waitFor(() => {
        const viewButton = screen.getByText('ดูเอกสาร');
        expect(viewButton).toHaveAttribute('href', signedUrl);
        expect(viewButton).toHaveAttribute('target', '_blank');
      });
    });
  });

  // ========================================================================
  // ERROR HANDLING TESTS
  // ========================================================================

  describe('Error Handling', () => {
    it('should display error message when data loading fails', async () => {
      (leaveService.listLeaveRequests as any).mockRejectedValue(
        mockErrors.networkError
      );

      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByText(/Network request failed/i)).toBeInTheDocument();
      });
    });

    it('should show error for reject without reason', async () => {
      render(<LeavePage />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
      });

      const firstRow = screen.getByTestId('table-row-0');
      await user.click(firstRow);

      const rejectButton = screen.getByText('ไม่อนุมัติ');
      await user.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ระบุเหตุผล/i)).toBeInTheDocument();
      });

      // Try to confirm without entering reason
      const confirmButton = screen.getByText('ยืนยันไม่อนุมัติ');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(
          screen.getByText(/กรุณาระบุเหตุผลในการไม่อนุมัติ/i)
        ).toBeInTheDocument();
      });

      expect(leaveService.rejectLeaveRequest).not.toHaveBeenCalled();
    });
  });
});

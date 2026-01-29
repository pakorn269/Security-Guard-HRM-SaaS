import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import LiffLeavePage from './LiffLeavePage';
import leaveService from '../../services/leave.service';
import {
  mockMyLeaveData,
  mockLeaveTypes,
  mockLeaveRequestPayload,
  mockFiles,
  mockErrors,
  mockApiResponse,
} from '../../test/setup/leave-mocks';

// Mock dependencies
vi.mock('../../services/leave.service', () => ({
  default: {
    getMyLeaveData: vi.fn(),
    listLeaveTypes: vi.fn(),
    createLeaveRequest: vi.fn(),
    cancelLeaveRequest: vi.fn(),
    uploadLeaveDocument: vi.fn(),
  },
}));

// Mock FileUpload component
vi.mock('../../components/forms/FileUpload', () => ({
  default: ({ label, required, onChange, files }: any) => (
    <div data-testid="file-upload">
      <label>{label}</label>
      {required && <span data-testid="required-indicator">*</span>}
      <input
        type="file"
        data-testid="file-input"
        onChange={(e) => {
          const fileList = e.target.files;
          if (fileList && fileList.length > 0) {
            onChange([fileList[0]]);
          }
        }}
      />
      {files && files.length > 0 && (
        <div data-testid="file-preview">{files[0].name}</div>
      )}
    </div>
  ),
}));

describe('LiffLeavePage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful responses
    (leaveService.getMyLeaveData as any).mockResolvedValue(mockMyLeaveData);
    (leaveService.listLeaveTypes as any).mockResolvedValue(
      mockLeaveTypes.filter((t) => t.isActive)
    );
    (leaveService.createLeaveRequest as any).mockResolvedValue({
      id: 'new-request-123',
      ...mockLeaveRequestPayload.valid,
      status: 'pending',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  // ========================================================================
  // BASIC RENDERING TESTS
  // ========================================================================

  describe('Initial Rendering', () => {
    it('should render loading state initially', () => {
      render(<LiffLeavePage />);
      expect(screen.getByText('กำลังโหลด...')).toBeInTheDocument();
    });

    it('should display leave balances after loading', async () => {
      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText(/วันลาคงเหลือ/i)).toBeInTheDocument();
      });

      // Check if balances are displayed
      expect(screen.getByText(/ลาพักผ่อน/)).toBeInTheDocument();
      expect(screen.getByText(/ลาป่วย/)).toBeInTheDocument();
    });

    it('should show pending requests section when there are pending requests', async () => {
      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText(/คำขอที่รออนุมัติ/i)).toBeInTheDocument();
      });
    });

    it('should show leave history', async () => {
      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText(/ประวัติการลา/i)).toBeInTheDocument();
      });
    });

    it('should display error message when data loading fails', async () => {
      (leaveService.getMyLeaveData as any).mockRejectedValue(
        mockErrors.networkError
      );

      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText(/ไม่สามารถโหลดข้อมูลการลาได้/i)).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // FORM INTERACTION TESTS
  // ========================================================================

  describe('Leave Request Form', () => {
    it('should open form when "ขอลาใหม่" button is clicked', async () => {
      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText('ขอลาใหม่')).toBeInTheDocument();
      });

      const requestButton = screen.getByText('ขอลาใหม่');
      await user.click(requestButton);

      expect(screen.getByText(/ประเภทการลา/i)).toBeInTheDocument();
      expect(screen.getByText(/วันที่เริ่ม/i)).toBeInTheDocument();
      expect(screen.getByText(/วันที่สิ้นสุด/i)).toBeInTheDocument();
    });

    it('should close form when close button is clicked', async () => {
      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText('ขอลาใหม่')).toBeInTheDocument();
      });

      await user.click(screen.getByText('ขอลาใหม่'));

      const closeButton = screen.getAllByRole('button').find((btn) =>
        btn.querySelector('[data-testid]')
      );
      if (closeButton) {
        await user.click(closeButton);
      }

      await waitFor(() => {
        expect(screen.queryByText(/วันที่เริ่ม/i)).not.toBeInTheDocument();
      });
    });

    it('should calculate total days when dates are selected', async () => {
      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText('ขอลาใหม่')).toBeInTheDocument();
      });

      await user.click(screen.getByText('ขอลาใหม่'));

      // Select dates
      const startDateInput = screen.getByLabelText(/วันที่เริ่ม/i);
      const endDateInput = screen.getByLabelText(/วันที่สิ้นสุด/i);

      await user.clear(startDateInput);
      await user.type(startDateInput, '2024-07-15');

      await user.clear(endDateInput);
      await user.type(endDateInput, '2024-07-17');

      await waitFor(() => {
        expect(screen.getByText(/จำนวนวันลา: 3 วัน/i)).toBeInTheDocument();
      });
    });

    it('should display validation error when required fields are empty', async () => {
      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText('ขอลาใหม่')).toBeInTheDocument();
      });

      await user.click(screen.getByText('ขอลาใหม่'));

      // Click submit without filling form
      const submitButton = screen.getByText('ส่งคำขอ');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/กรุณากรอกข้อมูลให้ครบถ้วน/i)).toBeInTheDocument();
      });

      expect(leaveService.createLeaveRequest).not.toHaveBeenCalled();
    });

    it('should submit form successfully with valid data', async () => {
      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText('ขอลาใหม่')).toBeInTheDocument();
      });

      await user.click(screen.getByText('ขอลาใหม่'));

      // Fill form
      const leaveTypeSelect = screen.getByLabelText(/ประเภทการลา/i);
      await user.selectOptions(leaveTypeSelect, 'leave-type-1');

      const startDateInput = screen.getByLabelText(/วันที่เริ่ม/i);
      await user.type(startDateInput, '2024-07-20');

      const endDateInput = screen.getByLabelText(/วันที่สิ้นสุด/i);
      await user.type(endDateInput, '2024-07-22');

      const reasonTextarea = screen.getByPlaceholderText(/ระบุเหตุผลการลา/i);
      await user.type(reasonTextarea, 'Summer vacation');

      // Submit
      const submitButton = screen.getByText('ส่งคำขอ');
      await user.click(submitButton);

      await waitFor(() => {
        expect(leaveService.createLeaveRequest).toHaveBeenCalledWith({
          leaveTypeId: 'leave-type-1',
          startDate: '2024-07-20',
          endDate: '2024-07-22',
          reason: 'Summer vacation',
        });
      });

      // Check success message
      await waitFor(() => {
        expect(screen.getByText(/ส่งคำขอลาสำเร็จ/i)).toBeInTheDocument();
      });
    });

    it('should show error message when submission fails', async () => {
      (leaveService.createLeaveRequest as any).mockRejectedValue(
        mockErrors.insufficientBalance
      );

      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText('ขอลาใหม่')).toBeInTheDocument();
      });

      await user.click(screen.getByText('ขอลาใหม่'));

      // Fill form
      const leaveTypeSelect = screen.getByLabelText(/ประเภทการลา/i);
      await user.selectOptions(leaveTypeSelect, 'leave-type-1');

      const startDateInput = screen.getByLabelText(/วันที่เริ่ม/i);
      await user.type(startDateInput, '2024-07-20');

      const endDateInput = screen.getByLabelText(/วันที่สิ้นสุด/i);
      await user.type(endDateInput, '2024-07-22');

      // Submit
      const submitButton = screen.getByText('ส่งคำขอ');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Insufficient leave balance/i)
        ).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // DOCUMENT UPLOAD TESTS
  // ========================================================================

  describe('Document Upload', () => {
    it('should show file upload component in form', async () => {
      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText('ขอลาใหม่')).toBeInTheDocument();
      });

      await user.click(screen.getByText('ขอลาใหม่'));

      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
      expect(screen.getByText(/แนบเอกสาร/i)).toBeInTheDocument();
    });

    it('should mark document as required when leave type requires document', async () => {
      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText('ขอลาใหม่')).toBeInTheDocument();
      });

      await user.click(screen.getByText('ขอลาใหม่'));

      // Select leave type that requires document (Sick Leave)
      const leaveTypeSelect = screen.getByLabelText(/ประเภทการลา/i);
      await user.selectOptions(leaveTypeSelect, 'leave-type-2');

      // Check if required indicator appears
      await waitFor(() => {
        expect(screen.getByTestId('required-indicator')).toBeInTheDocument();
      });
    });

    it('should show validation error when document is required but not uploaded', async () => {
      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText('ขอลาใหม่')).toBeInTheDocument();
      });

      await user.click(screen.getByText('ขอลาใหม่'));

      // Select leave type that requires document
      const leaveTypeSelect = screen.getByLabelText(/ประเภทการลา/i);
      await user.selectOptions(leaveTypeSelect, 'leave-type-2');

      const startDateInput = screen.getByLabelText(/วันที่เริ่ม/i);
      await user.type(startDateInput, '2024-07-25');

      const endDateInput = screen.getByLabelText(/วันที่สิ้นสุด/i);
      await user.type(endDateInput, '2024-07-26');

      // Submit without document
      const submitButton = screen.getByText('ส่งคำขอ');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/ต้องแนบเอกสารสำหรับการลาประเภทนี้/i)
        ).toBeInTheDocument();
      });
    });

    it('should upload document after creating leave request', async () => {
      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText('ขอลาใหม่')).toBeInTheDocument();
      });

      await user.click(screen.getByText('ขอลาใหม่'));

      // Fill form
      const leaveTypeSelect = screen.getByLabelText(/ประเภทการลา/i);
      await user.selectOptions(leaveTypeSelect, 'leave-type-2');

      const startDateInput = screen.getByLabelText(/วันที่เริ่ม/i);
      await user.type(startDateInput, '2024-07-25');

      const endDateInput = screen.getByLabelText(/วันที่สิ้นสุด/i);
      await user.type(endDateInput, '2024-07-26');

      // Upload file (simulated)
      const fileInput = screen.getByTestId('file-input');
      const file = mockFiles.validPdf;

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Submit
      const submitButton = screen.getByText('ส่งคำขอ');
      await user.click(submitButton);

      await waitFor(() => {
        expect(leaveService.createLeaveRequest).toHaveBeenCalled();
        expect(leaveService.uploadLeaveDocument).toHaveBeenCalledWith(
          'new-request-123',
          file
        );
      });
    });

    it('should show error if document upload fails but request was created', async () => {
      (leaveService.uploadLeaveDocument as any).mockRejectedValue(
        mockErrors.fileTooBig
      );

      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText('ขอลาใหม่')).toBeInTheDocument();
      });

      await user.click(screen.getByText('ขอลาใหม่'));

      // Fill form with document
      const leaveTypeSelect = screen.getByLabelText(/ประเภทการลา/i);
      await user.selectOptions(leaveTypeSelect, 'leave-type-1');

      const startDateInput = screen.getByLabelText(/วันที่เริ่ม/i);
      await user.type(startDateInput, '2024-07-25');

      const endDateInput = screen.getByLabelText(/วันที่สิ้นสุด/i);
      await user.type(endDateInput, '2024-07-26');

      // Upload file
      const fileInput = screen.getByTestId('file-input');
      const file = mockFiles.validPdf;

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Submit
      const submitButton = screen.getByText('ส่งคำขอ');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/คำขอลาถูกสร้างแล้ว แต่การอัพโหลดเอกสารล้มเหลว/i)
        ).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // CANCEL REQUEST TESTS
  // ========================================================================

  describe('Cancel Pending Request', () => {
    it('should show cancel button for pending requests', async () => {
      render(<LiffLeavePage />);

      await waitFor(() => {
        const cancelButtons = screen.getAllByText('ยกเลิก');
        expect(cancelButtons.length).toBeGreaterThan(0);
      });
    });

    it('should call cancelLeaveRequest when cancel button is clicked', async () => {
      (leaveService.cancelLeaveRequest as any).mockResolvedValue({});

      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText(/คำขอที่รออนุมัติ/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getAllByText('ยกเลิก')[0];
      await user.click(cancelButton);

      await waitFor(() => {
        expect(leaveService.cancelLeaveRequest).toHaveBeenCalled();
      });
    });

    it('should reload data after successful cancellation', async () => {
      (leaveService.cancelLeaveRequest as any).mockResolvedValue({});

      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText(/คำขอที่รออนุมัติ/i)).toBeInTheDocument();
      });

      const initialCallCount = (leaveService.getMyLeaveData as any).mock.calls
        .length;

      const cancelButton = screen.getAllByText('ยกเลิก')[0];
      await user.click(cancelButton);

      await waitFor(() => {
        expect((leaveService.getMyLeaveData as any).mock.calls.length).toBe(
          initialCallCount + 1
        );
      });
    });
  });

  // ========================================================================
  // LEAVE BALANCE DISPLAY TESTS
  // ========================================================================

  describe('Leave Balance Display', () => {
    it('should display progress bars for each leave type', async () => {
      render(<LiffLeavePage />);

      await waitFor(() => {
        const progressBars = screen.getAllByRole('progressbar', {
          hidden: true,
        });
        expect(progressBars.length).toBeGreaterThan(0);
      });
    });

    it('should show pending days in balance display', async () => {
      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText(/รอ 2/i)).toBeInTheDocument(); // Pending days for Annual Leave
      });
    });

    it('should show "ไม่มีข้อมูลวันลา" when no balances exist', async () => {
      (leaveService.getMyLeaveData as any).mockResolvedValue({
        balances: [],
        pendingRequests: [],
        recentRequests: [],
      });

      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText(/ไม่มีข้อมูลวันลา/i)).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // LOADING AND ERROR STATES
  // ========================================================================

  describe('Loading States', () => {
    it('should show loading spinner during form submission', async () => {
      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText('ขอลาใหม่')).toBeInTheDocument();
      });

      await user.click(screen.getByText('ขอลาใหม่'));

      // Fill form
      const leaveTypeSelect = screen.getByLabelText(/ประเภทการลา/i);
      await user.selectOptions(leaveTypeSelect, 'leave-type-1');

      const startDateInput = screen.getByLabelText(/วันที่เริ่ม/i);
      await user.type(startDateInput, '2024-07-20');

      const endDateInput = screen.getByLabelText(/วันที่สิ้นสุด/i);
      await user.type(endDateInput, '2024-07-22');

      // Submit
      const submitButton = screen.getByText('ส่งคำขอ');
      await user.click(submitButton);

      // Check for loading text
      expect(screen.getByText(/กำลังส่ง/i)).toBeInTheDocument();
    });

    it('should show uploading text during document upload', async () => {
      // Delay the upload to see loading state
      (leaveService.uploadLeaveDocument as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText('ขอลาใหม่')).toBeInTheDocument();
      });

      await user.click(screen.getByText('ขอลาใหม่'));

      // Fill form with document
      const leaveTypeSelect = screen.getByLabelText(/ประเภทการลา/i);
      await user.selectOptions(leaveTypeSelect, 'leave-type-1');

      const startDateInput = screen.getByLabelText(/วันที่เริ่ม/i);
      await user.type(startDateInput, '2024-07-25');

      const endDateInput = screen.getByLabelText(/วันที่สิ้นสุด/i);
      await user.type(endDateInput, '2024-07-26');

      // Upload file
      const fileInput = screen.getByTestId('file-input');
      const file = mockFiles.validPdf;

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Submit
      const submitButton = screen.getByText('ส่งคำขอ');
      await user.click(submitButton);

      // Check for uploading text
      await waitFor(() => {
        expect(screen.getByText(/กำลังอัพโหลดเอกสาร/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button during submission', async () => {
      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText('ขอลาใหม่')).toBeInTheDocument();
      });

      await user.click(screen.getByText('ขอลาใหม่'));

      // Fill form
      const leaveTypeSelect = screen.getByLabelText(/ประเภทการลา/i);
      await user.selectOptions(leaveTypeSelect, 'leave-type-1');

      const startDateInput = screen.getByLabelText(/วันที่เริ่ม/i);
      await user.type(startDateInput, '2024-07-20');

      const endDateInput = screen.getByLabelText(/วันที่สิ้นสุด/i);
      await user.type(endDateInput, '2024-07-22');

      // Submit
      const submitButton = screen.getByText('ส่งคำขอ');
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
    });
  });

  // ========================================================================
  // SUCCESS MESSAGE TESTS
  // ========================================================================

  describe('Success Messages', () => {
    it('should show success message after successful submission', async () => {
      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText('ขอลาใหม่')).toBeInTheDocument();
      });

      await user.click(screen.getByText('ขอลาใหม่'));

      // Fill and submit form
      const leaveTypeSelect = screen.getByLabelText(/ประเภทการลา/i);
      await user.selectOptions(leaveTypeSelect, 'leave-type-1');

      const startDateInput = screen.getByLabelText(/วันที่เริ่ม/i);
      await user.type(startDateInput, '2024-07-20');

      const endDateInput = screen.getByLabelText(/วันที่สิ้นสุด/i);
      await user.type(endDateInput, '2024-07-22');

      const submitButton = screen.getByText('ส่งคำขอ');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/ส่งคำขอลาสำเร็จ/i)).toBeInTheDocument();
      });
    });

    it('should clear form after successful submission', async () => {
      render(<LiffLeavePage />);

      await waitFor(() => {
        expect(screen.getByText('ขอลาใหม่')).toBeInTheDocument();
      });

      await user.click(screen.getByText('ขอลาใหม่'));

      // Fill form
      const leaveTypeSelect = screen.getByLabelText(/ประเภทการลา/i) as HTMLSelectElement;
      await user.selectOptions(leaveTypeSelect, 'leave-type-1');

      const startDateInput = screen.getByLabelText(/วันที่เริ่ม/i) as HTMLInputElement;
      await user.type(startDateInput, '2024-07-20');

      const endDateInput = screen.getByLabelText(/วันที่สิ้นสุด/i) as HTMLInputElement;
      await user.type(endDateInput, '2024-07-22');

      const submitButton = screen.getByText('ส่งคำขอ');
      await user.click(submitButton);

      // Open form again and check if cleared
      await waitFor(() => {
        expect(screen.getByText('ขอลาใหม่')).toBeInTheDocument();
      }, { timeout: 3000 });

      await user.click(screen.getByText('ขอลาใหม่'));

      const newLeaveTypeSelect = screen.getByLabelText(/ประเภทการลา/i) as HTMLSelectElement;
      expect(newLeaveTypeSelect.value).toBe('');
    });
  });
});

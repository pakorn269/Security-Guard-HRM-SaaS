import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import LeaveTypesPage from './LeaveTypesPage';
import leaveService from '../../services/leave.service';
import companyService from '../../services/company.service';
import {
  mockLeaveTypes,
  mockLeaveTypePayload,
  mockErrors,
  createMockLeaveType,
} from '../../test/setup/leave-mocks';

// Mock dependencies
vi.mock('../../services/leave.service', () => ({
  default: {
    listLeaveTypes: vi.fn(),
    createLeaveType: vi.fn(),
    updateLeaveType: vi.fn(),
    deleteLeaveType: vi.fn(),
  },
}));

vi.mock('../../services/company.service', () => ({
  default: {
    getSettings: vi.fn(),
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

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  CheckCircle: () => <div data-testid="icon-check-circle">CheckCircle</div>,
  AlertTriangle: () => <div data-testid="icon-alert-triangle">AlertTriangle</div>,
  ClipboardList: () => <div data-testid="icon-clipboard-list">ClipboardList</div>,
  Calendar: () => <div data-testid="icon-calendar">Calendar</div>,
  Hand: () => <div data-testid="icon-hand">Hand</div>,
  Paperclip: () => <div data-testid="icon-paperclip">Paperclip</div>,
  Pencil: () => <div data-testid="icon-pencil">Pencil</div>,
  Trash2: () => <div data-testid="icon-trash">Trash2</div>,
  Plus: () => <div data-testid="icon-plus">Plus</div>,
  X: () => <div data-testid="icon-x">X</div>,
  Banknote: () => <div data-testid="icon-banknote">Banknote</div>,
  XCircle: () => <div data-testid="icon-x-circle">XCircle</div>,
  Loader2: () => <div data-testid="icon-loader" className="animate-spin">Loader2</div>,
}));

describe('LeaveTypesPage', () => {
  const user = userEvent.setup();
  const mockCompanySettings = {
    leaveYearStart: '01-01',
    leaveYearEnd: '12-31',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful responses
    (leaveService.listLeaveTypes as any).mockResolvedValue(mockLeaveTypes);
    (companyService.getSettings as any).mockResolvedValue(mockCompanySettings);
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
    it('should render page header', async () => {
      render(<LeaveTypesPage />);

      await waitFor(() => {
        expect(screen.getByText(/จัดการประเภทการลา/i)).toBeInTheDocument();
      });
    });

    it('should show loading spinner initially', () => {
      render(<LeaveTypesPage />);

      expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
    });

    it('should hide loading spinner after data is loaded', async () => {
      render(<LeaveTypesPage />);

      await waitFor(() => {
        expect(screen.queryByTestId('icon-loader')).not.toBeInTheDocument();
      });
    });

    it('should display leave types list after loading', async () => {
      render(<LeaveTypesPage />);

      await waitFor(() => {
        expect(screen.getByText('Annual Leave')).toBeInTheDocument();
        expect(screen.getByText(/ลาพักผ่อน/)).toBeInTheDocument();
      });
    });

    it('should display create button', async () => {
      render(<LeaveTypesPage />);

      await waitFor(() => {
        expect(screen.getByText(/เพิ่มประเภทการลา/i)).toBeInTheDocument();
      });
    });

    it('should show error message when data loading fails', async () => {
      (leaveService.listLeaveTypes as any).mockRejectedValue(mockErrors.networkError);

      render(<LeaveTypesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Network request failed/i)).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // LIST VIEW TESTS
  // ========================================================================

  describe('Leave Types List', () => {
    it('should render all active leave types', async () => {
      render(<LeaveTypesPage />);

      await waitFor(() => {
        const activeTypes = mockLeaveTypes.filter(t => t.isActive);
        activeTypes.forEach(type => {
          expect(screen.getByText(type.name)).toBeInTheDocument();
        });
      });
    });

    it('should display leave type details', async () => {
      render(<LeaveTypesPage />);

      await waitFor(() => {
        expect(screen.getByText('Annual Leave')).toBeInTheDocument();
        expect(screen.getByText(/Paid annual vacation leave/i)).toBeInTheDocument();
      });
    });

    it('should show paid badge for paid leave types', async () => {
      render(<LeaveTypesPage />);

      await waitFor(() => {
        const paidBadges = screen.getAllByTestId('icon-banknote');
        expect(paidBadges.length).toBeGreaterThan(0);
      });
    });

    it('should show approval required indicator', async () => {
      render(<LeaveTypesPage />);

      await waitFor(() => {
        const approvalIcons = screen.getAllByTestId('icon-hand');
        expect(approvalIcons.length).toBeGreaterThan(0);
      });
    });

    it('should show document required indicator', async () => {
      render(<LeaveTypesPage />);

      await waitFor(() => {
        const documentIcons = screen.getAllByTestId('icon-paperclip');
        expect(documentIcons.length).toBeGreaterThan(0);
      });
    });

    it('should display max days per year if set', async () => {
      render(<LeaveTypesPage />);

      await waitFor(() => {
        expect(screen.getByText(/10 วัน\/ปี/i)).toBeInTheDocument();
        expect(screen.getByText(/15 วัน\/ปี/i)).toBeInTheDocument();
      });
    });

    it('should show edit button for each leave type', async () => {
      render(<LeaveTypesPage />);

      await waitFor(() => {
        const editButtons = screen.getAllByTestId('icon-pencil');
        expect(editButtons.length).toBeGreaterThan(0);
      });
    });

    it('should show delete button for each leave type', async () => {
      render(<LeaveTypesPage />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId('icon-trash');
        expect(deleteButtons.length).toBeGreaterThan(0);
      });
    });
  });

  // ========================================================================
  // FILTER TESTS
  // ========================================================================

  describe('Filters', () => {
    it('should filter by active/inactive status', async () => {
      render(<LeaveTypesPage />);

      await waitFor(() => {
        expect(screen.getByText('Annual Leave')).toBeInTheDocument();
      });

      // Find and click "Show inactive" toggle
      const showInactiveToggle = screen.getByRole('checkbox', { name: /แสดงที่ไม่ใช้งาน/i });
      await user.click(showInactiveToggle);

      await waitFor(() => {
        expect(leaveService.listLeaveTypes).toHaveBeenCalledWith(true);
      });
    });

    it('should display only active leave types by default', async () => {
      render(<LeaveTypesPage />);

      await waitFor(() => {
        expect(leaveService.listLeaveTypes).toHaveBeenCalledWith(false);
      });
    });

    it('should show inactive leave types when filter is enabled', async () => {
      (leaveService.listLeaveTypes as any).mockResolvedValue(mockLeaveTypes);

      render(<LeaveTypesPage />);

      await waitFor(() => {
        expect(screen.getByText('Annual Leave')).toBeInTheDocument();
      });

      const showInactiveToggle = screen.getByRole('checkbox', { name: /แสดงที่ไม่ใช้งาน/i });
      await user.click(showInactiveToggle);

      await waitFor(() => {
        expect(screen.getByText('Inactive Leave Type')).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // CREATE MODAL TESTS
  // ========================================================================

  describe('Create Leave Type Modal', () => {
    it('should open create modal when create button is clicked', async () => {
      render(<LeaveTypesPage />);

      await waitFor(() => {
        expect(screen.getByText(/เพิ่มประเภทการลา/i)).toBeInTheDocument();
      });

      const createButton = screen.getByText(/เพิ่มประเภทการลา/i);
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/สร้างประเภทการลาใหม่/i)).toBeInTheDocument();
      });
    });

    it('should show all form fields in create modal', async () => {
      render(<LeaveTypesPage />);

      await waitFor(() => {
        const createButton = screen.getByText(/เพิ่มประเภทการลา/i);
        user.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/ชื่อ \(ภาษาอังกฤษ\)/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/ชื่อ \(ภาษาไทย\)/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/คำอธิบาย/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/ได้รับเงินเดือน/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/จำนวนวันสูงสุดต่อปี/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/ต้องขออนุมัติ/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/ต้องแนบเอกสาร/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/เปิดใช้งาน/i)).toBeInTheDocument();
      });
    });

    it('should close modal when close button is clicked', async () => {
      render(<LeaveTypesPage />);

      const createButton = await screen.findByText(/เพิ่มประเภทการลา/i);
      await user.click(createButton);

      const closeButton = await screen.findByTestId('icon-x');
      await user.click(closeButton.closest('button')!);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should validate required name field', async () => {
      render(<LeaveTypesPage />);

      const createButton = await screen.findByText(/เพิ่มประเภทการลา/i);
      await user.click(createButton);

      const saveButton = await screen.findByText(/บันทึก/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/กรุณาระบุชื่อประเภทการลา/i)).toBeInTheDocument();
      });

      expect(leaveService.createLeaveType).not.toHaveBeenCalled();
    });

    it('should create new leave type with valid data', async () => {
      (leaveService.createLeaveType as any).mockResolvedValue(mockLeaveTypePayload.create);

      render(<LeaveTypesPage />);

      const createButton = await screen.findByText(/เพิ่มประเภทการลา/i);
      await user.click(createButton);

      // Fill form
      const nameInput = await screen.findByLabelText(/ชื่อ \(ภาษาอังกฤษ\)/i);
      const nameThInput = await screen.findByLabelText(/ชื่อ \(ภาษาไทย\)/i);
      const descInput = await screen.findByLabelText(/คำอธิบาย/i);
      const maxDaysInput = await screen.findByLabelText(/จำนวนวันสูงสุดต่อปี/i);

      await user.clear(nameInput);
      await user.type(nameInput, 'Emergency Leave');
      await user.clear(nameThInput);
      await user.type(nameThInput, 'ลาฉุกเฉิน');
      await user.clear(descInput);
      await user.type(descInput, 'Urgent personal emergency');
      await user.clear(maxDaysInput);
      await user.type(maxDaysInput, '3');

      const saveButton = await screen.findByText(/บันทึก/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(leaveService.createLeaveType).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Emergency Leave',
            nameTh: 'ลาฉุกเฉิน',
            description: 'Urgent personal emergency',
            maxDaysPerYear: 3,
          })
        );
      });
    });

    it('should reload list after successful creation', async () => {
      (leaveService.createLeaveType as any).mockResolvedValue({});

      render(<LeaveTypesPage />);

      const initialCallCount = (leaveService.listLeaveTypes as any).mock.calls.length;

      const createButton = await screen.findByText(/เพิ่มประเภทการลา/i);
      await user.click(createButton);

      const nameInput = await screen.findByLabelText(/ชื่อ \(ภาษาอังกฤษ\)/i);
      await user.type(nameInput, 'New Type');

      const saveButton = await screen.findByText(/บันทึก/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect((leaveService.listLeaveTypes as any).mock.calls.length).toBeGreaterThan(
          initialCallCount
        );
      });
    });

    it('should show error message if creation fails', async () => {
      (leaveService.createLeaveType as any).mockRejectedValue(mockErrors.validation);

      render(<LeaveTypesPage />);

      const createButton = await screen.findByText(/เพิ่มประเภทการลา/i);
      await user.click(createButton);

      const nameInput = await screen.findByLabelText(/ชื่อ \(ภาษาอังกฤษ\)/i);
      await user.type(nameInput, 'New Type');

      const saveButton = await screen.findByText(/บันทึก/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Validation failed/i)).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // EDIT MODAL TESTS
  // ========================================================================

  describe('Edit Leave Type Modal', () => {
    it('should open edit modal with pre-filled data', async () => {
      render(<LeaveTypesPage />);

      await waitFor(() => {
        expect(screen.getByText('Annual Leave')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTestId('icon-pencil');
      await user.click(editButtons[0].closest('button')!);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/ชื่อ \(ภาษาอังกฤษ\)/i) as HTMLInputElement;
        expect(nameInput.value).toBe('Annual Leave');
      });
    });

    it('should update leave type with modified data', async () => {
      (leaveService.updateLeaveType as any).mockResolvedValue({});

      render(<LeaveTypesPage />);

      await waitFor(() => {
        expect(screen.getByText('Annual Leave')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTestId('icon-pencil');
      await user.click(editButtons[0].closest('button')!);

      await waitFor(() => {
        expect(screen.getByLabelText(/ชื่อ \(ภาษาอังกฤษ\)/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/ชื่อ \(ภาษาอังกฤษ\)/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Annual Leave (Updated)');

      const saveButton = screen.getByText(/บันทึก/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(leaveService.updateLeaveType).toHaveBeenCalledWith(
          mockLeaveTypes[0].id,
          expect.objectContaining({
            name: 'Annual Leave (Updated)',
          })
        );
      });
    });

    it('should show success notification after successful update', async () => {
      (leaveService.updateLeaveType as any).mockResolvedValue({});

      render(<LeaveTypesPage />);

      await waitFor(() => {
        expect(screen.getByText('Annual Leave')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTestId('icon-pencil');
      await user.click(editButtons[0].closest('button')!);

      const saveButton = await screen.findByText(/บันทึก/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/อัปเดตสำเร็จ/i)).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // DELETE TESTS
  // ========================================================================

  describe('Delete Leave Type', () => {
    it('should show confirmation dialog before deleting', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm');

      render(<LeaveTypesPage />);

      await waitFor(() => {
        expect(screen.getByText('Annual Leave')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTestId('icon-trash');
      await user.click(deleteButtons[0].closest('button')!);

      expect(confirmSpy).toHaveBeenCalled();
    });

    it('should delete leave type when confirmed', async () => {
      (leaveService.deleteLeaveType as any).mockResolvedValue({});
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<LeaveTypesPage />);

      await waitFor(() => {
        expect(screen.getByText('Annual Leave')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTestId('icon-trash');
      await user.click(deleteButtons[0].closest('button')!);

      await waitFor(() => {
        expect(leaveService.deleteLeaveType).toHaveBeenCalledWith(mockLeaveTypes[0].id);
      });
    });

    it('should not delete if user cancels confirmation', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<LeaveTypesPage />);

      await waitFor(() => {
        expect(screen.getByText('Annual Leave')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTestId('icon-trash');
      await user.click(deleteButtons[0].closest('button')!);

      expect(leaveService.deleteLeaveType).not.toHaveBeenCalled();
    });

    it('should reload list after successful deletion', async () => {
      (leaveService.deleteLeaveType as any).mockResolvedValue({});
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<LeaveTypesPage />);

      const initialCallCount = (leaveService.listLeaveTypes as any).mock.calls.length;

      await waitFor(() => {
        expect(screen.getByText('Annual Leave')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTestId('icon-trash');
      await user.click(deleteButtons[0].closest('button')!);

      await waitFor(() => {
        expect((leaveService.listLeaveTypes as any).mock.calls.length).toBeGreaterThan(
          initialCallCount
        );
      });
    });

    it('should show error message if deletion fails', async () => {
      (leaveService.deleteLeaveType as any).mockRejectedValue(mockErrors.networkError);
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<LeaveTypesPage />);

      await waitFor(() => {
        expect(screen.getByText('Annual Leave')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTestId('icon-trash');
      await user.click(deleteButtons[0].closest('button')!);

      await waitFor(() => {
        expect(screen.getByText(/Network request failed/i)).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // TOGGLE TESTS
  // ========================================================================

  describe('Active/Inactive Toggle', () => {
    it('should toggle leave type active status', async () => {
      const leaveTypeWithToggle = createMockLeaveType({ isActive: true });
      (leaveService.updateLeaveType as any).mockResolvedValue({
        ...leaveTypeWithToggle,
        isActive: false,
      });

      render(<LeaveTypesPage />);

      await waitFor(() => {
        expect(screen.getByText('Annual Leave')).toBeInTheDocument();
      });

      // Find toggle switch
      const toggles = screen.getAllByRole('switch');
      await user.click(toggles[0]);

      await waitFor(() => {
        expect(leaveService.updateLeaveType).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ isActive: false })
        );
      });
    });
  });

  // ========================================================================
  // SORT ORDER TESTS
  // ========================================================================

  describe('Sort Order', () => {
    it('should display leave types in sort order', async () => {
      const sortedTypes = [...mockLeaveTypes].sort((a, b) => a.sortOrder - b.sortOrder);

      render(<LeaveTypesPage />);

      await waitFor(() => {
        const typeNames = screen.getAllByRole('heading', { level: 3 });
        expect(typeNames[0]).toHaveTextContent(sortedTypes[0].name);
      });
    });
  });
});

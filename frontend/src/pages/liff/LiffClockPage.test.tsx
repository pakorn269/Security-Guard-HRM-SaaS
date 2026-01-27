import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'; // Fix matcher types
import LiffClockPage from './LiffClockPage';
import { attendanceService } from '../../services/attendance.service';
import sitesService from '../../services/sites.service';
import useGeolocation from '../../hooks/useGeolocation';

// Mock dependencies
vi.mock('../../services/attendance.service', () => {
    const mockMethods = {
        clockIn: vi.fn(),
        clockOut: vi.fn(),
        getTodayAttendance: vi.fn(),
    };
    return {
        ...mockMethods,
        attendanceService: mockMethods
    };
});

vi.mock('../../services/sites.service', () => ({
    default: {
        list: vi.fn()
    }
}));

// Mock QrScanner
vi.mock('qr-scanner', () => {
    return {
        default: class MockQrScanner {
            constructor() { }
            start() { return Promise.resolve(); }
            stop() { }
            destroy() { }
        }
    };
});

// Mock the useGeolocation hook
vi.mock('../../hooks/useGeolocation', () => ({
    default: vi.fn()
}));

// Mock UI components
// NOTE: LiffClockPage imports GpsErrorModal from specific path
vi.mock('../../components/common/GpsErrorModal', () => ({
    default: ({ isOpen, error }: any) => isOpen ? <div data-testid="gps-error-modal">{error ? error.message : 'GPS Error'}</div> : null
}));

// NOTE: LiffClockPage imports TimeDebugger from barrel file
vi.mock('../../components/common', () => ({
    TimeDebugger: () => <div data-testid="time-debugger">Time Debugger</div>
}));

describe('LiffClockPage', () => {
    const mockGetLocation = vi.fn();
    const mockClearError = vi.fn();

    const mockSite = {
        id: 'site-123',
        name: 'Test Site',
        address: '123 Test St',
        latitude: 13.0,
        longitude: 100.0,
        radius: 100
    };

    const mockTodayData = {
        hasShiftToday: true,
        shift: {
            id: 'shift-1',
            startTime: '08:00',
            endTime: '17:00',
            location: 'HQ'
        },
        attendance: null,
        canClockIn: true,
        canClockOut: false,
        currentStatus: 'not_clocked_in',
        serverTime: new Date().toISOString(),
        companyTimezone: 'Asia/Bangkok'
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mocks
        (sitesService.list as any).mockResolvedValue({
            data: [mockSite]
        });

        (attendanceService.getTodayAttendance as any).mockResolvedValue(mockTodayData);

        // Setup Geolocation Hook Mock
        (useGeolocation as any).mockReturnValue({
            location: null,
            error: null,
            isLoading: false,
            getLocation: mockGetLocation,
            clearError: mockClearError
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('Render: Verify that Clock In and QR buttons are displayed', async () => {
        render(<LiffClockPage />);

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText('กำลังโหลด...')).not.toBeInTheDocument();
        });

        // Check if Site Selector is populated and auto-selected
        const select = await screen.findByRole('combobox');
        expect(select).toBeInTheDocument();
        expect(select).toHaveValue(mockSite.id);

        // Check for Buttons using role and regex
        expect(screen.getByRole('button', { name: /ลงเวลาเข้า \(GPS\)/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /สแกน QR Code/i })).toBeInTheDocument();
    });

    it('GPS Clock In (Success): Calls geolocation and clockIn service', async () => {
        // Setup successful geolocation
        const mockGeoData = {
            latitude: 13.7563,
            longitude: 100.5018,
            accuracy: 10
        };
        mockGetLocation.mockResolvedValue(mockGeoData);
        (attendanceService.clockIn as any).mockResolvedValue({ success: true });

        render(<LiffClockPage />);
        await waitFor(() => expect(screen.queryByText('กำลังโหลด...')).not.toBeInTheDocument());

        // Click Clock In
        const clockInBtn = screen.getByRole('button', { name: /ลงเวลาเข้า \(GPS\)/i });
        fireEvent.click(clockInBtn);

        // Verify Geolocation was called
        expect(mockGetLocation).toHaveBeenCalled();

        // Verify API call
        await waitFor(() => {
            expect(attendanceService.clockIn).toHaveBeenCalledWith({
                latitude: mockGeoData.latitude,
                longitude: mockGeoData.longitude,
                accuracy: mockGeoData.accuracy,
                siteId: mockSite.id,
                shiftId: mockTodayData.shift.id
            });
        });

        // Verify Success Message
        await waitFor(() => {
            expect(screen.getByText(/ลงเวลาเข้างานสำเร็จ!/i)).toBeInTheDocument();
        });
    });

    it('GPS Clock In (Error): Displays error message on failure', async () => {
        // Setup geolocation failure
        const mockError = { code: 'TIMEOUT', message: 'Location timeout' };
        mockGetLocation.mockRejectedValue(mockError);

        render(<LiffClockPage />);
        await waitFor(() => expect(screen.queryByText('กำลังโหลด...')).not.toBeInTheDocument());

        // Click Clock In
        const clockInBtn = screen.getByRole('button', { name: /ลงเวลาเข้า \(GPS\)/i });
        fireEvent.click(clockInBtn);

        // Verify Geolocation called
        expect(mockGetLocation).toHaveBeenCalled();

        // Verify Error Display
        await waitFor(() => {
            expect(screen.getByTestId('gps-error-modal')).toBeInTheDocument();
        });
    });

    it('API Error: Displays generic error message if API fails', async () => {
        // Successful Geo, but API Fail
        const mockGeoData = {
            latitude: 13.7563,
            longitude: 100.5018,
            accuracy: 10
        };
        mockGetLocation.mockResolvedValue(mockGeoData);

        const apiErrorMsg = 'Server Error: You are too far';
        (attendanceService.clockIn as any).mockRejectedValue(new Error(apiErrorMsg));

        render(<LiffClockPage />);
        await waitFor(() => expect(screen.queryByText('กำลังโหลด...')).not.toBeInTheDocument());

        const clockInBtn = screen.getByRole('button', { name: /ลงเวลาเข้า \(GPS\)/i });
        fireEvent.click(clockInBtn);

        await waitFor(() => {
            expect(screen.getByText(apiErrorMsg)).toBeInTheDocument();
        });
    });
});

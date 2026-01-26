import { useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface GeolocationData {
    latitude: number;
    longitude: number;
    accuracy: number;
}

export type GeolocationErrorCode =
    | 'PERMISSION_DENIED'
    | 'POSITION_UNAVAILABLE'
    | 'TIMEOUT'
    | 'NOT_SUPPORTED'
    | 'UNKNOWN';

export interface GeolocationError {
    code: GeolocationErrorCode;
    message: string;
    messageTh: string;
}

export interface UseGeolocationResult {
    location: GeolocationData | null;
    error: GeolocationError | null;
    isLoading: boolean;
    getLocation: () => Promise<GeolocationData>;
    checkLocationPermission: () => Promise<GeolocationData>;
    clearError: () => void;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Geolocation options with Fail-Fast strategy:
 * - enableHighAccuracy: true - Request GPS (not just network location)
 * - timeout: 5000ms - Abort after 5 seconds if no response
 * - maximumAge: 0 - Always get fresh position, no caching
 */
const GEOLOCATION_OPTIONS: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 5000, // 5 seconds - Fail fast!
    maximumAge: 0,
};

// ============================================================================
// Error Messages
// ============================================================================

const ERROR_MESSAGES: Record<GeolocationErrorCode, { en: string; th: string }> = {
    PERMISSION_DENIED: {
        en: 'Location permission denied. Please allow location access.',
        th: 'คุณปฏิเสธการเข้าถึงตำแหน่ง กรุณาอนุญาตการเข้าถึงตำแหน่งในการตั้งค่า',
    },
    POSITION_UNAVAILABLE: {
        en: 'Location not found. Please turn on GPS or check your internet connection.',
        th: 'ไม่พบตำแหน่ง GPS กรุณาเปิด GPS หรือตรวจสอบสัญญาณอินเทอร์เน็ต',
    },
    TIMEOUT: {
        en: 'Location request timed out. Please check GPS signal and try again.',
        th: 'หมดเวลาการค้นหาตำแหน่ง กรุณาตรวจสอบสัญญาณ GPS และลองใหม่',
    },
    NOT_SUPPORTED: {
        en: 'Geolocation is not supported by your browser.',
        th: 'เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง',
    },
    UNKNOWN: {
        en: 'An unknown error occurred while getting location.',
        th: 'เกิดข้อผิดพลาดในการระบุตำแหน่ง กรุณาลองใหม่',
    },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Maps browser GeolocationPositionError code to our error code
 */
function mapGeolocationErrorCode(code: number): GeolocationErrorCode {
    switch (code) {
        case 1: // GeolocationPositionError.PERMISSION_DENIED
            return 'PERMISSION_DENIED';
        case 2: // GeolocationPositionError.POSITION_UNAVAILABLE
            return 'POSITION_UNAVAILABLE';
        case 3: // GeolocationPositionError.TIMEOUT
            return 'TIMEOUT';
        default:
            return 'UNKNOWN';
    }
}

/**
 * Creates a GeolocationError object from error code
 */
function createGeolocationError(code: GeolocationErrorCode): GeolocationError {
    const messages = ERROR_MESSAGES[code];
    return {
        code,
        message: messages.en,
        messageTh: messages.th,
    };
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useGeolocation - A React hook for getting device location with Fail-Fast strategy
 *
 * Features:
 * - 5-second timeout to prevent indefinite waiting
 * - Explicit error handling for all geolocation error types
 * - Thai language error messages
 * - Reusable checkLocationPermission function
 *
 * @example
 * ```tsx
 * const { getLocation, error, isLoading } = useGeolocation();
 *
 * const handleClockIn = async () => {
 *   try {
 *     const location = await getLocation();
 *     // Use location...
 *   } catch (err) {
 *     // Error is already set in state, show modal
 *   }
 * };
 * ```
 */
export function useGeolocation(): UseGeolocationResult {
    const [location, setLocation] = useState<GeolocationData | null>(null);
    const [error, setError] = useState<GeolocationError | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Clear any existing error
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Get current location with Fail-Fast strategy
     * @returns Promise<GeolocationData> - Resolves with location or rejects with error
     */
    const getLocation = useCallback((): Promise<GeolocationData> => {
        return new Promise((resolve, reject) => {
            // Clear previous state
            setError(null);
            setIsLoading(true);

            // Check if geolocation is supported
            if (!('geolocation' in navigator)) {
                const geoError = createGeolocationError('NOT_SUPPORTED');
                setError(geoError);
                setIsLoading(false);
                reject(geoError);
                return;
            }

            // Request location with strict timeout
            navigator.geolocation.getCurrentPosition(
                // Success callback
                (position) => {
                    const locationData: GeolocationData = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                    };
                    setLocation(locationData);
                    setError(null);
                    setIsLoading(false);
                    resolve(locationData);
                },
                // Error callback - Handle specific error codes
                (positionError) => {
                    const errorCode = mapGeolocationErrorCode(positionError.code);
                    const geoError = createGeolocationError(errorCode);

                    // Log for debugging (can be removed in production)
                    console.warn('[Geolocation] Error:', {
                        code: positionError.code,
                        mappedCode: errorCode,
                        message: positionError.message,
                    });

                    setError(geoError);
                    setLocation(null);
                    setIsLoading(false);
                    reject(geoError);
                },
                // Options with Fail-Fast configuration
                GEOLOCATION_OPTIONS
            );
        });
    }, []);

    /**
     * Check location permission and get location
     * This is a convenience wrapper that can be called before clock-in/out
     * to ensure we have location access
     *
     * @returns Promise<GeolocationData>
     */
    const checkLocationPermission = useCallback(async (): Promise<GeolocationData> => {
        return getLocation();
    }, [getLocation]);

    return {
        location,
        error,
        isLoading,
        getLocation,
        checkLocationPermission,
        clearError,
    };
}

export default useGeolocation;

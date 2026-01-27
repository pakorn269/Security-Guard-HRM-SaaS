import { useState, useEffect, useCallback } from 'react';

interface TimeDebuggerProps {
    serverTime: string; // ISO format from API
    companyTimezone: string; // IANA timezone
}

export function TimeDebugger({ serverTime, companyTimezone }: TimeDebuggerProps) {
    // Calculate the offset between server and device at mount time
    const [initialOffset, setInitialOffset] = useState<number>(0);
    const [currentServerTime, setCurrentServerTime] = useState<Date>(new Date(serverTime));
    const [currentDeviceTime, setCurrentDeviceTime] = useState<Date>(new Date());

    // Calculate and format time difference
    const formatOffset = useCallback((offsetMs: number): string => {
        const absOffset = Math.abs(offsetMs);
        const seconds = Math.floor(absOffset / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        const sign = offsetMs >= 0 ? '+' : '-';

        if (hours > 0) {
            const remainingMinutes = minutes % 60;
            return `${sign}${hours}h ${remainingMinutes}m`;
        } else if (minutes > 0) {
            const remainingSeconds = seconds % 60;
            return `${sign}${minutes}m ${remainingSeconds}s`;
        } else {
            return `${sign}${seconds}s`;
        }
    }, []);

    // Format time as HH:mm:ss
    const formatTime = useCallback((date: Date): string => {
        return date.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });
    }, []);

    // Format time in specific timezone
    const formatTimeInTimezone = useCallback((date: Date, timezone: string): string => {
        try {
            return date.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: timezone,
            });
        } catch {
            // Fallback if timezone is invalid
            return formatTime(date);
        }
    }, [formatTime]);

    // Initialize offset on mount
    useEffect(() => {
        const serverDate = new Date(serverTime);
        const deviceDate = new Date();
        const offset = deviceDate.getTime() - serverDate.getTime();
        setInitialOffset(offset);
        setCurrentServerTime(serverDate);
        setCurrentDeviceTime(deviceDate);
    }, [serverTime]);

    // Update times every second
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setCurrentDeviceTime(now);
            // Server time = device time - initial offset
            setCurrentServerTime(new Date(now.getTime() - initialOffset));
        }, 1000);

        return () => clearInterval(interval);
    }, [initialOffset]);

    // Calculate current offset (should stay constant if clocks are synced)
    const currentOffset = currentDeviceTime.getTime() - currentServerTime.getTime();

    // Determine if offset is significant (more than 30 seconds)
    const isSignificant = Math.abs(currentOffset) > 30000;

    return (
        // Position above the bottom navigation (h-14 = 56px) with z-index below nav (z-40)
        <div className="fixed bottom-14 left-0 right-0 bg-gray-900/95 text-white text-xs p-2 z-30 backdrop-blur-sm border-t border-gray-700">
            <div className="max-w-md mx-auto">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-400 font-medium text-[10px]">Time Debugger</span>
                    <span className="text-gray-500 text-[10px]">{companyTimezone}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                        <div className="text-gray-400 text-[10px] uppercase tracking-wider">Server</div>
                        <div className="font-mono text-green-400 text-sm">
                            {formatTimeInTimezone(currentServerTime, companyTimezone)}
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-400 text-[10px] uppercase tracking-wider">Device</div>
                        <div className="font-mono text-blue-400 text-sm">{formatTime(currentDeviceTime)}</div>
                    </div>
                    <div>
                        <div className="text-gray-400 text-[10px] uppercase tracking-wider">Offset</div>
                        <div
                            className={`font-mono text-sm ${
                                isSignificant ? 'text-red-400 font-bold' : 'text-yellow-400'
                            }`}
                        >
                            {formatOffset(currentOffset)}
                        </div>
                    </div>
                </div>
                {isSignificant && (
                    <div className="mt-1 text-center text-red-400 text-[10px]">
                        Warning: Device clock may be incorrect!
                    </div>
                )}
            </div>
        </div>
    );
}

export default TimeDebugger;

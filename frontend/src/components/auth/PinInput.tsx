import React from 'react';

interface PinInputProps {
    value: string;
    length?: number;
    error?: boolean;
    className?: string;
    showValues?: boolean; // If true, show numbers instead of dots (for confirm? usually not)
    mask?: boolean; // If true, always dots. If false, maybe show last digit temporarily?
}

export const PinInput: React.FC<PinInputProps> = ({
    value,
    length = 6,
    error = false,
    className = '',
}) => {
    // Array of length `length`
    const dots = Array.from({ length });

    return (
        <div className={`flex gap-3 justify-center ${className}`}>
            {dots.map((_, index) => {
                const filled = index < value.length;
                return (
                    <div
                        key={index}
                        className={`
                            w-4 h-4 rounded-full border transition-all duration-200
                            ${filled
                                ? error
                                    ? 'bg-red-500 border-red-500' // Filled + Error
                                    : 'bg-primary-600 border-primary-600' // Filled
                                : error
                                    ? 'bg-transparent border-red-300' // Empty + Error
                                    : 'bg-transparent border-gray-300' // Empty
                            }
                            ${error ? 'animate-shake' : ''}
                        `}
                    />
                );
            })}
        </div>
    );
};

export default PinInput;

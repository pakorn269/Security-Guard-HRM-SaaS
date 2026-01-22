import React from 'react';
import { Delete } from 'lucide-react';

interface NumericKeypadProps {
    onPress: (key: string) => void;
    onDelete: () => void;
    onSubmit?: () => void; // Optional "Enter" key if we want one
    disabled?: boolean;
    className?: string;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
    onPress,
    onDelete,
    disabled = false,
    className = '',
}) => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

    const handlePress = (key: string) => {
        if (disabled) return;

        if (key === 'del') {
            onDelete();
        } else if (key) {
            onPress(key);
        }
    };

    return (
        <div className={`grid grid-cols-3 gap-4 max-w-[280px] mx-auto ${className}`}>
            {keys.map((key, index) => {
                if (!key && index === 9) return <div key={index} />; // Empty slot bottom-left

                const isDelete = key === 'del';

                return (
                    <button
                        key={key}
                        onClick={() => handlePress(key)}
                        disabled={disabled}
                        type="button" // Prevent form submission
                        className={`
                            h-16 w-16 rounded-full flex items-center justify-center text-2xl font-medium transition-colors
                            ${isDelete
                                ? 'text-gray-500 hover:bg-gray-100 active:bg-gray-200'
                                : 'bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-900 border border-gray-100 shadow-sm'
                            }
                            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                        `}
                    >
                        {isDelete ? <Delete size={24} /> : key}
                    </button>
                );
            })}
        </div>
    );
};

export default NumericKeypad;

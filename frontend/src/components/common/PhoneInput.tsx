import React from 'react';
import Input from './Input';
import type { InputProps } from './Input';

interface PhoneInputProps extends Omit<InputProps, 'onChange'> {
    value: string;
    onChange: (value: string) => void;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
    value,
    onChange,
    ...props
}) => {
    const formatPhone = (val: string) => {
        // Remove non-digits
        const digits = val.replace(/\D/g, '');

        // Limit to 10 digits
        const limited = digits.slice(0, 10);

        // Format
        if (limited.length <= 3) return limited;
        if (limited.length <= 6) return `${limited.slice(0, 3)}-${limited.slice(3)}`;
        return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const formatted = formatPhone(val);
        onChange(formatted);
    };

    return (
        <Input
            {...props}
            type="tel"
            value={value}
            onChange={handleChange}
            placeholder="08X-XXX-XXXX"
            maxLength={12} // 10 digits + 2 dashes
        />
    );
};

export default PhoneInput;

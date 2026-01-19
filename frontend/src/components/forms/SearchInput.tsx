import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

type SearchInputSize = 'sm' | 'md' | 'lg';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  /** Current search value */
  value?: string;
  /** Change handler */
  onChange?: (value: string) => void;
  /** Debounce delay in ms (0 to disable) */
  debounceMs?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Size variant */
  size?: SearchInputSize;
  /** Show clear button */
  clearable?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Submit handler (for form behavior) */
  onSubmit?: (value: string) => void;
}

const sizeClasses: Record<SearchInputSize, { input: string; icon: number; padding: string }> = {
  sm: { input: 'h-8 text-sm', icon: 14, padding: 'pl-8 pr-8' },
  md: { input: 'h-10 text-sm', icon: 16, padding: 'pl-10 pr-10' },
  lg: { input: 'h-12 text-base', icon: 20, padding: 'pl-12 pr-12' },
};

export default function SearchInput({
  value: controlledValue,
  onChange,
  debounceMs = 300,
  placeholder = 'Search...',
  size = 'md',
  clearable = true,
  isLoading = false,
  fullWidth = true,
  autoFocus = false,
  className = '',
  onSubmit,
  ...props
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(controlledValue || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInternalValue(newValue);

      if (debounceMs > 0) {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
          onChange?.(newValue);
        }, debounceMs);
      } else {
        onChange?.(newValue);
      }
    },
    [onChange, debounceMs]
  );

  const handleClear = useCallback(() => {
    setInternalValue('');
    onChange?.('');
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSubmit) {
        e.preventDefault();
        // Cancel debounce and submit immediately
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        onSubmit(internalValue);
      }
      if (e.key === 'Escape' && clearable && internalValue) {
        handleClear();
      }
    },
    [onSubmit, internalValue, clearable, handleClear]
  );

  const sizeConfig = sizeClasses[size];
  const showClear = clearable && internalValue && !isLoading;

  return (
    <div className={`relative ${fullWidth ? 'w-full' : 'w-64'} ${className}`}>
      {/* Search icon */}
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search
          size={sizeConfig.icon}
          className="text-neutral-400 dark:text-neutral-500"
        />
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={internalValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`
          block w-full rounded-md
          bg-white dark:bg-neutral-900
          text-neutral-900 dark:text-neutral-100
          placeholder:text-neutral-400 dark:placeholder:text-neutral-500
          border border-neutral-300 dark:border-neutral-700
          transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
          ${sizeConfig.input}
          ${sizeConfig.padding}
        `}
        {...props}
      />

      {/* Right side: clear button or loading */}
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
        {isLoading ? (
          <Loader2
            size={sizeConfig.icon}
            className="animate-spin text-neutral-400 dark:text-neutral-500"
          />
        ) : showClear ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Clear search"
          >
            <X
              size={sizeConfig.icon}
              className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
            />
          </button>
        ) : null}
      </div>
    </div>
  );
}

// Keyboard shortcut hint component
interface SearchShortcutProps {
  shortcut?: string;
  className?: string;
}

export function SearchShortcut({ shortcut = '/', className = '' }: SearchShortcutProps) {
  return (
    <kbd
      className={`
        hidden sm:inline-flex items-center justify-center
        min-w-[20px] h-5 px-1.5
        text-[10px] font-mono font-medium
        bg-neutral-100 dark:bg-neutral-800
        text-neutral-500 dark:text-neutral-400
        border border-neutral-200 dark:border-neutral-700
        rounded
        ${className}
      `}
    >
      {shortcut}
    </kbd>
  );
}

export type { SearchInputProps, SearchInputSize };

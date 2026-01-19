import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MoreVertical, X } from 'lucide-react';

interface MobileHeaderProps {
  /** Page title */
  title?: string;
  /** Show back button */
  showBack?: boolean;
  /** Custom back action */
  onBack?: () => void;
  /** Show close button (for modals/LIFF) */
  showClose?: boolean;
  /** Custom close action */
  onClose?: () => void;
  /** Right action button */
  rightAction?: React.ReactNode;
  /** Show more options menu */
  showMore?: boolean;
  /** More options click handler */
  onMoreClick?: () => void;
  /** Transparent background */
  transparent?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export default function MobileHeader({
  title,
  showBack = false,
  onBack,
  showClose = false,
  onClose,
  rightAction,
  showMore = false,
  onMoreClick,
  transparent = false,
  className = '',
}: MobileHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      // Default: try to close LIFF window
      try {
        // @ts-expect-error LIFF types
        if (window.liff?.closeWindow) {
          // @ts-expect-error LIFF types
          window.liff.closeWindow();
        }
      } catch {
        navigate(-1);
      }
    }
  };

  return (
    <header
      className={`
        sticky top-0 z-40
        h-12 px-2
        flex items-center justify-between
        safe-area-top
        ${
          transparent
            ? 'bg-transparent'
            : 'bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800'
        }
        ${className}
      `}
    >
      {/* Left section */}
      <div className="flex items-center min-w-[48px]">
        {showBack && (
          <button
            onClick={handleBack}
            className="
              p-2 -ml-1 rounded-full
              text-neutral-600 dark:text-neutral-400
              hover:bg-neutral-100 dark:hover:bg-neutral-800
              active:bg-neutral-200 dark:active:bg-neutral-700
              transition-colors touch-target
            "
            aria-label="Go back"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        {showClose && (
          <button
            onClick={handleClose}
            className="
              p-2 -ml-1 rounded-full
              text-neutral-600 dark:text-neutral-400
              hover:bg-neutral-100 dark:hover:bg-neutral-800
              active:bg-neutral-200 dark:active:bg-neutral-700
              transition-colors touch-target
            "
            aria-label="Close"
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* Title */}
      {title && (
        <h1 className="flex-1 text-center text-base font-semibold text-neutral-900 dark:text-white truncate px-2">
          {title}
        </h1>
      )}

      {/* Right section */}
      <div className="flex items-center min-w-[48px] justify-end">
        {rightAction}
        {showMore && (
          <button
            onClick={onMoreClick}
            className="
              p-2 -mr-1 rounded-full
              text-neutral-600 dark:text-neutral-400
              hover:bg-neutral-100 dark:hover:bg-neutral-800
              active:bg-neutral-200 dark:active:bg-neutral-700
              transition-colors touch-target
            "
            aria-label="More options"
          >
            <MoreVertical size={20} />
          </button>
        )}
      </div>
    </header>
  );
}

export type { MobileHeaderProps };

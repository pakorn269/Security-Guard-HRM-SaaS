// Common UI Components
// These are the primary building blocks used across the application

export { default as Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { default as Input } from './Input';
export type { InputProps, InputSize } from './Input';

export { default as Select } from './Select';
export type { SelectProps, SelectOption, SelectSize } from './Select';

export { default as Badge } from './Badge';
export type { BadgeProps, BadgeVariant, BadgeSize } from './Badge';

export { default as Avatar, AvatarGroup } from './Avatar';
export type { AvatarProps, AvatarGroupProps, AvatarSize } from './Avatar';

export { default as Modal, ModalFooter } from './Modal';
export { default as Table, Pagination } from './Table';
export { default as Card, CardHeader, CardFooter } from './Card';
export { default as Toast, ToastContainer, useToast } from './Toast';
export { default as LoadingSpinner, PageLoader, Skeleton } from './LoadingSpinner';
export { default as LanguageSwitcher } from './LanguageSwitcher';
export { default as NotificationBell } from './NotificationBell';
export { ErrorBoundary } from './ErrorBoundary';

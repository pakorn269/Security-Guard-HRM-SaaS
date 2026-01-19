import React from 'react';
import { User } from 'lucide-react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
  /** Image source URL */
  src?: string | null;
  /** Alt text for image */
  alt?: string;
  /** Name for generating initials */
  name?: string;
  /** Size of the avatar */
  size?: AvatarSize;
  /** Show online/offline status indicator */
  status?: 'online' | 'offline' | 'away' | 'busy';
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-20 h-20 text-xl',
};

const iconSizes: Record<AvatarSize, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
};

const statusSizes: Record<AvatarSize, string> = {
  xs: 'w-1.5 h-1.5 border',
  sm: 'w-2 h-2 border',
  md: 'w-2.5 h-2.5 border-2',
  lg: 'w-3 h-3 border-2',
  xl: 'w-3.5 h-3.5 border-2',
  '2xl': 'w-4 h-4 border-2',
};

const statusColors: Record<NonNullable<AvatarProps['status']>, string> = {
  online: 'bg-success-500',
  offline: 'bg-neutral-400',
  away: 'bg-warning-500',
  busy: 'bg-error-500',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function Avatar({
  src,
  alt = '',
  name,
  size = 'md',
  status,
  className = '',
  onClick,
}: AvatarProps) {
  const initials = name ? getInitials(name) : null;
  const isClickable = !!onClick;

  const avatarContent = src ? (
    <img
      src={src}
      alt={alt || name || 'Avatar'}
      className="w-full h-full object-cover"
      onError={(e) => {
        // Hide broken image and show fallback
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  ) : initials ? (
    <span className="font-medium text-neutral-700 dark:text-neutral-200">{initials}</span>
  ) : (
    <User size={iconSizes[size]} className="text-neutral-400 dark:text-neutral-500" />
  );

  const Component = isClickable ? 'button' : 'div';

  return (
    <Component
      type={isClickable ? 'button' : undefined}
      onClick={onClick}
      className={`
        relative inline-flex items-center justify-center
        rounded-full overflow-hidden
        bg-neutral-100 dark:bg-neutral-800
        ${sizeClasses[size]}
        ${isClickable ? 'cursor-pointer hover:ring-2 hover:ring-primary-500 hover:ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2' : ''}
        ${className}
      `}
      aria-label={isClickable ? (name || 'User avatar') : undefined}
    >
      {avatarContent}
      {status && (
        <span
          className={`
            absolute bottom-0 right-0
            rounded-full border-white dark:border-neutral-900
            ${statusSizes[size]}
            ${statusColors[status]}
          `}
          aria-label={`Status: ${status}`}
        />
      )}
    </Component>
  );
}

// Group component for stacked avatars
interface AvatarGroupProps {
  children: React.ReactNode;
  /** Maximum avatars to show */
  max?: number;
  /** Size for all avatars in group */
  size?: AvatarSize;
  /** Additional CSS classes */
  className?: string;
}

export function AvatarGroup({ children, max, size = 'md', className = '' }: AvatarGroupProps) {
  const avatars = React.Children.toArray(children);
  const displayedAvatars = max ? avatars.slice(0, max) : avatars;
  const remaining = max ? avatars.length - max : 0;

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {displayedAvatars.map((avatar, index) =>
        React.isValidElement(avatar)
          ? React.cloneElement(avatar as React.ReactElement<AvatarProps>, {
            key: index,
            size,
            className: `ring-2 ring-white dark:ring-neutral-900 ${(avatar as React.ReactElement<AvatarProps>).props.className || ''}`,
          })
          : avatar
      )}
      {remaining > 0 && (
        <div
          className={`
            inline-flex items-center justify-center
            rounded-full
            bg-neutral-200 dark:bg-neutral-700
            ring-2 ring-white dark:ring-neutral-900
            font-medium text-neutral-600 dark:text-neutral-300
            ${sizeClasses[size]}
          `}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

export type { AvatarProps, AvatarGroupProps, AvatarSize };

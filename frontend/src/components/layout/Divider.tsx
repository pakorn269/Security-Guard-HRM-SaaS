

type DividerOrientation = 'horizontal' | 'vertical';
type DividerVariant = 'solid' | 'dashed' | 'dotted';
type DividerSpacing = 'none' | 'sm' | 'md' | 'lg';

interface DividerProps {
  /** Orientation of the divider */
  orientation?: DividerOrientation;
  /** Visual style variant */
  variant?: DividerVariant;
  /** Spacing around the divider */
  spacing?: DividerSpacing;
  /** Label to show in the center */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

const spacingClasses: Record<DividerOrientation, Record<DividerSpacing, string>> = {
  horizontal: {
    none: '',
    sm: 'my-2',
    md: 'my-4',
    lg: 'my-6',
  },
  vertical: {
    none: '',
    sm: 'mx-2',
    md: 'mx-4',
    lg: 'mx-6',
  },
};

const variantClasses: Record<DividerVariant, string> = {
  solid: 'border-solid',
  dashed: 'border-dashed',
  dotted: 'border-dotted',
};

export default function Divider({
  orientation = 'horizontal',
  variant = 'solid',
  spacing = 'md',
  label,
  className = '',
}: DividerProps) {
  const baseClasses = 'border-neutral-200 dark:border-neutral-800';
  const spacingClass = spacingClasses[orientation][spacing];
  const variantClass = variantClasses[variant];

  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={`
          self-stretch border-l
          ${baseClasses}
          ${variantClass}
          ${spacingClass}
          ${className}
        `}
      />
    );
  }

  // Horizontal divider
  if (label) {
    return (
      <div
        role="separator"
        className={`
          flex items-center
          ${spacingClass}
          ${className}
        `}
      >
        <div
          className={`
            flex-1 border-t
            ${baseClasses}
            ${variantClass}
          `}
        />
        <span className="px-3 text-sm text-neutral-500 dark:text-neutral-400">
          {label}
        </span>
        <div
          className={`
            flex-1 border-t
            ${baseClasses}
            ${variantClass}
          `}
        />
      </div>
    );
  }

  return (
    <hr
      role="separator"
      className={`
        border-t border-0
        ${baseClasses}
        ${variantClass}
        ${spacingClass}
        ${className}
      `}
    />
  );
}

export type { DividerProps, DividerOrientation, DividerVariant, DividerSpacing };

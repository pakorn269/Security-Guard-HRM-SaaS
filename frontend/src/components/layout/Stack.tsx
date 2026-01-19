import React from 'react';

type StackDirection = 'vertical' | 'horizontal';
type StackSpacing = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

interface StackProps {
  /** Stack content */
  children: React.ReactNode;
  /** Stack direction */
  direction?: StackDirection;
  /** Space between items */
  spacing?: StackSpacing;
  /** Align items on the cross axis */
  align?: StackAlign;
  /** Justify items on the main axis */
  justify?: StackJustify;
  /** Wrap items to next line */
  wrap?: boolean;
  /** Reverse the order of items */
  reverse?: boolean;
  /** Make stack full width */
  fullWidth?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** HTML element to render as */
  as?: 'div' | 'section' | 'article' | 'nav' | 'ul' | 'ol';
}

const spacingClasses: Record<StackSpacing, string> = {
  none: 'gap-0',
  xs: 'gap-1',      // 4px
  sm: 'gap-2',      // 8px
  md: 'gap-4',      // 16px
  lg: 'gap-6',      // 24px
  xl: 'gap-8',      // 32px
  '2xl': 'gap-12',  // 48px
};

const alignClasses: Record<StackAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const justifyClasses: Record<StackJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

export default function Stack({
  children,
  direction = 'vertical',
  spacing = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  reverse = false,
  fullWidth = false,
  className = '',
  as: Component = 'div',
}: StackProps) {
  const directionClass = direction === 'horizontal'
    ? reverse ? 'flex-row-reverse' : 'flex-row'
    : reverse ? 'flex-col-reverse' : 'flex-col';

  return (
    <Component
      className={`
        flex
        ${directionClass}
        ${spacingClasses[spacing]}
        ${alignClasses[align]}
        ${justifyClasses[justify]}
        ${wrap ? 'flex-wrap' : ''}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {children}
    </Component>
  );
}

// Convenience components
export function HStack(props: Omit<StackProps, 'direction'>) {
  return <Stack {...props} direction="horizontal" />;
}

export function VStack(props: Omit<StackProps, 'direction'>) {
  return <Stack {...props} direction="vertical" />;
}

export type { StackProps, StackDirection, StackSpacing, StackAlign, StackJustify };

import React from 'react';

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

interface ContainerProps {
  /** Container content */
  children: React.ReactNode;
  /** Maximum width of the container */
  size?: ContainerSize;
  /** Center the container horizontally */
  centered?: boolean;
  /** Add horizontal padding */
  padding?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** HTML element to render as */
  as?: 'div' | 'section' | 'article' | 'main';
}

const sizeClasses: Record<ContainerSize, string> = {
  sm: 'max-w-screen-sm',    // 640px
  md: 'max-w-screen-md',    // 768px
  lg: 'max-w-screen-lg',    // 1024px
  xl: 'max-w-screen-xl',    // 1280px
  '2xl': 'max-w-screen-2xl', // 1536px
  full: 'max-w-full',
};

export default function Container({
  children,
  size = 'xl',
  centered = true,
  padding = true,
  className = '',
  as: Component = 'div',
}: ContainerProps) {
  return (
    <Component
      className={`
        w-full
        ${sizeClasses[size]}
        ${centered ? 'mx-auto' : ''}
        ${padding ? 'px-4 sm:px-6 lg:px-8' : ''}
        ${className}
      `}
    >
      {children}
    </Component>
  );
}

export type { ContainerProps, ContainerSize };

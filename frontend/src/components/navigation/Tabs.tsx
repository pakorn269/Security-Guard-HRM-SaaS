import React, { createContext, useContext, useId } from 'react';

type TabsSize = 'sm' | 'md' | 'lg';
type TabsVariant = 'default' | 'pills' | 'underline';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  size: TabsSize;
  variant: TabsVariant;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

interface TabsProps {
  /** Currently active tab */
  activeTab: string;
  /** Tab change callback */
  onChange: (tab: string) => void;
  /** Tab children (TabList and TabPanels) */
  children: React.ReactNode;
  /** Size variant */
  size?: TabsSize;
  /** Visual variant */
  variant?: TabsVariant;
  /** Additional CSS classes */
  className?: string;
}

export default function Tabs({
  activeTab,
  onChange,
  children,
  size = 'md',
  variant = 'default',
  className = '',
}: TabsProps) {
  const baseId = useId();

  return (
    <TabsContext.Provider
      value={{
        activeTab,
        setActiveTab: onChange,
        size,
        variant,
        baseId,
      }}
    >
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// Tab List
interface TabListProps {
  /** Tab buttons */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Full width tabs */
  fullWidth?: boolean;
}

export function TabList({ children, className = '', fullWidth = false }: TabListProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabList must be used within Tabs');

  const { variant } = context;

  const variantClasses: Record<TabsVariant, string> = {
    default: 'border-b border-neutral-200 dark:border-neutral-800',
    pills: 'bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg',
    underline: '',
  };

  return (
    <div
      role="tablist"
      className={`
        flex gap-1
        ${variantClasses[variant]}
        ${fullWidth ? '' : 'w-fit'}
        ${className}
      `}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, { fullWidth } as Partial<TabProps>)
          : child
      )}
    </div>
  );
}

// Tab
interface TabProps {
  /** Tab value/id */
  value: string;
  /** Tab label */
  children: React.ReactNode;
  /** Icon to show */
  icon?: React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Internal: full width */
  fullWidth?: boolean;
}

export function Tab({
  value,
  children,
  icon,
  disabled = false,
  className = '',
  fullWidth = false,
}: TabProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tab must be used within Tabs');

  const { activeTab, setActiveTab, size, variant, baseId } = context;
  const isActive = activeTab === value;

  const sizeClasses: Record<TabsSize, string> = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
  };

  const variantActiveClasses: Record<TabsVariant, { active: string; inactive: string }> = {
    default: {
      active: 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400 -mb-px',
      inactive: 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border-b-2 border-transparent -mb-px',
    },
    pills: {
      active: 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm',
      inactive: 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white',
    },
    underline: {
      active: 'text-primary-600 dark:text-primary-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary-500',
      inactive: 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white',
    },
  };

  return (
    <button
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(value)}
      className={`
        relative inline-flex items-center justify-center font-medium
        rounded-md transition-all
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${isActive ? variantActiveClasses[variant].active : variantActiveClasses[variant].inactive}
        ${fullWidth ? 'flex-1' : ''}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

// Tab Panels container
interface TabPanelsProps {
  /** TabPanel children */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function TabPanels({ children, className = '' }: TabPanelsProps) {
  return <div className={className}>{children}</div>;
}

// Tab Panel
interface TabPanelProps {
  /** Tab value this panel corresponds to */
  value: string;
  /** Panel content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function TabPanel({ value, children, className = '' }: TabPanelProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabPanel must be used within Tabs');

  const { activeTab, baseId } = context;
  const isActive = activeTab === value;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={`focus-visible:outline-none ${className}`}
    >
      {children}
    </div>
  );
}

export type { TabsProps, TabListProps, TabProps, TabPanelsProps, TabPanelProps, TabsSize, TabsVariant };

# Frontend UI/UX Redesign Implementation Plan

## Executive Summary

This document outlines the comprehensive plan to redesign the Security Guard HRM SaaS frontend to reflect enterprise-grade UX/UI standards with a "Clean, Functional & Corporate" design philosophy.

**Key Objectives:**
- Minimalist, distraction-free interface
- Professional, trustworthy, and organized appearance
- Consistent design system across web and LINE LIFF
- Full dark/light mode support
- Improved accessibility and usability

---

## Part 1: Current State Analysis

### 1.1 Existing Design Patterns

#### Strengths
| Aspect | Current Implementation | Assessment |
|--------|----------------------|-------------|
| **Component Library** | 10 reusable components (Button, Input, Select, Card, Table, Modal, Toast, LoadingSpinner, Pagination) | Good foundation |
| **Dark Mode** | System preference detection + `.dark` class toggle | Infrastructure exists |
| **Thai Typography** | Kanit (headings) + IBM Plex Sans Thai Looped (body) | Excellent choice |
| **Color System** | OKLCH color space with 11 scales | Modern approach |
| **Mobile Support** | Safe area insets, touch targets, responsive classes | Good foundation |
| **Accessibility** | Focus-visible, aria attributes, semantic HTML | Basic coverage |

#### Identified Pain Points

| Issue | Description | Impact |
|-------|-------------|--------|
| **Inconsistent Icon Usage** | Mix of Lucide React, inline SVG, and emojis | Visual fragmentation |
| **Color Palette** | Current blue is too saturated; lacks corporate feel | Not enterprise-appropriate |
| **Component Styling** | Inconsistent patterns (some use Tailwind classes, others use CSS classes) | Maintenance difficulty |
| **Layout Density** | Overly padded; poor information density | Inefficient screen usage |
| **Visual Hierarchy** | Weak differentiation between primary/secondary actions | User confusion |
| **Card Design** | Too rounded (rounded-xl/2xl); not corporate enough | Casual appearance |
| **Status Badges** | Inconsistent styling across pages | Visual inconsistency |
| **Form Layout** | No standardized grid system for forms | Unpredictable layouts |
| **Navigation** | Emoji icons in sidebar; not professional | Unprofessional appearance |
| **Data Tables** | Basic styling; lacks enterprise features | Poor data presentation |

### 1.2 Current Color Palette Issues

```css
/* Current Primary (Too Saturated) */
--color-primary-500: oklch(0.53 0.14 250); /* Deep blue - too vivid */

/* Current Secondary (Teal - Unusual for Enterprise) */
--color-secondary-500: oklch(0.52 0.14 180); /* Teal - not corporate */
```

**Problems:**
1. High saturation values (0.14) create visual fatigue
2. Teal secondary doesn't align with corporate identity
3. Status colors lack consistency with primary palette

---

## Part 2: New Design System Specification

### 2.1 Design Principles

1. **Clarity Over Decoration** - Every element serves a purpose
2. **Consistent Visual Language** - Unified patterns across all pages
3. **Hierarchy Through Typography** - Size and weight, not just color
4. **Subtle Depth** - Minimal shadows, no heavy gradients
5. **Touch-Friendly** - 44px minimum touch targets
6. **Accessible by Default** - WCAG AA compliant

### 2.2 Color Palette

#### Corporate Blue Palette (Primary)

```css
/* Corporate Blue - Low saturation for professional feel */
--color-primary-25:  oklch(0.985 0.005 240);  /* Near white */
--color-primary-50:  oklch(0.97 0.01 240);    /* Lightest */
--color-primary-100: oklch(0.94 0.02 240);    /* Very light */
--color-primary-200: oklch(0.88 0.04 240);    /* Light */
--color-primary-300: oklch(0.78 0.06 240);    /* Light medium */
--color-primary-400: oklch(0.65 0.08 240);    /* Medium */
--color-primary-500: oklch(0.50 0.10 240);    /* Base - Main brand */
--color-primary-600: oklch(0.42 0.10 240);    /* Dark */
--color-primary-700: oklch(0.35 0.09 240);    /* Darker */
--color-primary-800: oklch(0.28 0.07 240);    /* Very dark */
--color-primary-900: oklch(0.22 0.05 240);    /* Darkest */
--color-primary-950: oklch(0.15 0.03 240);    /* Near black */
```

#### Neutral Palette (Surfaces & Text)

```css
/* Neutral Gray - Cool undertone for corporate feel */
--color-neutral-25:  oklch(0.99 0.002 240);   /* Background light */
--color-neutral-50:  oklch(0.98 0.003 240);   /* Surface light */
--color-neutral-100: oklch(0.96 0.004 240);   /* Border light */
--color-neutral-200: oklch(0.92 0.006 240);   /* Divider */
--color-neutral-300: oklch(0.87 0.008 240);   /* Disabled bg */
--color-neutral-400: oklch(0.70 0.010 240);   /* Placeholder */
--color-neutral-500: oklch(0.55 0.010 240);   /* Secondary text */
--color-neutral-600: oklch(0.45 0.010 240);   /* Body text */
--color-neutral-700: oklch(0.35 0.008 240);   /* Heading text */
--color-neutral-800: oklch(0.25 0.006 240);   /* Primary text */
--color-neutral-900: oklch(0.18 0.004 240);   /* Emphasis text */
--color-neutral-950: oklch(0.12 0.003 240);   /* Maximum contrast */
```

#### Status Colors (Semantic)

```css
/* Success - Corporate Green */
--color-success-50:  oklch(0.97 0.02 145);
--color-success-100: oklch(0.93 0.04 145);
--color-success-500: oklch(0.55 0.14 145);
--color-success-600: oklch(0.48 0.13 145);
--color-success-700: oklch(0.40 0.11 145);

/* Warning - Amber */
--color-warning-50:  oklch(0.98 0.02 85);
--color-warning-100: oklch(0.94 0.05 85);
--color-warning-500: oklch(0.75 0.15 85);
--color-warning-600: oklch(0.65 0.14 85);
--color-warning-700: oklch(0.55 0.12 85);

/* Error - Red */
--color-error-50:  oklch(0.97 0.02 25);
--color-error-100: oklch(0.93 0.05 25);
--color-error-500: oklch(0.55 0.18 25);
--color-error-600: oklch(0.48 0.17 25);
--color-error-700: oklch(0.40 0.15 25);

/* Info - Light Blue */
--color-info-50:  oklch(0.97 0.02 220);
--color-info-100: oklch(0.93 0.04 220);
--color-info-500: oklch(0.60 0.12 220);
--color-info-600: oklch(0.52 0.11 220);
--color-info-700: oklch(0.45 0.10 220);
```

#### Dark Mode Palette

```css
/* Dark Mode Surfaces */
--color-dark-bg:        oklch(0.13 0.01 240);  /* Main background */
--color-dark-surface:   oklch(0.18 0.01 240);  /* Card background */
--color-dark-elevated:  oklch(0.22 0.01 240);  /* Modal/dropdown */
--color-dark-border:    oklch(0.28 0.01 240);  /* Borders */

/* Dark Mode Text */
--color-dark-text-primary:   oklch(0.95 0.005 240);
--color-dark-text-secondary: oklch(0.75 0.008 240);
--color-dark-text-tertiary:  oklch(0.55 0.010 240);
```

### 2.3 Typography System

#### Font Stack (Keep Current - Excellent Choice)
```css
--font-heading: 'Kanit', system-ui, -apple-system, sans-serif;
--font-body: 'IBM Plex Sans Thai Looped', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, monospace;
```

#### Type Scale (Enterprise-Optimized)

| Token | Size | Weight | Line Height | Use Case |
|-------|------|--------|-------------|----------|
| `text-display` | 36px | 600 | 1.2 | Page titles |
| `text-h1` | 28px | 600 | 1.25 | Section headers |
| `text-h2` | 22px | 600 | 1.3 | Card titles |
| `text-h3` | 18px | 600 | 1.35 | Subsections |
| `text-h4` | 16px | 600 | 1.4 | Widget titles |
| `text-body-lg` | 16px | 400 | 1.5 | Emphasized body |
| `text-body` | 14px | 400 | 1.5 | Default body |
| `text-body-sm` | 13px | 400 | 1.5 | Secondary info |
| `text-caption` | 12px | 400 | 1.4 | Labels, hints |
| `text-overline` | 11px | 500 | 1.3 | Overline labels (uppercase) |

### 2.4 Spacing System

```css
/* 4px base unit */
--space-0: 0;
--space-0.5: 2px;
--space-1: 4px;
--space-1.5: 6px;
--space-2: 8px;
--space-2.5: 10px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
```

#### Layout Spacing Standards

| Context | Spacing | Token |
|---------|---------|-------|
| Page padding (desktop) | 32px | `--space-8` |
| Page padding (mobile) | 16px | `--space-4` |
| Section gap | 24px | `--space-6` |
| Card padding | 20px | `--space-5` |
| Card gap (grid) | 16px | `--space-4` |
| Form field gap | 16px | `--space-4` |
| Inline element gap | 8px | `--space-2` |
| Icon-text gap | 8px | `--space-2` |

### 2.5 Border Radius (Corporate - Less Rounded)

```css
--radius-none: 0;
--radius-sm: 4px;      /* Buttons, inputs, badges */
--radius-md: 6px;      /* Cards, dropdowns */
--radius-lg: 8px;      /* Modals, large containers */
--radius-xl: 12px;     /* Hero sections only */
--radius-full: 9999px; /* Avatars, pills */
```

### 2.6 Shadow System (Subtle)

```css
/* Light Mode Shadows */
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.04);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.06), 0 8px 10px rgba(0, 0, 0, 0.04);

/* Focus Ring */
--shadow-focus: 0 0 0 3px rgba(var(--color-primary-500), 0.25);

/* Dark Mode Shadows */
--shadow-dark-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
--shadow-dark-md: 0 4px 6px rgba(0, 0, 0, 0.4);
--shadow-dark-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
```

### 2.7 Icon System (Lucide React - Standardized)

#### Icon Sizes
| Size | Pixels | Use Case |
|------|--------|----------|
| `icon-xs` | 14px | Inline with small text |
| `icon-sm` | 16px | Buttons, inputs |
| `icon-md` | 20px | Default, navigation |
| `icon-lg` | 24px | Headers, cards |
| `icon-xl` | 32px | Feature highlights |
| `icon-2xl` | 48px | Empty states, heroes |

#### Icon Style Guidelines
- **Stroke width**: 1.5px (default Lucide)
- **Color**: Inherit from parent (currentColor)
- **Alignment**: Vertically centered with text
- **Spacing**: 8px gap from adjacent text

#### Navigation Icons (Replace Emojis)
| Feature | Current | New (Lucide) |
|---------|---------|--------------|
| Dashboard | 📊 | `LayoutDashboard` |
| Employees | 👥 | `Users` |
| Schedule | 📅 | `Calendar` |
| Attendance | ⏰ | `Clock` |
| Leave | 🏖️ | `CalendarOff` or `Palmtree` |
| Reports | 📈 | `BarChart3` |
| Settings | ⚙️ | `Settings` |
| Notifications | 🔔 | `Bell` |

---

## Part 3: Component Library Architecture

### 3.1 Component Categories

```
/frontend/src/components/
├── ui/                    # Primitive UI components
│   ├── Button/
│   ├── Input/
│   ├── Select/
│   ├── Checkbox/
│   ├── Radio/
│   ├── Switch/
│   ├── Badge/
│   ├── Avatar/
│   ├── Tooltip/
│   └── ...
├── layout/                # Layout components
│   ├── Container/
│   ├── Stack/
│   ├── Grid/
│   ├── Divider/
│   ├── Sidebar/
│   ├── Header/
│   └── PageHeader/
├── data-display/          # Data presentation
│   ├── Table/
│   ├── DataTable/
│   ├── Card/
│   ├── Stat/
│   ├── List/
│   └── DescriptionList/
├── feedback/              # User feedback
│   ├── Alert/
│   ├── Toast/
│   ├── Modal/
│   ├── Drawer/
│   ├── Skeleton/
│   └── Spinner/
├── navigation/            # Navigation
│   ├── Breadcrumb/
│   ├── Tabs/
│   ├── Pagination/
│   ├── NavLink/
│   └── Menu/
├── forms/                 # Form-specific
│   ├── FormField/
│   ├── FormLabel/
│   ├── FormError/
│   ├── FormSection/
│   └── SearchInput/
└── composite/             # Domain-specific
    ├── StatusBadge/
    ├── EmployeeCard/
    ├── ShiftCard/
    ├── LeaveRequestCard/
    └── ...
```

### 3.2 Core Component Specifications

#### Button Component

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
  size: 'sm' | 'md' | 'lg';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isLoading?: boolean;
  isDisabled?: boolean;
  fullWidth?: boolean;
}
```

**Visual Specifications:**

| Variant | Background | Text | Border | Hover |
|---------|------------|------|--------|-------|
| primary | primary-500 | white | none | primary-600 |
| secondary | neutral-100 | neutral-700 | none | neutral-200 |
| outline | transparent | primary-600 | primary-300 | primary-50 |
| ghost | transparent | neutral-600 | none | neutral-100 |
| danger | error-500 | white | none | error-600 |
| link | transparent | primary-600 | none | underline |

| Size | Height | Padding X | Font Size | Icon Size |
|------|--------|-----------|-----------|-----------|
| sm | 32px | 12px | 13px | 14px |
| md | 40px | 16px | 14px | 16px |
| lg | 48px | 20px | 16px | 20px |

#### Input Component

```typescript
interface InputProps {
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size: 'sm' | 'md' | 'lg';
  isDisabled?: boolean;
  isReadOnly?: boolean;
}
```

**Visual Specifications:**
- Border: 1px neutral-300
- Border radius: 4px
- Focus: 2px primary-500 ring
- Error: error-500 border + error text
- Background: white (light) / dark-surface (dark)

| Size | Height | Padding | Font Size |
|------|--------|---------|-----------|
| sm | 32px | 8px 10px | 13px |
| md | 40px | 10px 12px | 14px |
| lg | 48px | 12px 14px | 16px |

#### Card Component

```typescript
interface CardProps {
  variant: 'default' | 'bordered' | 'elevated';
  padding: 'none' | 'sm' | 'md' | 'lg';
  isHoverable?: boolean;
  isClickable?: boolean;
}
```

**Visual Specifications:**
- Border radius: 6px
- Padding sm: 12px, md: 20px, lg: 24px
- Default: neutral-50 background, no border
- Bordered: white background, neutral-200 border
- Elevated: white background, shadow-sm

#### Table Component

```typescript
interface TableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  isEmpty?: boolean;
  isStriped?: boolean;
  isHoverable?: boolean;
  isSortable?: boolean;
  isSelectable?: boolean;
  onRowClick?: (row: T) => void;
  onSelectionChange?: (selected: T[]) => void;
}
```

**Visual Specifications:**
- Header: neutral-50 background, font-weight 600, text-caption size
- Row height: 52px (comfortable touch)
- Striped: alternate neutral-25 background
- Hover: neutral-100 background
- Border: 1px neutral-200 horizontal dividers
- Selected: primary-50 background

### 3.3 Theme Provider Architecture

```typescript
// /frontend/src/components/theme/ThemeProvider.tsx
interface ThemeContextValue {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  resolvedTheme: 'light' | 'dark';
}

// Usage
const { theme, setTheme, resolvedTheme } = useTheme();
```

**Implementation:**
1. Store preference in localStorage
2. Detect system preference via `prefers-color-scheme`
3. Apply `.dark` class to `<html>` element
4. Provide context for components

---

## Part 4: Layout Templates

### 4.1 Admin Layout (Web)

```
┌─────────────────────────────────────────────────────────────────┐
│  Header (56px)                                      [Dark/Light]│
│  ┌─────────────┬────────────────────────────────────────────────│
│  │  Sidebar    │  Main Content Area                             │
│  │  (240px)    │  ┌─────────────────────────────────────────────│
│  │             │  │ Page Header                                 │
│  │  [Logo]     │  │ [Breadcrumb]                                │
│  │             │  │ [Title]          [Actions]                  │
│  │  Navigation │  ├─────────────────────────────────────────────│
│  │  - Dashboard│  │ Page Content                                │
│  │  - Employees│  │                                             │
│  │  - Schedule │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │  - Attend.  │  │  │  Card 1  │ │  Card 2  │ │  Card 3  │    │
│  │  - Leave    │  │  └──────────┘ └──────────┘ └──────────┘    │
│  │  - Reports  │  │                                             │
│  │             │  │  ┌────────────────────────────────────────┐ │
│  │  ─────────  │  │  │  Data Table                            │ │
│  │  Settings   │  │  │                                        │ │
│  │             │  │  └────────────────────────────────────────┘ │
│  └─────────────┴────────────────────────────────────────────────│
└─────────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Sidebar: Fixed, 240px width, collapsible to 64px (icon-only)
- Header: Fixed, 56px height
- Content area: Scrollable, max-width 1280px, centered
- Page padding: 32px (desktop), 16px (mobile)
- Breakpoints: Mobile (<768px), Tablet (768-1024px), Desktop (>1024px)

### 4.2 LIFF Layout (Mobile)

```
┌─────────────────────────┐
│  Header (48px)     [←]  │
├─────────────────────────┤
│                         │
│  Scrollable Content     │
│                         │
│  ┌───────────────────┐  │
│  │  Card 1           │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │  Card 2           │  │
│  └───────────────────┘  │
│                         │
├─────────────────────────┤
│  Bottom Action (safe)   │
└─────────────────────────┘
```

**Specifications:**
- Header: 48px, simplified navigation
- Content: Full-width, safe-area-aware
- Bottom action: Fixed, safe-area-bottom padding
- Touch targets: Minimum 44x44px
- Padding: 16px horizontal

---

## Part 5: Page-by-Page Redesign Specifications

### 5.1 Login Page

**Current Issues:**
- Gradient background is decorative, not corporate
- Card too rounded (rounded-2xl)
- Emoji language toggle unprofessional

**Redesign:**
- Clean white/neutral background
- Centered card with subtle shadow
- Corporate logo placement
- Smaller border radius (rounded-lg)
- Icon-based language toggle

### 5.2 Dashboard

**Current Issues:**
- Stats cards have inconsistent styling
- Widget titles use emoji
- Poor information density

**Redesign:**
- Stat cards with consistent icon placement (left)
- Subtle trend indicators
- Compact widget design
- Quick action buttons
- Activity timeline

### 5.3 Employee Management

**Current Issues:**
- Filter section takes too much space
- Table lacks enterprise features
- Status badges inconsistent

**Redesign:**
- Collapsible advanced filters
- Enhanced data table with:
  - Column visibility toggle
  - Multi-select for bulk actions
  - Row actions dropdown
  - Sortable columns with indicators
- Consistent status badge component

### 5.4 Schedule/Shifts

**Current Issues:**
- Calendar view lacks polish
- Shift cards use emoji

**Redesign:**
- Professional calendar grid
- Color-coded shift types (left border)
- Drag-and-drop scheduling
- Timeline view option

### 5.5 Attendance

**Current Issues:**
- List view only
- GPS data not visualized

**Redesign:**
- List + Map toggle view
- Clock in/out timeline
- Location accuracy indicator
- Photo thumbnails in list

### 5.6 Leave Management

**Current Issues:**
- Request form buried in modal
- Balance display not prominent

**Redesign:**
- Balance summary cards at top
- Request wizard with calendar picker
- Status timeline for requests
- Manager approval queue view

### 5.7 LIFF Pages

**Current Issues:**
- Large clock button too playful
- Emoji usage throughout

**Redesign:**
- Professional, minimal interface
- Lucide icons throughout
- Subtle animations
- Clear status indicators
- Consistent with web design tokens

---

## Part 6: Implementation Plan

### Phase 1: Foundation (Week 1-2)

**Objective:** Establish design system infrastructure

#### Tasks:
1. **Update CSS Variables** (`/frontend/src/index.css`)
   - Replace color palette with new corporate colors
   - Update typography scale
   - Update spacing tokens
   - Update shadow and radius tokens

2. **Create Theme Provider**
   - Implement `ThemeContext` and `useTheme` hook
   - Add theme toggle component
   - Persist preference to localStorage

3. **Refactor Base Components**
   - Update Button component with new specs
   - Update Input component with new specs
   - Update Select component with new specs
   - Create Badge component (standardized)
   - Create Avatar component

4. **Icon Migration**
   - Create icon size utility classes
   - Replace all inline SVGs with Lucide icons
   - Replace emoji icons in navigation

**Deliverables:**
- Updated `index.css` with new design tokens
- `ThemeProvider` component
- 5 refactored base components
- Icon migration complete

### Phase 2: Layout Components (Week 2-3)

**Objective:** Create consistent layout infrastructure

#### Tasks:
1. **Redesign Sidebar**
   - New navigation with Lucide icons
   - Collapsible behavior
   - Active state styling
   - User menu at bottom

2. **Redesign Header**
   - Simplified design
   - Theme toggle button
   - Notification center
   - User dropdown menu

3. **Create Layout Utilities**
   - Container component (max-width handling)
   - Stack component (vertical spacing)
   - PageHeader component (breadcrumb + title + actions)

4. **LIFF Layout Update**
   - Simplified mobile header
   - Bottom navigation component
   - Safe area handling

**Deliverables:**
- Redesigned `DashboardLayout`
- Redesigned `LiffLayout`
- 3 new layout utility components

### Phase 3: Data Components (Week 3-4)

**Objective:** Create enterprise-grade data display components

#### Tasks:
1. **Enhanced Table Component**
   - Column sorting
   - Column visibility toggle
   - Row selection
   - Bulk actions toolbar
   - Loading states
   - Empty states

2. **Card Variants**
   - Default, bordered, elevated variants
   - CardHeader, CardBody, CardFooter subcomponents
   - Stat card variant

3. **List Components**
   - DescriptionList for detail views
   - ActionList for menus
   - Timeline for activity

4. **Feedback Components**
   - Toast system update
   - Alert component
   - Skeleton loaders

**Deliverables:**
- Enhanced `DataTable` component
- `Card` component with variants
- 3 new list/timeline components
- Updated feedback components

### Phase 4: Form System (Week 4-5)

**Objective:** Standardize form patterns

#### Tasks:
1. **Form Components**
   - FormField wrapper (label + input + error)
   - FormSection (grouped fields)
   - SearchInput with debounce

2. **Input Variants**
   - Textarea
   - Checkbox
   - Radio group
   - Switch toggle
   - Date picker styling
   - File upload

3. **Form Layouts**
   - Horizontal form pattern
   - Multi-column form grid
   - Inline form pattern

**Deliverables:**
- Form field components
- All input variants
- Form layout utilities

### Phase 5: Page Redesigns (Week 5-8)

**Objective:** Apply new design system to all pages

#### Order of Implementation:

1. **Auth Pages** (Week 5)
   - Login page redesign
   - Register page redesign

2. **Dashboard** (Week 5-6)
   - Stats cards
   - Widgets redesign
   - Quick actions

3. **Employee Management** (Week 6)
   - List view with new table
   - Detail view
   - Form modals

4. **Schedule/Shifts** (Week 6-7)
   - Calendar redesign
   - Shift cards
   - Template management

5. **Attendance** (Week 7)
   - List view
   - Detail view
   - Map integration

6. **Leave Management** (Week 7-8)
   - Balance dashboard
   - Request flow
   - Approval queue

7. **Reports** (Week 8)
   - Report cards
   - Chart styling
   - Export UI

8. **LIFF Pages** (Week 8)
   - Clock page
   - Schedule page
   - Leave page
   - Profile page

### Phase 6: Polish & Testing (Week 8-9)

**Objective:** Ensure quality and consistency

#### Tasks:
1. **Visual QA**
   - Cross-browser testing
   - Mobile device testing
   - Dark mode verification
   - RTL consideration (future)

2. **Accessibility Audit**
   - Keyboard navigation
   - Screen reader testing
   - Color contrast verification
   - Focus management

3. **Performance**
   - Bundle size analysis
   - Lazy loading optimization
   - Animation performance

4. **Documentation**
   - Component usage guidelines
   - Design token reference
   - Storybook setup (optional)

---

## Part 7: File Structure Changes

### New Files to Create

```
/frontend/src/
├── components/
│   ├── ui/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Select/
│   │   ├── Checkbox/
│   │   ├── Radio/
│   │   ├── Switch/
│   │   ├── Badge/
│   │   ├── Avatar/
│   │   ├── Tooltip/
│   │   └── index.ts
│   ├── layout/
│   │   ├── Container/
│   │   ├── Stack/
│   │   ├── PageHeader/
│   │   ├── Sidebar/
│   │   ├── Header/
│   │   └── index.ts
│   ├── data-display/
│   │   ├── DataTable/
│   │   ├── Card/
│   │   ├── Stat/
│   │   ├── DescriptionList/
│   │   ├── Timeline/
│   │   └── index.ts
│   ├── feedback/
│   │   ├── Alert/
│   │   ├── Toast/
│   │   ├── Modal/
│   │   ├── Drawer/
│   │   ├── Skeleton/
│   │   ├── Spinner/
│   │   └── index.ts
│   ├── navigation/
│   │   ├── Breadcrumb/
│   │   ├── Tabs/
│   │   ├── Pagination/
│   │   └── index.ts
│   ├── forms/
│   │   ├── FormField/
│   │   ├── FormSection/
│   │   ├── SearchInput/
│   │   └── index.ts
│   └── theme/
│       ├── ThemeProvider.tsx
│       ├── ThemeToggle.tsx
│       ├── useTheme.ts
│       └── index.ts
├── styles/
│   ├── tokens/
│   │   ├── colors.css
│   │   ├── typography.css
│   │   ├── spacing.css
│   │   └── index.css
│   └── base/
│       ├── reset.css
│       ├── utilities.css
│       └── index.css
└── index.css (imports from styles/)
```

### Files to Modify

1. `/frontend/src/index.css` - Complete rewrite with new tokens
2. `/frontend/src/components/common/*` - Migrate to new structure
3. `/frontend/src/components/layout/DashboardLayout.tsx` - Redesign
4. `/frontend/src/components/layout/LiffLayout.tsx` - Redesign
5. All page components in `/frontend/src/pages/`

---

## Part 8: Migration Strategy

### Approach: Incremental Migration

1. **Create new components alongside existing ones**
   - New components in `/components/ui/`, etc.
   - Old components remain in `/components/common/`

2. **Migrate pages one at a time**
   - Start with least-used pages (Reports)
   - Progress to core pages (Dashboard, Employees)

3. **Feature flag for major changes**
   - Use `VITE_USE_NEW_UI=true` for testing
   - Allows rollback if issues arise

4. **Remove old components after full migration**
   - Clean up `/components/common/`
   - Update all imports

### Breaking Changes to Communicate

1. **Color variable names changing**
2. **Component API changes (props)**
3. **Import paths changing**
4. **CSS class names may change**

---

## Part 9: Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Visual Consistency | 100% components use design tokens | Code review |
| Accessibility | WCAG AA compliant | Lighthouse audit |
| Dark Mode Coverage | 100% pages support dark mode | Manual testing |
| Icon Consistency | 100% Lucide icons | Code grep |
| Mobile Usability | 100% touch-friendly | Manual testing |
| Bundle Size | < 10% increase | Build analysis |
| Component Reuse | > 80% shared components | Code analysis |

---

## Appendix A: Color Token Mapping

| Old Token | New Token |
|-----------|-----------|
| `--color-primary-*` | `--color-primary-*` (new values) |
| `--color-secondary-*` | Removed (use neutral) |
| `--color-surface-*` | `--color-neutral-*` |
| `--color-success-*` | `--color-success-*` (adjusted) |
| `--color-warning-*` | `--color-warning-*` (adjusted) |
| `--color-error-*` | `--color-error-*` (adjusted) |

## Appendix B: Icon Migration Reference

| Context | Old | New (Lucide) |
|---------|-----|--------------|
| Dashboard nav | 📊 | `LayoutDashboard` |
| Employees nav | 👥 | `Users` |
| Schedule nav | 📅 | `Calendar` |
| Attendance nav | ⏰ | `Clock` |
| Leave nav | 🏖️ | `CalendarOff` |
| Reports nav | 📈 | `BarChart3` |
| Settings nav | ⚙️ | `Settings` |
| Notifications | 🔔 | `Bell` |
| Search | Custom SVG | `Search` |
| Close | Custom SVG | `X` |
| Menu | Custom SVG | `Menu` |
| Add | Custom SVG | `Plus` |
| Edit | Custom SVG | `Pencil` |
| Delete | Custom SVG | `Trash2` |
| View | Custom SVG | `Eye` |
| Download | Custom SVG | `Download` |
| Filter | Custom SVG | `Filter` |
| Sort | Custom SVG | `ArrowUpDown` |

---

*Document Version: 1.0*
*Created: 2025-01-19*
*Author: Claude Code*

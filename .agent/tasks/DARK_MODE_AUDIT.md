# Dark Mode UX Audit Checklist for Security Guard HRM

This checklist identifies critical areas for verifying Dark Mode compatibility, ensuring component isolation, accessibility, and consistent design implementation.

## 1. Component Isolation Checks

Verify that these components do not inherit incorrect background or text attributes from the main document body, especially when rendered in Portals or different contexts.

### Modals & Dialogs
- [x] **Background Contrast**: Ensure modal content background uses a standout surface color (e.g., `bg-neutral-800` or `var(--color-dark-surface)`) against the backdrop overlay.
- [x] **Backdrop Overlay**: Verify the backdrop (overlay) is sufficiently dark (e.g., `bg-black/50` or `bg-neutral-900/60`) to separate the modal from the page content.
- [x] **Portal Rendering**: Confirm that modals rendered via Portals (outside the main root) correctly inherit the `.dark` class if your implementation relies on a wrapper class.
- [x] **Close Button Visibility**: Ensure the specific "X" or close button has sufficient contrast against the modal header background.

### Dropdowns & Selects (Popover/Floating UI)
- [x] **Menu Background**: Check that dropdown menus have a solid, dark background color (e.g., `bg-neutral-800`) and are not transparent or using the default light background.
- [x] **Border/Shadow Definition**: Ensure the dropdown has a border (e.g., `border-neutral-700`) or a strong shadow (`shadow-dark-lg`) to differentiate it from the underlying page content.
- [x] **Scrollbars**: If the dropdown is scrollable, verify that the scrollbar track and thumb colors are dark-themed (e.g., `scrollbar-thumb-neutral-600`).

### Tables & Data Grids
- [x] **Striped Rows**: Verify that "even" or "odd" row coloring uses a subtle dark tint (e.g., `even:dark:bg-white/5` or `even:dark:bg-neutral-800/50`) rather than a light gray that looks like a highlight.
- [x] **Header Visibility**: Ensure table headers (`th`) have a background distinct from the body but readable (e.g., `dark:bg-neutral-900`).
- [x] **Row Hover States**: Check that row hover effects are visible but not blindingly bright in dark mode (e.g., `hover:dark:bg-neutral-800`).
- [x] **Borders**: Ensure cell borders are not too harsh; use a subtle dark border color (e.g., `dark:border-neutral-800`).

## 2. Contrast & Accessibility

Ensure text and interactive elements remain readable and usable in low-light environments.

### Text Readability
- [x] **Standard Text**: Verify `text-gray-600` (common body text) is replaced with a lighter gray in dark mode (e.g., `dark:text-neutral-300` or `dark:text-neutral-400`).
  - *Fail Condition*: Dark gray text on a black background.
- [x] **Headings**: Ensure headings are nearly white (e.g., `dark:text-white` or `dark:text-neutral-100`).
- [x] **Muted Text**: Check that helper text or captions (`text-sm text-gray-400`) do not vanish against the dark background.
- [x] **Links**: Ensure link colors (usually blue) are adjusted to a lighter shade (e.g., `dark:text-blue-400` instead of `text-blue-600`) for better contrast.

### Interactive States
- [x] **Disabled Buttons**: Check that `disabled` buttons look disabled but are still visible.
  - *Recommendation*: `disabled:dark:bg-neutral-800 disabled:dark:text-neutral-600`.
- [x] **Disabled Inputs**: Ensure disabled input fields clearly look inactive (e.g., darker background `dark:bg-neutral-900` with `dark:text-neutral-600`).
- [x] **Focus Rings**: Verify accessibility focus rings are visible (e.g., standard blue ring usually works, but ensure it pops against the dark card background).

## 3. Tailwind Implementation Strategy

Use this mapping guide to standardize Dark Mode colors across the application. This aligns with the "Security Guard HRM" design system observed in `index.css`.

### Color Palette Mapping

| Light Mode Class | Concept | Dark Mode Requirement (Suggestion) |
| :--- | :--- | :--- |
| `bg-white` | **Card Surface** | `dark:bg-neutral-900` or `var(--color-dark-surface)` |
| `bg-gray-50` | **Page Background** | `dark:bg-neutral-950` or `var(--color-dark-bg)` |
| `bg-gray-100` | **Secondary Surface** | `dark:bg-neutral-800` or `var(--color-dark-elevated)` |
| `border-gray-200` | **Borders** | `dark:border-neutral-800` or `var(--color-dark-border)` |
| `text-gray-900` | **Primary Text** | `dark:text-white` or `dark:text-neutral-50` |
| `text-gray-600` | **Secondary Text** | `dark:text-neutral-400` |
| `text-gray-400` | **Muted Text** | `dark:text-neutral-500` |
| `bg-blue-600` | **Primary Action** | `dark:bg-blue-500` (Slightly lighter for contrast) |

### Implementation Rules

1.  **Use CSS Variables for Consistency**: Where possible, use the defined CSS variables found in `index.css` (e.g., `var(--color-dark-bg)`) to ensure global thematic consistency.
2.  **Avoid Pure Black**: Avoid using `bg-black` (#000000) for surfaces. It can cause "smearing" on OLED screens when scrolling. Use deeply saturated grays or blues (e.g., `bg-neutral-950`).
3.  **Elevation via Lightness**: In Dark Mode, indicate elevation (like dropdowns or modals) by making the surface *lighter*, not by adding dark shadows (which are invisible on dark backgrounds).
    - *Level 0 (Background)*: `bg-neutral-950`
    - *Level 1 (Card)*: `bg-neutral-900`
    - *Level 2 (Dropdown/Modal)*: `bg-neutral-800`

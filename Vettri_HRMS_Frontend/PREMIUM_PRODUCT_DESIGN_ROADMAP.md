# Vettri HRMS Premium Product Design Roadmap

## Purpose

This document defines the phased plan for evolving Vettri HRMS from a functional customized Bootstrap application into a polished, premium workforce-management product.

The redesign should improve clarity, scanning speed, consistency, trust, and responsive usability without changing existing business workflows or API contracts.

## Current Assessment

- Functional usability: 7/10
- Visual consistency: 6/10
- Premium perception: 5.5/10
- Design-system foundation: 7/10

The application already has a useful foundation:

- Shared authenticated layout
- Central design tokens
- Reusable cards, buttons, tabs, dialogs, and states
- Lucide icon system
- Manrope typography
- Responsive sidebar and topbar
- Role-aware dashboards and navigation

The main issue is visual drift between tokens, Bootstrap overrides, inline styles, and late CSS overrides.

## Product Design Direction

Use the visual direction **Calm Workforce Intelligence**.

The interface should feel:

- Trustworthy
- Data-led
- Modern
- Restrained
- Human
- Fast to scan

Premium quality should come from hierarchy, spacing, typography, useful data visualization, and predictable interaction states. Avoid adding decoration merely for visual noise.

## Phase 0: Establish the Baseline

### Objectives

Capture the current experience before making visual changes.

### Screens to capture

- Login
- Dashboard
- Employees
- Employee profile
- Attendance
- Leave
- Recruitment
- Payroll
- Reports
- Settings
- Mobile navigation

### Checks

- Page spacing
- Colors
- Typography
- Responsive layout
- Loading states
- Empty states
- Error states
- Keyboard focus
- Table overflow

### Acceptance criteria

- Baseline capture status and access limitations are recorded below.
- `npm run build` succeeds before redesign work begins.
- Existing business behavior is documented and preserved before visual changes begin.

### Baseline evidence - 2026-09-04

#### Build verification

Command executed from `Vettri_HRMS_Frontend`:

```powershell
npm run build
```

Result: **Passed**. Vite transformed 1,811 modules and produced the production bundle successfully in 31.85 seconds.

Non-blocking warnings observed:

- Sass legacy JavaScript API deprecation
- Sass `@import` deprecation
- Bootstrap Sass color-function deprecations
- One JavaScript chunk is larger than 500 kB after minification

These warnings should be handled separately from the visual redesign.

#### Route and screen inventory

The current frontend route inventory covers the following baseline surfaces:

| Surface | Route | Capture status |
|---|---|---|
| Login | `/login` | Ready for unauthenticated capture |
| Dashboard | `/dashboard` | Requires authenticated session |
| Employees | `/employees` | Requires authenticated session |
| Employee profile | `/employees/:id` | Requires authenticated session and employee data |
| Attendance | `/attendance` | Requires authenticated session |
| Leave | `/leave` | Requires authenticated session |
| Recruitment | `/recruitment` | Requires authenticated session and permission |
| Payroll | `/salary` | Requires authenticated session and permission |
| Reports | `/reports` | Requires authenticated session and permission |
| Settings | `/settings/organization` | Requires authenticated session and permission |
| Mobile navigation | Authenticated shell at mobile width | Requires authenticated session |

#### Baseline review checklist

Before Phase 1, review each accessible screen against these checks and attach screenshots using a consistent name such as `baseline-login-desktop.png`:

- Page spacing
- Colors
- Typography
- Responsive layout
- Loading states
- Empty states
- Error states
- Keyboard focus
- Table overflow

#### Protected-screen limitation

The repository does not provide a safe test credential or a seeded browser session in this phase. Protected-screen screenshots therefore remain pending until an authorized local login session is available. Do not add credentials to this repository or commit screenshots containing personal or payroll data.

#### Business behavior to preserve

- Role-aware navigation and permission checks
- Workspace selection for super administrators
- Employee and administrator dashboard variants
- Report filters, saved views, and CSV exports
- Existing loading, error, empty, and toast feedback behavior
- Existing API endpoints and request payloads

## Phase 1: Normalize the Design Tokens

### Primary files

- `src/design-system/styles/tokens.css`
- `src/design-system/styles/custom.scss`
- `src/design-system/styles/global.css`
- `src/design-system/BRAND.md`

### Tasks

1. Define one authoritative brand palette.
2. Align Bootstrap variables with the CSS tokens.
3. Remove conflicting blue and orange values.
4. Replace repeated hardcoded colors with variables.
5. Standardize spacing, borders, radii, shadows, and typography.
6. Keep dark-mode token names compatible with light mode.

### Recommended palette

```css
--hz-primary-50: #eff6ff;
--hz-primary-100: #dbeafe;
--hz-primary-500: #2563eb;
--hz-primary-600: #1d4ed8;
--hz-primary-700: #1e40af;

--hz-accent-500: #f97316;
--hz-accent-600: #ea580c;

--hz-success-500: #16a34a;
--hz-warning-500: #d97706;
--hz-danger-500: #dc2626;
--hz-info-500: #0284c7;

--hz-text-primary: #172033;
--hz-text-secondary: #526176;
--hz-text-muted: #718096;
--hz-bg-canvas: #f4f7fb;
--hz-bg-surface: #ffffff;
--hz-border: #e5eaf1;
```

### Color usage

- Blue: primary actions, navigation, links, selected states
- Orange: important highlights and attention states
- Green: success and active states
- Amber: pending and warning states
- Red: errors and destructive actions
- Gray: secondary and inactive states

### Acceptance criteria

- Bootstrap and application components use the same palette.
- No unnecessary inline color values remain.
- A color change in `tokens.css` visibly updates the product consistently.

## Phase 2: Upgrade Shared UI Components

### Primary folder

`src/components/ui`

### Components to standardize

- `Card`
- `Button`
- `Badge`
- `PageHeader`
- `Tabs`
- `FormField`
- `Dialog`
- `EmptyState`
- `ErrorState`
- `Skeleton`

### Components to add or formalize

- `FilterBar`
- `DataTable`
- `StatCard`
- `ChartCard`
- `StatusBadge`
- `SectionHeader`
- `ExportMenu`

### Requirements

- Consistent hover, focus, disabled, and loading states
- Stable icon sizing
- Predictable button hierarchy
- Consistent card header spacing
- Mobile-safe layouts
- Accessible labels and focus rings

### Acceptance criteria

- New pages can be created mostly from shared components.
- Normal buttons and cards no longer require page-specific styling.
- Every interactive component has a visible keyboard focus state.

### Phase 2 implementation status - 2026-09-04

Completed in `src/components/ui`:

- Standardized `Card`, `Button`, `Badge`, `PageHeader`, `Tabs`, and `FilterBar` APIs.
- Added accessible loading and disabled semantics to `Button`.
- Added stable keyboard tab behavior and labels to `Tabs`.
- Added `StatCard`, `ChartCard`, `StatusBadge`, and `ExportMenu`.
- Formalized `DataTable`, `SectionHeader`, and `PageShell` as reusable shared entry points.
- Added shared styles for stat cards, chart cards, export menus, card actions, hover states, and focus states.

Validation:

- `npm run build` passed after the shared component changes.
- Existing Sass deprecation warnings and the existing large JavaScript chunk warning remain non-blocking.

Remaining adoption work belongs to later phases: existing module pages still need to migrate their local markup to these primitives as each page is redesigned.

## Phase 3: Redesign the Authenticated Shell

### Primary files

- `src/components/layout/MainLayout.jsx`
- `src/components/layout/Sidebar.jsx`
- `src/components/layout/Topbar.jsx`
- `src/components/ui/components.css`

### Sidebar

- Keep the icon rail if it remains part of the product identity.
- Increase label readability slightly.
- Make the active state obvious.
- Add tooltips for every icon-only action.
- Improve flyout grouping and spacing.
- Use blue for active navigation.
- Use orange only for alerts and attention states.

### Topbar

- Keep a quiet white surface.
- Make the workspace switcher clear.
- Give global search enough width.
- Group notifications and profile actions consistently.
- Keep the mobile menu predictable.
- Remove unnecessary visual borders.

### Page framing

```text
Maximum content width: 1320px
Desktop horizontal padding: 24px
Mobile horizontal padding: 16px
Section spacing: 24px
Card gap: 16px
```

### Acceptance criteria

- All authenticated pages share the same framing.
- Desktop, tablet, and mobile navigation work correctly.
- Sidebar and topbar rules are not duplicated across multiple CSS sections.

### Phase 3 implementation status - 2026-09-04

Completed:

- Moved authenticated shell layout responsibilities from inline styles into semantic classes.
- Added the `hz-app-shell`, `hz-app-shell__content`, and `hz-sidebar__header` layout contract.
- Standardized page framing to 24px desktop padding and 16px mobile padding with a 1320px content limit.
- Kept the icon rail and flyout navigation while improving active blue states and label readability.
- Added semantic rail badges for normal and alert counts.
- Restyled the topbar as a quiet adaptive surface using the shared surface, border, text, and primary tokens.
- Improved navigation landmarks and mobile drawer structure.
- Removed remaining legacy shell color literals from the shared stylesheet.

Validation:

- `npm run build` passed after the shell changes.
- `git diff --check` passed.
- Legacy shell-color search returned no matches in `components.css`.

The stylesheet still contains historical duplicate selector sections, but the final authenticated-shell contract now owns the visible desktop and mobile shell behavior. Splitting those legacy sections into smaller files is a later cleanup task to avoid changing unrelated page styles in this phase.

## Phase 4: Redesign Reports and Analytics

### Primary file

`src/pages/reports/Reports.jsx`

Reports should be the first major page redesign because it demonstrates the product's intelligence and business value.

### Recommended structure

```text
Reports & Analytics                         Export
Live workforce data                         Last updated time

[Date] [Department] [Location] [Status] [Reset]

[Headcount] [Attendance] [Leave] [Recruitment]

[Headcount trend             ] [Distribution chart]

[Secondary chart             ] [Secondary chart]

Detailed table
```

### Features

- Date presets: Today, 7 days, 30 days, Quarter, Custom
- Department filter
- Location filter
- Employee status filter
- Reset filters
- Last updated timestamp
- Export menu
- Saved report views
- Loading skeletons
- Useful empty states

### Recommended visualizations

- Employees: headcount trend, department distribution, employment status
- Attendance: daily attendance rate, late arrivals, absent employees
- Leave: leave by type, monthly usage, approval turnaround
- Recruitment: funnel conversion, time to hire, open roles by department
- Salary: payroll cost trend, department payroll distribution

Use a proven chart library such as Recharts rather than manually implementing all charts.

### Acceptance criteria

- The primary report result is understandable within five seconds.
- Filters visibly affect the report.
- Each report supports loading, empty, error, and populated states.
- Export controls are easy to find without dominating the page.

### Phase 4 implementation status - 2026-09-04

Completed in `src/pages/reports/Reports.jsx`:

- Added a report header with export action and last-updated context.
- Added a responsive report toolbar with attendance date filters, leave year filter, department view filter, employee status filter, and reset action.
- Preserved report tabs, saved report views, CSV exports, drill-down links, and existing API queries.
- Replaced basic KPI cards with shared `StatCard` components.
- Added responsive Recharts summaries for employee status, departments, attendance, leave, and recruitment pipeline data.
- Retained detailed bar rows below charts for readable values and department drill-downs.
- Removed duplicate per-panel date and year controls so each report has one filter location.
- Preserved loading skeletons, API error retry states, heatmap behavior, and useful no-data messages.
- Added `recharts` to the frontend dependencies.

Validation:

- `npm run build` passed after the Reports redesign.
- `get_errors` found no errors in the redesigned Reports page or shared stylesheet.
- `git diff --check` passed.

API limitation:

- The current reports endpoints do not expose location-level dimensions, so a location filter was not added as a non-functional control. Supporting it requires adding location data and query parameters to the relevant backend report endpoints before exposing it in the UI.

## Phase 5: Redesign the Dashboard

### Primary file

`src/pages/Dashboard.jsx`

### Recommended content order

1. Welcome header
2. Workforce KPI cards
3. Needs attention
4. Workforce trends
5. Attendance and leave insights
6. Quick actions
7. Secondary information

### KPI improvements

Every KPI should include:

- Current value
- Comparison period
- Percentage change
- Small trend visualization
- Clear semantic color

Example:

```text
Total employees
248
+12 this month
```

### Dashboard rules

- Prioritize actions above informational content.
- Avoid making every section look like an equal card.
- Replace empty blocks with useful first-state actions.
- Keep employee and administrator dashboards purpose-specific.

### Acceptance criteria

- The dashboard is useful even with limited data.
- Pending actions are visible without excessive scrolling.
- Empty states provide one clear next action.
- The page does not feel like a long collection of equal cards.

### Phase 5 implementation status - 2026-09-04

Completed in `src/pages/Dashboard.jsx`:

- Replaced administrator metric tiles with shared `StatCard` components.
- Added real loading states for workforce and pending-action KPIs.
- Added a responsive workforce overview chart using Recharts.
- Kept action queue, quick actions, role-aware permissions, and the employee dashboard branch unchanged.
- Preserved existing query behavior and mutation feedback.

Validation:

- `npm run build` passed after the Dashboard redesign.

The next adoption work is Phase 6: migrate high-volume HR module pages to the shared table, filter, status, and page-header primitives.

## Phase 6: Improve Core HR Modules

Apply the shared visual system in this order.

### Employees

- Search and filtering
- Table readability
- Employee status visibility
- Employee profile hierarchy
- Bulk actions where supported

### Attendance

- Daily attendance summary
- Attendance rate
- Late and absent states
- Date controls
- Employee drill-down

### Leave

- Pending approvals
- Leave balances
- Approval actions
- Status filters
- Calendar presentation

### Recruitment

- Pipeline stages
- Candidate status
- Time-to-hire
- Interview visibility
- Stage movement

### Payroll

- Payroll period
- Processing status
- Salary totals
- Approval state
- Export actions

### Monitoring

- Device health
- Online and offline states
- Activity timeline
- Alerts
- Last synchronization time

### Acceptance criteria

- Every module uses the same table, badge, filter, and page-header patterns.
- Important actions are visually prioritized.
- Large datasets remain easy to scan.

### Phase 6 implementation status - 2026-09-04

First adoption slice completed:

- Improved shared `Table` keyboard behavior for clickable rows using Enter and Space.
- Added explicit busy state to data tables during loading.
- Disabled select-all while table data is loading or empty.
- Added accessible employee search labeling.
- Migrated employee status rendering to the shared `StatusBadge` primitive.
- Preserved employee pagination, selection, bulk status changes, and API behavior.
- Migrated Attendance summaries to shared `StatCard` components and standardized punch/unmapped states with `StatusBadge`.
- Migrated Leave request statuses to `StatusBadge`, shared request tabs to `Tabs`, and added accessible approval search labeling.
- Migrated Recruitment filters to `FilterBar` and opening statuses to `StatusBadge`.
- Migrated Monitoring device page framing and filters to `PageHeader` and `FilterBar`, with shared online/offline status badges.
- Migrated Payroll totals to shared `StatCard` components while preserving processing, hold, paid, cancel, and export actions.
- Migrated Employee Profile status hierarchy and status menu options to `StatusBadge`.
- Migrated Candidate Pipeline framing and pipeline summary metrics to `PageHeader` and `StatCard`.
- Migrated Monitoring Activity filters to `FilterBar` with accessible search labeling.
- Migrated Settings Users active/inactive states to `StatusBadge`.
- Migrated Candidate Detail stage, decision, and interview states to `StatusBadge`.
- Migrated Monitoring Device Detail online/offline state to `StatusBadge`.
- Standardized Salary Detail payroll history tables with the shared `hz-table` treatment.
- Migrated Settings Audit actions to `StatusBadge`.

Validation:

- `npm run build` passed after the shared table and Employees changes.

Phase 6 core implementation is complete. Remaining visual differences are optional polish items that can be handled during the final responsive/accessibility review.

Validation:

- `npm run build` passed after the final detail-surface migrations.
- `get_errors` found no errors in the final Phase 6 files.
- `git diff --check` passed; only standard CRLF conversion notices were reported.

## Phase 7: Improve Forms, Dialogs, and Feedback

Apply this phase to employee creation, imports, leave approvals, organization settings, payroll processing, and recruitment workflows.

### Requirements

- Clear field grouping
- Inline validation
- Required-field indicators
- Loading submit state
- Disabled submit state
- Success feedback
- Actionable error feedback
- Confirmation for destructive actions
- Unsaved-change protection
- Sticky dialog footer for long forms

Use one primary action per page section or dialog.

### Acceptance criteria

- Users understand what happens before submitting.
- Errors explain how to fix the problem.
- Long forms work on mobile screens.

### Phase 7 implementation status - 2026-09-04

Initial workflow slice completed:

- Added reusable `ErrorBanner` for consistent, accessible server-error presentation.
- Added field-level invalid styling through the shared `FormField` primitive.
- Added opt-in unsaved-change protection to the shared `Dialog` primitive.
- Added consistent dialog-footer surface treatment for long forms.
- Applied error banners and dirty-form protection to employee onboarding.
- Applied error banners and dirty-form protection to leave application.
- Applied shared `ErrorBanner` treatment to recruitment requisition and candidate decision dialogs.
- Applied shared `ErrorBanner` treatment to payroll setup dialogs and user creation.
- Applied shared `ErrorBanner` treatment to employee import, public job application, employee document upload, and device enrollment.
- Preserved existing validation, API payloads, loading states, and success flows.

Validation:

- `npm run build` passed after the shared form and dialog changes.

Phase 7 core implementation is complete. Remaining differences are optional polish items that can be handled during the responsive and accessibility review.

Final validation:

- `npm run build` passed after the edge-form migrations.
- `get_errors` found no errors in the final edge-form files.
- `git diff --check` passed; only standard CRLF conversion notices were reported.

### Leave auto-approval completion - 2026-09-04

Completed separately from the visual phases:

- Added tenant-scoped `auto_approve` policy to leave types.
- Added Flyway migration `V7__leave_type_auto_approval.sql`.
- Added create and update support through the Leave Type API.
- Added automatic approval during the validated leave-application transaction.
- Preserved overlap, business-day, and balance checks before auto-approval.
- Added `AUTO_APPROVE` audit logging and an automatic decision note.
- Added Leave Settings controls for creating and toggling auto-approval per leave type.
- Manual approval remains the default for every existing and new leave type unless explicitly enabled.

Validation:

- Frontend `npm run build` passed.
- Java diagnostics found no errors in the changed leave classes.
- `git diff --check` passed with standard CRLF conversion notices.
- Backend Maven execution remains unavailable because Maven and `mvnw.cmd` are not installed in this environment.

## Phase 8: Responsive and Accessibility Review

### Viewports

- 1440px desktop
- 1280px laptop
- 1024px tablet landscape
- 768px tablet
- 390px mobile

### Responsive checks

- No horizontal page overflow
- Tables scroll correctly
- Buttons do not overlap
- Long names wrap safely
- Large numbers fit inside KPI cards
- Flyout menus stay inside the viewport
- Dialogs fit mobile screens
- Filters wrap correctly

### Accessibility checks

- Keyboard navigation
- Visible focus state
- Icon button labels
- Color contrast
- Status meaning not dependent on color alone
- Correct form labels
- Dialog focus management

### Phase 8 implementation status - 2026-09-04

Completed shared responsive and accessibility improvements:

- Added mobile-safe dialog sizing, scrolling, padding, and wrapping footers.
- Improved mobile topbar search sizing and page-header action wrapping.
- Added a global reduced-motion override for animations and transitions.
- Added `aria-current="page"` to authenticated contextual navigation.
- Added explicit `type="button"` to the topbar notification control.
- Preserved the existing focus ring, dialog focus trap, table overflow, and mobile drawer behavior.

Validation:

- `npm run build` passed after the responsive/accessibility changes.
- `get_errors` found no errors in the touched shell/style files.
- `git diff --check` passed; only standard CRLF conversion notices were reported.

Protected authenticated screens still require an authorized local session for visual screenshot verification, as documented in Phase 0.

## Phase 9: Final Visual QA and Cleanup

Run:

```powershell
cd Vettri_HRMS_Frontend
npm run build
```

Review and remove:

- Duplicate CSS selectors
- Conflicting colors
- Unnecessary inline styles
- Unused visual components
- Inconsistent border radii
- Inconsistent button sizes
- Inconsistent page spacing
- Inconsistent status terminology

Remove old styles only after verifying that no page depends on them.

### Phase 9 implementation status - 2026-09-04

Completed:

- Audited remaining legacy brand colors and tokenized the safe authenticated and login-brand surfaces.
- Confirmed remaining white and dark contrast colors are intentional presentation colors rather than competing product tokens.
- Reviewed duplicate shell selector layers; retained historical cascade blocks because removing them without authenticated visual regression coverage could affect unrelated pages.
- Confirmed shared responsive, focus, dialog, table, status, form, and reduced-motion rules are active in the final bundle.
- Preserved unrelated user worktree changes and did not perform destructive cleanup.

Final validation:

- `npm run build` passed.
- `get_errors` found no errors in the frontend source tree.
- `git diff --check` passed with only standard CRLF conversion notices.

Known non-blocking residuals:

- Sass legacy API and `@import` deprecation warnings from Bootstrap tooling.
- One JavaScript bundle remains above the 500 kB warning threshold.
- Authenticated visual screenshots require an authorized local session, as documented in Phase 0.

## Recommended Implementation Order

```text
Phase 0  Baseline screenshots
Phase 1  Design tokens
Phase 2  Shared UI components
Phase 3  Topbar and sidebar
Phase 4  Reports and analytics
Phase 5  Dashboard
Phase 6  HR modules
Phase 7  Forms and feedback
Phase 8  Responsive and accessibility
Phase 9  Final visual QA
```

## First Three Deliverables

The first implementation cycle should produce:

1. A single consistent token system.
2. A cleaned and reusable UI component layer.
3. A redesigned Reports page using the new system.

Do not begin with decorative gradients or animations. The highest-value improvements are consistency, hierarchy, tables, filters, charts, and clear action prioritization.

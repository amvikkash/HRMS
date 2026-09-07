# Vettri HRMS Phase 1 Foundation Audit

## Scope

This pass covers the active outer `Vettri_HRMS_Frontend` Vite application. Business logic, API contracts, authentication, authorization, routing behavior, and backend behavior were preserved.

## Completed

- Added canonical Vettri brand, spacing, radius, transition, and surface token names in `src/design-system/styles/tokens.css`.
- Mapped existing `hz-*` tokens to the canonical palette without removing the existing token API.
- Extracted employee dashboard metrics and widgets to `src/pages/dashboard/components/EmployeeWidgets.jsx`.
- Removed verified unused dashboard imports.
- Removed inert collapsed-sidebar state from `MainLayout`; the active `Sidebar` does not consume those props.
- Ran `npm install` and `npm run build` successfully.

## Navigation Findings For Phase 2

- `src/components/layout/navConfig.js` is the primary navigation source for the sidebar, settings navigation, and topbar search index.
- Dashboard and workforce contextual navigation remain hardcoded in `MainLayout.jsx`.
- Breadcrumb route labels are maintained separately in `Breadcrumbs.jsx`.
- These concepts should be reconciled in Phase 2, but were not changed in Phase 1 to avoid role or permission regressions.

## CSS Findings

- `src/components/ui/components.css` is approximately 7,679 lines and contains repeated historical blocks for topbar, sidebar, dashboard, and responsive rules.
- The active source contains 326 `!important` occurrences, 743 textual inline-style occurrences, and 88 media-query blocks.
- Static and dynamic inline styles need a JSX-aware pass. Dynamic geometry, data-driven colors, flyout positioning, and component sizing should remain inline where appropriate.
- The nested `Vettri_HRMS_Frontend/Vettri_HRMS_frontend` tree is a separate stale application copy with divergent source and dependencies. It was not modified or merged into the active project.

## Remaining Technical Debt

- Consolidate `components.css` by selector ownership and remove only reference-verified obsolete blocks.
- Split `Topbar.jsx` into search, notifications, account/workspace, and theme responsibilities.
- Split the remaining admin and employee dashboard presentation sections around stable data boundaries.
- Add a lint script before broad unused-code removal and inline-style migration.
- Replace Sass `@import` usage when upgrading the Bootstrap/Sass toolchain.
- Review the four `npm audit` findings separately; dependency upgrades may change runtime behavior.
- Add automated desktop/tablet/mobile visual regression coverage for the required screens.

# Import Settings Workspace

## Summary

`/settings/imports` is the tenant-scoped control surface for staged data migration. It explains the required import order, surfaces active setup blockers, and routes authorized staff into URL-owned batch workflows without weakening server-side migration gates.

## Page contract

- `settings/imports/imports-route.tsx` owns search parameters, permissions, migration readiness, table settings, data loading, and tRPC hydration.
- `imports-settings-view.tsx` owns the secondary navigation, overview copy, readiness presentation, blocker summary, import header, and table handoff.
- The shared imports layout owns route metadata; loading and error boundaries preserve the Imports navigation context and provide a safe retry path.
- Overview analytics are desktop-only. Below `md`, the page leads directly with the migration sequence and blockers.
- Migration sequence and blocker information use flat, divided rows rather than nested cards. Status pills remain paired with explicit row titles and explanations.
- The finance-remediation action is full-width and 44 pixels high below `md`, then returns to a compact inline action at desktop widths.

## Workflow and routing

- Imports remain ordered as historical finance setup, members and registries, historical records, then legacy-loan review and member backfill.
- Import creation, detail, review, and apply presentations remain URL-owned so refresh, back/forward navigation, and close behavior are deterministic.
- Existing permission, migration-window, historical-setup, member-profile, and backfill locks remain authoritative on the server.
- The global dashboard header resolves the Imports parent navigation title for both the overview and nested import routes.

## Verification

- Focused import conformance and navigation-title tests cover route boundaries, responsive analytics, flat overview sections, hydration ownership, URL-owned sheets, and nested parent-title resolution.
- Authenticated Portless QA covers 360, 390, 767, 768, and desktop widths, including page overflow, secondary-menu scrolling, analytics visibility, sidebar switching, and remediation-action sizing.

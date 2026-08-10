# Import Settings Workspace

## Summary

`/settings/imports` is the tenant-scoped control surface for staged data migration. It explains the required import order, surfaces active setup blockers, and routes authorized staff into URL-owned batch workflows without weakening server-side migration gates.

## Page contract

- `settings/imports/imports-route.tsx` owns search parameters, permissions, migration readiness, table settings, data loading, and tRPC hydration.
- `imports-settings-view.tsx` owns the secondary navigation, overview copy, readiness presentation, blocker summary, import header, and table handoff.
- Below `md`, the shared settings secondary navigation becomes a shadcn bottom sheet selector with one active destination, 44-pixel trigger and rows, safe-area padding, and a constrained scroll region. At `md` and above, the horizontal navigation remains visible. Nested routes use longest-path matching so the Imports overview and a child route cannot both appear active.
- The shared imports layout owns route metadata; loading and error boundaries preserve the Imports navigation context and provide a safe retry path.
- Overview analytics are desktop-only. Below `md`, the page leads directly with the migration sequence and blockers.
- Migration sequence and blocker information use flat, divided rows rather than nested cards. Status pills remain paired with explicit row titles and explanations.
- The finance-remediation action is full-width and 44 pixels high below `md`, then returns to a compact inline action at desktop widths.

## Workflow and routing

- Imports remain ordered as historical finance setup, members and registries, historical records, then legacy-loan review and member backfill.
- Import creation, detail, review, and apply presentations remain URL-owned so refresh, back/forward navigation, and close behavior are deterministic.
- Import workflows use a flat sheet surface without a nested form card. Below `md`, create, detail, and apply dialogs occupy the full viewport with their own vertical scroll region and 44-pixel primary controls; at `md` they return to the centered desktop presentation. Route-type mismatch is handled declaratively by keeping an incompatible child-route workflow closed, avoiding render-time query-param effects and Fast Refresh loops.
- Nested import tables use the same typed list input for server prefetch and client consumption, then read one Suspense infinite query without polling or manual cache seeding. Desktop renders the persisted virtual table; below `md`, the same query rows render as flat divided shadcn Items with action drawers. Loading follows the same breakpoint split, so phones never display a table skeleton.
- URL-selected import batches resolve through `imports.batch`, keeping review and apply workflows tenant-scoped and reliable when the selected row is filtered out or beyond the hydrated page. Stage, direct-import, and apply mutations invalidate import lists; member imports also invalidate the member directory.
- Existing permission, migration-window, historical-setup, member-profile, and backfill locks remain authoritative on the server.
- Collection-source imports are configuration-admin workflows. Their CSV parser preserves the canonical `externalReference` column, rejects case-insensitive duplicate source names before staging or writing, and applies creates/updates atomically. Review exposes name, human-readable type, external reference, existing-match state, and duplicate state. An existing source that has already been used by a collection-source contribution batch cannot have its type or external reference silently changed through migration import.
- Applying or directly importing collection sources refreshes contribution/source consumers as well as import history. The import creates or updates collection-source registry rows only; it never posts member deductions or contribution batches.
- The global dashboard header resolves the Imports parent navigation title for both the overview and nested import routes.

## Verification

- Focused import conformance, parser, query-input, database, and navigation-title tests cover route boundaries, responsive analytics, flat overview sections, Suspense hydration ownership, URL-owned batch detail, collection-source duplicate/history safeguards, mobile full-screen presentation, and nested parent-title resolution.
- Authenticated Portless QA covers 360, 390, 767, 768, and desktop widths, including page overflow, secondary-menu scrolling, analytics visibility, sidebar switching, and remediation-action sizing.

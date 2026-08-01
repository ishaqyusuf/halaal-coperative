# Business And Profit Workspace

## Purpose

The `/business` workspace is the cooperative's unified registry for planned, active, completed, and archived business pools. It supports both current operations and historical migration records without splitting ongoing businesses into a second page.

## Midday Page Contract

- The route prefetches the tenant-scoped business list, finance setup, and business summary before rendering the client workspace.
- The list uses the same typed input on the server and client, suspense infinite loading, and a `pageSize + 1` database read so `meta.cursor` and `meta.hasNextPage` only advertise a real next page.
- Desktop preserves the virtualized, draggable, resizable business table, sticky columns, URL-backed selection sheet, and permitted row actions.
- On screens below `md`, analytics and desktop column controls are hidden. The workspace shows search, an icon-only 44-pixel create action, filter/sort controls in a bottom drawer, a clear-filter action when filters are active, and flat divided business items.
- Loading follows the selected responsive presentation: mobile renders item skeletons and does not briefly mount the desktop table.
- Workflow sheet width configuration is authoritative: business review sheets use the configured 768-pixel desktop width and consume the complete viewport width on smaller screens instead of inheriting the base three-quarter-width sheet.

## Registry And Form Behavior

- The page and empty state use current operational language: `Business` and `No businesses have been recorded yet.`
- Creating a manual business supports planned or ongoing operations. Profit entries are optional because a business may be registered before a realized result exists.
- A profit entry may be added once evidence-backed results are available. Reviewed and published profit/allocation rules remain authoritative.
- The responsive profit editor presents numbered, divided entries with individual removal, evidence-oriented labels, a computed read-only shareable balance, and 44-pixel controls on mobile.
- Historical migration/backfill uses the same sheet and form composition with migration-specific `Profit history` language and source metadata.
- Ongoing and future businesses do not have a separate workspace. Status and source distinguish planned, active, completed, archived, manual, backfill, and import records in the unified registry.

## Domain And Access Rules

- Tenant and staff permissions are derived from authenticated dashboard context; the client cannot choose a tenant.
- Finance setup and migration locks continue to govern which mutations are available.
- Published allocations remain immutable through ordinary edit/delete actions.
- Export, allocation review, profit review, and permitted row actions remain available through the responsive workspace.

## Verification

- Focused conformance coverage checks route prefetching, shared query inputs, responsive controls/list/skeleton behavior, route boundaries, and the optional-profit live form.
- Database coverage checks real next-page cursor behavior.
- Dashboard, API, and database typechecks plus focused lint and live Portless viewport checks are required before page approval.

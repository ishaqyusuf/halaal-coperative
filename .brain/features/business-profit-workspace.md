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
- The business start-date filter uses the shared GND Sales Orders interaction: one canonical `dateRange` URL tuple, ordered relative-date suggestions, one two-boundary range calendar, and one formatted active chip across desktop and mobile controls.

## Registry And Form Behavior

- The page and empty state use current operational language: `Business` and `No businesses have been recorded yet.`
- Creating a manual business supports planned or ongoing operations. Profit entries are optional because a business may be registered before a realized result exists.
- A profit entry may be added once evidence-backed results are available. Reviewed and published profit/allocation rules remain authoritative.
- Business lifecycle dates and profit-sharing season dates are independent: an ongoing business may have started years earlier, but a new manual profit date must fall inside both the business lifecycle and the cooperative's current writable profit season, and it cannot be in the future.
- The create and standalone profit-entry sheets show the current season label, status, inclusive date range, and the date after which distribution review begins. The manual dividend-period selector is hidden because the server resolves and links the authoritative tenant season; historical backfill/import retains explicit period linkage.
- A scheduled annual, semi-annual, or quarterly season is created as a draft on the first valid manual profit when no exact period exists. Approved, published, closed, overlapping, unconfigured ad-hoc, and out-of-season periods fail closed.
- Multi-entry business creation resolves the current manual profit season once per transaction, validates every row against that shared result, and uses a bounded 15-second interactive transaction timeout so local database cold starts do not expire Prisma's five-second default window.
- The responsive profit editor is a flat form section separated from business details by a top divider, with no nested card surface. It presents numbered, divided entries with individual removal, evidence-oriented labels, a computed read-only shareable balance, and 44-pixel controls on mobile.
- The business detail sheet uses the same flat surface language: identity/status, a semantic divided financial summary, latest profit/season context, and a divided action footer render directly on the sheet without nested cards. Actions remain stacked, full-width, and 44 pixels tall through 767px, then become compact and right-aligned at `md`.
- Quick fill belongs to the complete Record business workflow, not the profit-entry subsection. It prepares one editable business draft—including identity, capital, dates, status, a linked dividend-period default when available, and profit rows—and never saves until the operator reviews and submits the form.
- The sheet submit action sits in a top-divided form footer: it remains full-width and touch-sized on mobile, then becomes intrinsic-width and right-aligned on wider screens.
- Historical migration/backfill uses the same sheet and form composition with migration-specific `Profit history` language and source metadata.
- Ongoing and future businesses do not have a separate workspace. Status and source distinguish planned, active, completed, archived, manual, backfill, and import records in the unified registry.

## Domain And Access Rules

- Tenant and staff permissions are derived from authenticated dashboard context; the client cannot choose a tenant.
- Finance setup and migration locks continue to govern which mutations are available.
- Published allocations remain immutable through ordinary edit/delete actions.
- A client-supplied dividend period cannot redirect a manual profit into another season. Historical period references must belong to the same tenant and contain the profit date.
- Export, allocation review, profit review, and permitted row actions remain available through the responsive workspace.

## Verification

- Focused conformance coverage checks route prefetching, shared query inputs, responsive controls/list/skeleton behavior, route boundaries, the optional-profit live form, and the card-free divided detail sheet.
- Database coverage checks real next-page cursor behavior, current-season auto-linking, one-time season resolution for multi-entry creation, old-business/current-profit acceptance, prior-season and future-date rejection, and cross-tenant historical period rejection.
- Dashboard, API, and database typechecks plus focused lint and live Portless viewport checks are required before page approval.

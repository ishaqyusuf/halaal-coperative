# Member Registry Workspace

## Purpose

The staff member workspace provides one tenant-scoped operating surface for finding members, creating or importing profiles, reviewing identity and financial history, printing statements, and completing historical migration.

## Routes

- `/members` is the primary member directory.
- `/members/[memberId]` is the complete staff detail workspace.
- `/members/[memberId]/statement` is the printable member statement.
- `/members/[memberId]/backfill` is the member historical migration workflow.
- `/settings/imports/members` is the full-page entry point for member imports; the members directory also exposes the same import workflow through URL-backed presentation state.

## Directory Contract

- The route parses member filters and sorting from URL state and builds one shared `members.list` input for server prefetch and client fetching.
- The route batch-prefetches the first infinite-query page and hydrates a Suspense-owned table. The client table does not poll or duplicate the first-page request.
- The registry summary uses the same tenant and filter scope as the table and returns complete total, mode-aware migration-finalized, active, KYC-attention, and linked-user counts. Its first card reads `Members / Brought forward` or `Members / Backfilled` from tenant policy and presents total members / finalized migration positions. KYC attention includes every non-verified KYC state rather than only the literal `pending` state.
- Member rows use cursor-based infinite loading, persisted column visibility/order/sizing, draggable and resizable headers, sticky columns, row navigation, and URL-backed row actions.
- The compact identity layout presents the member number and joined date together under the visible `# / Joined` heading as the first data column. The directory defaults to newest joined date first, and the combined header sorts on that date.
- A checkmark appears immediately after the member name only when the member's mode-specific migration evidence is applied: an applied opening position for brought-forward mode or complete applied backfill for historical mode. KYC remains visible in its dedicated column and does not control this migration checkmark.
- The `Migration setup status` column is migration-only: `Action required` for not-started required work, `In progress` for drafts, `Completed` for applied migration evidence, and `Not required` when historical backfill does not apply. The separate sortable `Member status` column shows the registry lifecycle state (`Pending`, `Active`, `Inactive`, `Suspended`, or `Exited`), while KYC remains in its own column and does not alter either status. The matching member-status filter is explicitly labeled `Member status`, while broader operational readiness remains enforced on detail and member-operation surfaces.
- Migration buttons and applied-state badges do not occupy the row action column. The compact action menu keeps secondary registry actions, while row/status navigation opens the member detail workspace where remediation context belongs.
- Shared virtual-table selection cells remove horizontal padding and center their checkbox wrapper so select-all controls align with every row checkbox across selectable tables.
- Pagination reads one row beyond the requested page size so `hasNextPage` and the next cursor are only returned when another row actually exists.
- Search, member type, member status, KYC status, mode-aware migration status (`pending` or `finalized`), joined-date range, and sort state remain URL-addressable. Joined date uses the shared GND Sales Orders preset rail and two-boundary calendar with one canonical `dateRange` tuple in desktop and mobile controls; member query inputs resolve that tuple to the existing joined boundaries only at the API edge.
- Below the `md` breakpoint, the summary cards and desktop table controls are hidden and the same directory query renders as a virtualized, flat shadcn Item list. Items have no individual card outline or gap; one-pixel row dividers provide separation. Member type stays with the identity metadata, while a compact semantic definition list labels `Migration setup`, `Member status`, and `KYC` beside their badges so the three status domains remain understandable without desktop column headings. Each row preserves member navigation, selection, joined date, the mode-aware migration checkmark, and permission-aware actions without mounting a second live query. While the client breakpoint is being resolved, responsive CSS renders the matching item skeleton below `md` and the table skeleton at `md` and above, preventing the desktop table from flashing during mobile loading.
- The phone toolbar keeps search visible, opens filter and sort controls in a bottom drawer, shows `Clear filters` only while URL controls are active, reduces member creation to an accessible plus control, and moves available secondary registry actions into a bottom drawer. Long member-create and import workflows remain focused sheet presentations.
- The mobile member-list scroll container controls the global workspace header by direction: scrolling down collapses the global header and top page gap, expands the list into the released 94 pixels, and keeps the members search/actions header at the viewport top; scrolling up reveals the global header again. Layout-driven scroll clamping during the 200ms transition does not count as an upward user gesture. The behavior stops below the `md` breakpoint so desktop header and table behavior remain unchanged.
- The empty state exposes member creation only to roles that can manage members. The no-results state clears typed URL filters without a hard navigation.
- Selected loaded rows expose a responsive bottom action bar and can be exported as CSV without mutating member records.

## Create, Detail, and Action Workflows

- Member creation remains a URL-backed workflow presentation launched from the registry header, including at phone widths.
- Member status, portal access, KYC, document upload/review, and commitment changes close their presentation after success and refresh or invalidate member data.
- Dialog-mode member actions use dialog title and description primitives; sheet-mode actions use sheet primitives.
- The full member detail remains a page rather than a customer-style detail sheet because it combines audited identity, KYC, commitment, contribution, financing, repayment, dividend, charge, document, and ledger evidence.
- The detail page places a verification alert directly below the member heading when readiness is incomplete. It lists the active-status, KYC, and migration blockers and routes authorized staff to the correct brought-forward or historical-backfill step.
- The member detail route has segment-level loading and retryable error boundaries around its server-owned database reads. The loading view mirrors the member header, readiness alert, two-column phone summary, and primary detail sections instead of exposing a blank route while the server data resolves.
- Detail navigation and secondary actions live in the page header. Phone widths keep `Member registry` visible and move statement, download, and portal-access actions into a bottom drawer; wider screens expose the same actions inline.
- Financial summary cards use a compact two-column phone grid and the full four-column desktop layout. Financial history rows stack at narrow widths while preserving the desktop multi-column layout.

## Statements

- The printable statement retains a route-level page because it supports browser printing and a direct statement-download action.
- The statement route uses a focused, tenant-scoped data loader for statement evidence only, with staff-role enforcement, a database-runtime unavailable state, and route-specific loading and retryable error boundaries.
- Summary, dividend, charge, and ledger sections use responsive dashboard surfaces rather than fixed-width tables. The section titles are semantic `h2` headings beneath the member-name `h1`.
- Phone spacing and heading scale are reduced without changing print behavior. Summary cards use a two-column phone grid, and both header actions provide 44-pixel touch targets below the desktop breakpoint.
- The statement intentionally remains an immutable document view: Midday sheet, edit-form, bulk-action, and activity-sidebar patterns do not apply because the route presents already-posted financial evidence.

## Member Migration

- Historical backfill preserves the canonical baseline, commitments, activity, loans, profit, review, and apply steps.
- Desktop uses the sticky step rail. Narrow screens expose the same status and navigation through a horizontally scrollable step list.
- Previous/next controls, URL-addressable steps, completion state, permission gates, and high-impact confirmation workflows remain unchanged.
- Brought-forward setup keeps its shorter current-position path and does not render irrelevant historical steps.
- The route owns Midday-style workflow metadata plus dedicated loading and retryable error boundaries. Invalid or mode-incompatible `step` values are redirected to the canonical active step without dropping URL-backed action-sheet state.
- Data loading is migration-mode aware: brought-forward skips historical amount logs, activity events, legacy loans, share purchases, profit configuration, collection sources, and historical draft construction.
- Backfill high-impact actions share the URL-backed member backfill sheet rather than a page-local modal. Phone controls remain at least 44 pixels tall below `md`, the workflow avoids nested main landmarks, and internal implementation labels are replaced by the user-facing setup states `Action required`, `In progress`, and `Completed`.
- A reversed opening position is no longer treated as final: authorized staff can stage its corrected replacement, while pending-review, approved, and applied positions remain guarded.
- Brought-forward readiness requires an applied opening position for every member. Historical readiness requires complete backfill for members who joined before the current month; current-month historical members are finalized without a redundant backfill. The same derived rule drives verification, summary counts, and pending/finalized table filters.

## Member Import

- The import workflow uses a wide dialog presentation with correct dialog accessibility semantics.
- Staff can configure and reorder columns, download the current Excel template, upload CSV/XLS/XLSX, edit rows in a scrollable grid, review existing matches and in-file duplicates, import immediately, or stage a batch.
- Successful imports invalidate the member infinite query; staged or direct imports invalidate the import-batch infinite query.
- Header controls, the editable grid, review gates, and footer actions adapt to phone widths without forcing the presentation beyond the viewport.

## Permissions and Isolation

- Tenant-wide member list and detail reads require an operations-officer-or-higher staff role and remain tenant scoped. Member-role accounts use their own member-scoped dashboard and statement flows.
- Management actions are shown only when the current role has the matching member, import, commitment, or collection-source permission.
- Member profile mutations continue to respect initial-migration and live-operation guards.
- Member operational readiness is derived without a schema snapshot: active registry status, verified KYC, and mode-aware migration evidence are evaluated from the current tenant and member records.

## Midday Conformance

- The registry follows the local Midday customers contract for server-prefetched infinite data, URL filters and sorting, Suspense ownership, configurable virtual tables, empty states, selection actions, and focused workflow presentations.
- Halaalvest-specific financial detail, printable statements, and historical migration remain dedicated pages because their audited cooperative context is materially deeper than the reference customer detail sheet.
- This feature implements the accepted dashboard architecture in ADR-007; it does not introduce a new architecture decision.

## Validation

- Focused database and dashboard tests cover summary accuracy, member migration guards, table backfill status, pagination boundaries, statement data, URL input normalization, and workflow presentation ownership.
- Dashboard TypeScript compilation, changed-file ESLint, Prettier, and diff whitespace checks must pass before completion.
- On 2026-07-29, focused member registry, error-boundary, URL-input, database-query, and Portless URL tests passed with 102 assertions across 37 test cases and no failures.
- On 2026-07-29, authenticated browser QA passed at `https://amanah.halaalvest-dash.localhost/members` on desktop and a 390×844 phone viewport: registry rows, URL search, filtered no-results and clear behavior, create presentation, mobile filter menu, row selection, and responsive bottom actions worked without page overflow or console warnings/errors.
- On 2026-07-29, the `# / Joined` sortable header correction was verified at `https://kaduna-reliable-health-workers-society-723.halaalvest-dash.localhost/members` on desktop and a 390×844 phone viewport with no browser errors.
- On 2026-07-29, the operational-readiness revision was verified on the same Portless tenant URL: the registry showed `Action required` for unverified active members, removed row-level migration buttons, reduced the action column to the overflow menu, corrected the KYC-attention summary, and rendered the member-detail verification alert responsively at 390×844.
- On 2026-07-29, the mode-aware migration summary/filter revision was verified on that Portless tenant URL: the brought-forward summary reported `6 / 3`, pending filtered to `3 / 0`, finalized filtered to `3 / 3`, both states persisted through `migrationStatus` in the URL, and the member-detail alert included the missing brought-forward position. Desktop and 390×844 browser QA had no page-level horizontal overflow or console errors.
- On 2026-07-29, the migration-indicator correction was verified on the same tenant: the three applied brought-forward members showed a checkmark and `Completed` even with KYC still `not started`, while the three unapplied members showed `Action required`. The KYC column remained independent, the separate filter label read `Member status`, 390×844 rendering had no page overflow, and a stable Portless reload produced no new browser errors.
- On 2026-07-29, the directory status split was verified on the same Portless tenant URL: `Migration setup status`, sortable `Member status`, and `KYC` appeared as independent columns on desktop and at 390×844, with no page-level horizontal overflow or browser errors.
- On 2026-07-29, the mobile-first directory revision was verified at `https://kaduna-reliable-health-workers-society-723.halaalvest-dash.localhost/members`: 360×800, 390×844, and 767px widths rendered the virtualized Item list without analytics, a desktop table, or horizontal overflow; 768px restored the analytics and table. URL-backed filter/apply/clear, bottom-drawer page and row actions, icon-only member creation, migration checkmarks, and mobile bulk selection were exercised, while the 1604×994 desktop contract remained intact.
- On 2026-07-29, the mobile Item presentation was flattened on the same Portless tenant URL: browser QA confirmed zero-width item outlines, one-pixel row dividers, six rows, and no horizontal overflow at 360×800 and 390×844, while the 1604×994 desktop table remained unchanged.
- On 2026-07-30, direction-aware mobile header QA passed on the same Portless tenant URL at 360×800, 390×844, 430×932, and 767×900. Three repeated down/up cycles plus a near-bottom scroll-clamp cycle hid the global header on downward gestures, kept the members page controls at `top: 0`, expanded the list by 94 pixels, and restored the global header on upward gestures without horizontal overflow or browser console warnings/errors. At 768×900 and 1604×994, the desktop table and global header remained unchanged.
- On 2026-07-30, the compact mobile status block and loading fallback were verified at the same Portless tenant URL. At 360×800 and 390×844, each row kept member type with identity and presented labeled `Migration setup`, `Member status`, and `KYC` values without horizontal overflow; a live reload showed only the flat item skeleton during loading and never exposed the desktop table. At 1604×994, the six-column desktop table remained unchanged, and browser logs contained no warnings or errors.
- On 2026-07-30, `/members/f547dd43-ce66-4023-af55-84ddd7b803b3` completed its Midday customer-detail adaptation: route loading/error isolation, compact header actions, a phone bottom drawer, and a two-column phone summary were verified at 360×800, 390×844, 767×900, 768×900, and 1604×994. The member-actions drawer plus URL-backed KYC and portal-access presentations opened correctly, no tested width produced horizontal overflow, and browser logs contained no warnings or errors.
- On 2026-07-30, `/members/f547dd43-ce66-4023-af55-84ddd7b803b3/backfill?step=brought-forward` completed its Midday onboarding adaptation. Focused conformance and migration tests passed, dashboard typecheck and lint passed, and authenticated Portless QA at 360, 390, 767, 768, 1024, and 1440 pixel widths confirmed canonical step routing, mode-appropriate content, shared action sheets, 44-pixel phone targets, zero horizontal overflow, no nested main landmarks, and no application console errors.

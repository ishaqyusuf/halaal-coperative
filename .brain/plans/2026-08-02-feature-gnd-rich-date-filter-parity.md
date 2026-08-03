# GND Rich Date Filter Parity

## Status

- Feature: GND-style rich date filtering
- Status: Implemented and verified
- Created: 2026-08-02
- Reference: GND Sales Orders at `/Users/M1PRO/Documents/code/_turbo/gnd/apps/dashboard/src/app/(sidebar)/(sales)/sales-book/orders`

## Goal

Replace separate date-boundary controls with the GND Sales Orders interaction: one filter, a suggestion rail, and one range calendar that selects two boundaries. Apply the same contract to Business, Members, Contributions, Repayments, Reports, and Audit.

## Architecture

1. `packages/utils/src/date-filter.ts` owns the canonical preset vocabulary, display labels, tuple validation, and deterministic preset-to-boundary resolution.
2. The URL owns one `dateRange` array. A preset is encoded as `[preset]`; an explicit range as `[from, to]`; and an open boundary uses `-`, for example `[from, "-"]` or `["-", to]`.
3. `apps/dashboard/src/components/search-filter/date-range-filter.tsx` owns the shared GND-style UI: the ordered preset rail, selected-state indicator, dynamically loaded range calendar, and loading skeleton.
4. Search-filter metadata uses `date-range` with the canonical `dateRange` key. Desktop popovers and mobile drawers render the same shared control.
5. Page hooks only parse and write `dateRange`. They do not retain `from`, `to`, `joinedFrom`, `joinedTo`, `startFrom`, or `startTo` compatibility URL parameters.
6. Presets remain semantic in the URL and are resolved at each server/client query boundary. Existing API and database inputs keep their domain-specific boundary names so this UI migration does not broaden into an API rewrite.
7. Report export links preserve the canonical tuple and export routes resolve it to inclusive start/end `Date` values.

## Preset Contract

The suggestion order and labels match GND Sales Orders:

- Yesterday
- Today
- This week
- Last week
- This month
- Last month
- Last 2 months
- Last 3 months
- Last 6 months
- Over a month
- Over 3 months
- Over 6 months

Previous-month presets cover complete calendar months and exclude the partial current month. `Over …` presets are open-ended through the last day before the excluded recent-month window.

## Migration Inventory

- Business start date: custom desktop filter, mobile drawer, active chip, and list query input.
- Member joined date: shared search filter, mobile drawer, active chip, list/query input, and URL path builder.
- Contribution date: filter metadata, route prefetch, infinite ledger query, and current-month staged-row condition.
- Repayment due date: filter metadata and repayment schedule query.
- Reporting period: report summary, export links, and all CSV export date boundaries.
- Audit activity date: filter metadata, server-seeded infinite query, and client table query.

## Verification

- Utility tests cover preset order, labels, exact calendar boundaries, leap years, year rollover, explicit ranges, open ranges, invalid input, and reversed ranges.
- Dashboard conformance tests assert the shared GND control, canonical URL key across every migrated workspace, and shared metadata integration.
- Existing member and business conformance tests are updated to require the shared control.
- Completion requires utility/dashboard TypeScript checks, focused tests, changed-file lint/format checks, and an inventory scan proving that no target filter still exposes a legacy date URL key or local range calendar.
- Verification completed on 2026-08-02: dashboard, API, database, and utility TypeScript checks passed; dashboard, utility, and database lint completed with zero errors (the existing warning backlog remains); 137 dashboard/utility tests passed; Prettier and `git diff --check` passed; and the inventory scan found one range calendar—the shared control—and no legacy date URL parser or date-filter metadata key in the migrated workspaces.

## Out Of Scope

- Single-date form fields such as purchase dates, evidence dates, and workflow deadlines remain ordinary form inputs.
- Existing API/router/database boundary field names are not renamed because they are internal typed query contracts rather than public filter URL state.
- No Prisma schema or migration change is required.

# Plan: Midday Dashboard Table Core Parity

## Type

Feature

## Status

In Progress

## Created Date

2026-06-30

## Last Updated

2026-06-30

## Goal Or Problem

Bring the dashboard table system to full Midday-style parity across all important operational tables, starting with the shared `tables/core` layer and then migrating members and the remaining domain tables onto the same TanStack, persisted settings, URL sort/filter, sticky column, virtualization, and infinite-scroll architecture.

## Current Context

The dashboard already uses a Midday-style `apps/dashboard/src` structure with route-owned pages, domain table folders, and shared dashboard composition helpers. The earlier finance-specific Brain plan, `brain/plans/2026-06-21-feature-midday-table-filter-sheet-refactor.md`, tracks the finance table/filter/sheet rollout.

This plan tracks the broader table-core parity migration requested on 2026-06-30. Phase 0-4 are complete:

- Phase 0 confirmed the current table contract and identified the static table wrappers that had to be kept available for legacy consumers during the migration.
- Phase 1 installed the Midday table runtime dependencies in `apps/dashboard/package.json` and `bun.lock`: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@tanstack/react-table`, `@tanstack/react-virtual`, `framer-motion`, `react-hotkeys-hook`, `zustand`, `date-fns`, and `lucide-react`.
- Phase 2 restored the advanced Midday-compatible `apps/dashboard/src/components/tables/core` export surface while preserving legacy static wrappers in `apps/dashboard/src/components/dashboard/static-table.tsx`.
- Phase 3 added the remaining Midday support primitives: table settings persistence, initial settings loading, DnD, horizontal scroll, infinite scroll, sort URL params, scroll-header behavior, draggable headers, resize handles, and horizontal pagination.
- Phase 4 tightened the canonical table settings/config coverage for the planned operational table migration targets, including default hidden columns, sticky columns, sort maps, non-reorderable columns, row heights, and summary heights.
- Table support primitives now exist in `apps/dashboard/src/components/portal.tsx`, `apps/dashboard/src/hooks/use-sticky-columns.ts`, `apps/dashboard/src/utils/table-settings.ts`, `apps/dashboard/src/utils/table-configs.ts`, `apps/dashboard/src/utils/columns.ts`, `apps/dashboard/src/actions/update-table-settings-action.ts`, and the new table behavior hooks/components.

The members table and most feature tables still need to be migrated from static page-fed tables to the full Midday query/table runtime.

## Proposed Approach

Complete the rollout in staged phases. Keep `tables/core` as the reusable Midday-compatible table atom layer, keep old static wrappers outside `tables/core`, add the remaining support hooks/components, then convert members first as the pilot domain before repeating the pattern across contributions, finance, imports, loans, approvals, notifications, and audit/reporting tables.

Do not migrate every domain table in the same edit. Each table migration should move through schema/query, tRPC/API contract, URL params, columns/header, table body, empty/skeleton/no-results states, and focused validation.

## Visual Plan

```mermaid
flowchart TD
  P0["Phase 0: Contract audit (Done)"] --> P1["Phase 1: Runtime dependencies (Done)"]
  P1 --> P2["Phase 2: Table core parity (Done)"]
  P2 --> P3["Phase 3: Support primitives (Done)"]
  P3 --> P4["Phase 4: Table IDs and settings (Done)"]
  P4 --> P5["Phase 5: Data contracts (Next)"]
  P5 --> P6["Phase 6: Members pilot"]
  P6 --> P7["Phase 7: Feature table rollout"]
  P7 --> P8["Phase 8: Retire legacy static consumers"]
  P8 --> P9["Phase 9: QA and hardening"]
```

## Implementation Steps

### Phase 0: Contract Audit

- Status: Done
- Outcome: Reviewed local table consumers, the previous static `DashboardTable*` exports, and the Midday table reference shape. Confirmed the migration needed a compatibility split instead of deleting old static table APIs.

### Phase 1: Runtime Dependencies

- Status: Done
- Outcome: Added the runtime packages required by Midday table behavior to `apps/dashboard/package.json` and `bun.lock`.

### Phase 2: Replace Tables Core With Midday-Compatible Core

- Status: Done
- Outcome: `apps/dashboard/src/components/tables/core/index.ts` now exposes the advanced core table atoms/types/helpers, and legacy static wrappers live in `apps/dashboard/src/components/dashboard/static-table.tsx`.
- Outcome: Direct legacy imports from `@/components/tables/core` were removed from the scanned dashboard app/components surface.

### Phase 3: Add Remaining Midday Support Primitives

- Status: Done
- Outcome: Created the missing server action and hooks that sit around the core table:
  - `apps/dashboard/src/actions/update-table-settings-action.ts`
  - `apps/dashboard/src/hooks/use-table-settings.ts`
  - `apps/dashboard/src/hooks/use-table-dnd.ts`
  - `apps/dashboard/src/hooks/use-table-scroll.ts`
  - `apps/dashboard/src/hooks/use-infinite-scroll.ts`
  - `apps/dashboard/src/hooks/use-sort-params.ts`
  - `apps/dashboard/src/hooks/use-sort-query.ts`
  - `apps/dashboard/src/hooks/use-scroll-header.ts`
- Outcome: Created the missing table helper components:
  - `apps/dashboard/src/components/tables/draggable-header.tsx`
  - `apps/dashboard/src/components/tables/resize-handle.tsx`
  - `apps/dashboard/src/components/horizontal-pagination.tsx`
- Outcome: Added `apps/dashboard/src/utils/columns.ts` for Midday-style initial table settings loading.
- Outcome: Kept Phase 3 scoped to support primitives. The members page conversion remains a later phase.

### Phase 4: Define Canonical Table IDs, Settings, And Config Coverage

- Status: Done
- Outcome: Audited `apps/dashboard/src/utils/table-settings.ts` and `apps/dashboard/src/utils/table-configs.ts` against the current domain table files and route-owned static table surfaces that will migrate.
- Outcome: Kept canonical `TableId` coverage focused on members, contributions, charges, shares, business, imports, loan portfolio, loan requests, membership approvals, notifications, and audit.
- Outcome: Updated sticky columns, non-reorderable columns, sort maps, default hidden columns, row heights, and summary heights so later domain migrations consume a stable config contract.

### Phase 5: Migrate Data Contracts To Midday Query Shape

- Status: Next
- Add typed API schemas where table inputs cross app boundaries.
- Move table listing APIs toward Midday-style input contracts: cursor or pagination, page size, search, filters, sort field, sort direction, and table-specific metadata.
- Keep reusable DB logic in `packages/db/src/queries/*`.
- Keep route handlers thin and tenant scoped.

### Phase 6: Members Pilot Table

- Status: Planned
- Convert the members page first because it was the original target and has enough filters to prove the pattern.
- Update members list data to support URL filters, sorting, table metadata, persisted settings, sticky columns, no-results/empty states, and row actions through the new core table runtime.
- Keep server-first page composition, but use tRPC hydration/client hooks where Midday's table pattern requires interactive query state.

### Phase 7: Migrate All Feature Tables

- Status: Planned
- Repeat the proven members pattern across contributions, charges, shares, business, imports, loan portfolio, loan requests, membership approvals, notifications, audit, reports, and any remaining list-heavy dashboard screens.
- Migrate one domain at a time with its columns, header, row actions, empty states, skeleton, filter params, sort params, and query contract.

### Phase 8: Retire Legacy Static Consumers

- Status: Planned
- Replace remaining uses of `apps/dashboard/src/components/dashboard/static-table.tsx` where Midday parity is required.
- Keep static wrappers only for genuinely simple read-only admin surfaces, or delete them after all consumers migrate.
- Ensure `apps/dashboard/src/components/tables/core` remains advanced-table-only.

### Phase 9: QA, Hardening, And Documentation Sync

- Status: Planned
- Run focused lint/typecheck for migrated files and broader dashboard checks when shared contracts change.
- Browser-test desktop and mobile table behavior for sticky columns, resizing, column reordering, keyboard interaction, no-results, empty state, and pagination/infinite loading.
- Update Brain docs after each major domain slice.

## Affected Files Or Areas

- `apps/dashboard/package.json`
- `bun.lock`
- `apps/dashboard/src/components/tables/core/*`
- `apps/dashboard/src/components/dashboard/static-table.tsx`
- `apps/dashboard/src/components/tables/<domain>/*`
- `apps/dashboard/src/components/tables/draggable-header.tsx`
- `apps/dashboard/src/components/tables/resize-handle.tsx`
- `apps/dashboard/src/components/horizontal-pagination.tsx`
- `apps/dashboard/src/actions/update-table-settings-action.ts`
- `apps/dashboard/src/hooks/use-table-settings.ts`
- `apps/dashboard/src/hooks/use-table-dnd.ts`
- `apps/dashboard/src/hooks/use-table-scroll.ts`
- `apps/dashboard/src/hooks/use-infinite-scroll.ts`
- `apps/dashboard/src/hooks/use-sort-params.ts`
- `apps/dashboard/src/hooks/use-sort-query.ts`
- `apps/dashboard/src/hooks/use-scroll-header.ts`
- `apps/dashboard/src/hooks/use-members-filter-params.ts`
- `apps/dashboard/src/utils/table-settings.ts`
- `apps/dashboard/src/utils/table-configs.ts`
- `apps/dashboard/src/utils/columns.ts`
- `apps/dashboard/src/trpc/server.tsx`
- `apps/dashboard/src/trpc/client.tsx`
- `apps/api/src/routers/*.route.ts`
- `apps/api/src/schemas/*`
- `packages/db/src/queries/*`
- `brain/plans/2026-06-21-feature-midday-table-filter-sheet-refactor.md`

## Acceptance Criteria

- `apps/dashboard/src/components/tables/core` matches the advanced Midday table-core role and does not export legacy static wrappers.
- All migrated tables use TanStack column definitions, shared Midday-style table primitives, persisted column settings, sortable headers, sticky columns where configured, and domain-owned columns/header/table files.
- Members is completed first and becomes the reference implementation for the rest of the dashboard.
- Every migrated table has intentional empty, no-results, skeleton/loading, pagination or infinite-scroll, filter, sort, and row-action behavior.
- Table data contracts are typed at API boundaries and tenant scoped in DB query modules.
- Brain plan and task status stay current after each phase.

## Test Plan

- Run `git diff --check` after each phase.
- Run focused lint on changed dashboard files, for example `bun run lint -- src/hooks/use-table-settings.ts src/hooks/use-table-dnd.ts src/components/tables/draggable-header.tsx`.
- Run focused dashboard typecheck after shared table contracts change: `bun run typecheck` from `apps/dashboard`.
- For migrated domain tables, verify filter and sort URL params, persisted table settings cookie behavior, sticky columns, reorder/resize interaction, loading states, empty states, and no-results states.
- Browser QA the members pilot before migrating the rest of the feature tables.

## Risks / Edge Cases

- The current dashboard has several static or server-fed tables, so direct Midday parity will require data contract work, not only component replacement.
- Some tables may need cursor-based or metadata-rich DB queries before the UI can match Midday behavior cleanly.
- Persisted column settings must tolerate renamed columns and table-specific defaults.
- Typecheck may be resource-heavy in this workspace; narrow validation should be used while editing, with broader checks before landing.

## Open Questions

- None.

## Linked Task

- Task Title: Port Dashboard Tables To Midday Core Parity
- Task File: brain/tasks/in-progress.md

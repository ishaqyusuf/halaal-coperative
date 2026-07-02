# Plan: Business Profit Operations Workspace

## Type
Feature

## Status
Done

## Created Date
2026-07-02

## Last Updated
2026-07-02

## Intake
- Intake File: brain/intake/2026-07-02-business-profit-and-policy-workspaces.md
- Intake Item: Add a Business main page because Loans already has a sidenav workspace.

## Goal Or Problem
Finance staff need a first-class Business workspace in the main Finance sidenav, parallel to Loans, for managing cooperative business pools, reviewed profit, pending allocations, distribution periods, and audit-sensitive profit actions. The current `/settings/finance/business` page is a settings/migration-oriented surface, not the daily operational workspace.

## Current Context
The dashboard already has a main `/loans` route in the Finance sidenav. The navigation registry has Finance sections for Collections and Credit, but no Business or Profit section. Business records already exist through `ShareBusiness`, `ShareBusinessProfitEntry`, `ShareBusinessProfitExpenseLine`, `ShareProfitAllocation`, `DividendPeriod`, and migration profit adjustment models. The operating model requires profit allocation to be tied to actual cooperative business or investment results, and the dashboard KPI framework expects share/profit position and pending profit review to be visible.

## Proposed Approach
Add a main `/business` route under `apps/dashboard/src/app/(app)/(sidebar)/business/page.tsx` and add a `Business` link to the Finance sidenav. The page is an operational workspace, not a settings page. It uses compact Midday-style dashboard composition, loads tenant-scoped business/profit data through the existing finance setup query, and exposes actions or links for reviewing business profit entries, allocation previews, and distribution-period status.

Keep `/settings/finance/business` for policy settings. The `/business` page focuses on "what needs action now": draft profit entries, unreviewed expenses, allocatable profit, pending allocations, published distributions, and any blocked or incomplete profit records.

## Implementation Steps
- Add a Finance sidenav section or item for `Business` using the existing navigation registry pattern.
- Add a protected `/business` route with database-runtime fallback behavior consistent with `/loans`.
- Create or reuse a loader under `apps/dashboard/src/lib/business` that keeps route files thin.
- Add a tenant-scoped query such as `getBusinessWorkspaceSummary` or `listBusinessWorkspaceRows` in `packages/db/src/queries/tenant-finance.ts` or a focused `business.ts` query module.
- Return a DTO with summary metrics: active business capital, reviewed profit, allocatable profit, pending allocation count, published distribution count, and blocked/missing-review count.
- Render business pools, profit entries, and distribution periods with compact tables/lists and action-first empty states.
- Link settings-only actions back to `/settings/finance/business` instead of duplicating policy/history setup in the main workspace.
- Update project Brain docs after implementation to record `/business` as the operational business-profit route.

## Affected Files Or Areas
- `apps/dashboard/src/lib/navigation/registry.ts`
- `apps/dashboard/src/app/(app)/(sidebar)/business/page.tsx`
- `apps/dashboard/src/lib/business/*`
- `apps/dashboard/src/components/business-*` or `apps/dashboard/src/components/business/*`
- `apps/dashboard/src/components/tables/business/*`
- `packages/db/src/queries/tenant-finance.ts` or `packages/db/src/queries/business.ts`
- `packages/db/src/queries/tenant-finance.test.ts` or focused business query tests
- `brain/PROJECT_INDEX.md`
- `brain/product/admin-dashboard-kpi-framework.md`

## Acceptance Criteria
- Finance sidenav includes a visible `Business` link for finance-management roles.
- `/business` renders a database-runtime fallback when the database is unavailable.
- `/business` shows tenant-scoped summary metrics for business capital, reviewed profit, allocatable profit, pending allocations, and published distributions.
- `/business` separates operational profit work from `/settings/finance/business` setup/history work.
- Every visible business/profit row is tenant-scoped and links to the action or detail surface that resolves it.
- The page does not introduce guaranteed returns, interest-like language, or non-auditable profit allocation shortcuts.

## Test Plan
- Run `bun run --cwd apps/dashboard typecheck`.
- Run focused database query tests for the new business workspace query.
- Manually open `/business` as tenant admin and finance officer and confirm the nav link appears.
- Manually confirm operations officer or member roles do not receive unauthorized business-profit controls.
- Manually confirm setup links route to `/settings/finance/business`.

## Brain Update Requirements
- Update `brain/PROJECT_INDEX.md` with the `/business` route.
- Update `brain/product/admin-dashboard-kpi-framework.md` if the business workspace changes the dashboard/share-profit action model.
- Update `brain/progress.md` if that file is used during the implementation run.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Yes
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: Yes

## Completion Report Requirements
Lower agent must report:
- Changed files
- Checks run
- Brain docs updated
- Unresolved issues
- Any skipped acceptance criteria

## Risks / Edge Cases
- Avoid duplicating the existing settings/migration table behavior in the main workspace.
- Profit allocations must remain tied to reviewed profit entries and share-balance basis snapshots.
- Published allocations should not be silently rewritten by later edits.
- Business/profit wording must not imply guaranteed dividends.

## Open Questions
- Resolved: Finance sidenav label is `Business`.

## Linked Task
- Task Title: Business Profit Operations Workspace
- Task File: brain/tasks/roadmap.md

# Plan: Financing Settings Workspace

## Type
Feature

## Status
Done

## Created Date
2026-07-08

## Last Updated
2026-07-08

## Intake
- Intake File: brain/intake/2026-07-08-monthly-financing-cycle-loan-settings.md
- Intake Item: Add a standard admin configuration surface for monthly loan capacity, quick/normal allocation, terms, reserves, and safeguards.

## Goal Or Problem
Tenant admins and finance officers need a clear settings workspace for configuring monthly financing policy instead of editing hard-coded defaults or relying on manual loan-form tracking. The settings should be visible, role-guarded, auditable, and understandable to cooperative operators.

## Current Context
The dashboard already has a finance settings route and an existing `/settings/finance/loan` entry, but that surface currently leans toward historical loan setup and migration. Live loan operations are handled through `/loans`. Existing architecture uses thin dashboard routes, DB query helpers, tRPC dashboard actions, shared form primitives, and audit-backed finance changes.

## Proposed Approach
Upgrade the finance loan settings area into a live financing policy workspace while preserving existing historical loan migration access. The workspace should show current policy, current-month capacity preview, quick/normal allocation, product caps, reserve buffer, dual approval, and cycle controls.

Settings to expose:
- Capacity basis: projected active monthly commitments for v1.
- Quick loan allocation percentage, default `30`.
- Normal loan allocation percentage, default `70`.
- Quick loan maximum term, default `3` months.
- Normal loan maximum term, default `18` months.
- Tenant eligibility multiple, default `2x` savings.
- Reserve buffer/deployable-funds threshold.
- Dual approval requirement.
- Strict intake reservation by submitted request amount.
- Disbursement requires deployable funds.
- Active quick and normal loan products with name, type, term cap, savings multiple, and active state.

Cycle controls:
- Preview current-month cycle from active commitment plans.
- Open the cycle to snapshot capacity.
- Pause intake when quota or governance requires it.
- Close the cycle at month end or when admins intentionally stop intake.

## Implementation Steps
- Add DB/action helpers for reading and updating financing policy, loan products, and financing-cycle controls.
- Add tRPC dashboard actions for:
  - updating tenant financing policy fields;
  - creating/updating quick and normal loan products;
  - opening, pausing, and closing the current monthly financing cycle.
- Restrict policy/product/cycle mutations to tenant admin and finance officer roles.
- Rework `/settings/finance/loan` to present live financing policy first, with any legacy migration content clearly separated or linked.
- Add forms using shared UI form primitives and existing `useZodForm` patterns.
- Validate policy inputs on both client and server:
  - percentages are nonnegative and total `100`;
  - term months are positive integers;
  - reserve amount is nonnegative;
  - eligibility multiples are positive;
  - cycle status transitions are explicit and audit logged.
- Show a current-month preview with projected commitments, reserve, quick budget, normal budget, actual collections, and warnings when actual deployable funds are below projected capacity.
- Keep route files thin and move read aggregation into `packages/db/src/queries/*`.

## Affected Files Or Areas
- `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/loan/page.tsx`
- `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/finance-route.tsx`
- `apps/dashboard/src/components/tenant-finance-page-view.tsx`
- `apps/dashboard/src/components/forms/tenant-finance-forms.tsx`
- `apps/dashboard/src/lib/dashboard-actions.ts`
- `apps/api/src/routers/dashboard-actions.route.ts`
- `packages/db/src/queries/tenant-finance.ts`
- `packages/db/src/queries/loans.ts` or `packages/db/src/queries/financing-cycles.ts`
- `brain/features/core-cooperative-platform.md`
- `brain/product/admin-dashboard-kpi-framework.md`

## Acceptance Criteria
- Tenant admins and finance officers can view financing policy settings from `/settings/finance/loan`.
- Authorized users can update allocation percentages, terms, reserve buffer, eligibility multiple, dual approval, and active product settings.
- Saving invalid percentages, negative reserves, or invalid terms is blocked with clear validation.
- Every policy, product, or cycle status change creates an audit log.
- The settings page shows a current-month capacity preview before and after a cycle is opened.
- The settings page distinguishes projected capacity from actual deployable funds.
- Existing historical loan migration functionality remains accessible and is not silently mixed with live policy changes.

## Test Plan
- Add DB tests for financing policy update validation and audit creation.
- Add action/router tests where the existing test pattern supports dashboard actions.
- Manual dashboard check: update allocation percentages, open a cycle, pause a cycle, close a cycle, and verify the preview changes.
- Manual role check: non-finance roles cannot mutate policy or cycle status.
- Run targeted tests for DB query helpers and any existing dashboard action tests touched by the implementation.

## Brain Update Requirements
- Update `brain/features/core-cooperative-platform.md` with the final settings behavior.
- Update `brain/product/admin-dashboard-kpi-framework.md` if new dashboard/setup warnings are added.
- Update `brain/api/permissions.md` if role enforcement changes materially.
- Update `brain/progress.md` and task files after implementation.

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
- Existing `/settings/finance/loan` content may contain migration-only assumptions; preserve it or move it intentionally instead of deleting operator workflows.
- Policy changes must not mutate existing approved or disbursed loans.
- Operators may confuse projected commitments with cash available; UI copy should label both numbers plainly.
- Cycle controls should prevent accidental re-opening or closing without an audit note if the implementation requires notes.

## Open Questions
- None. Use `/settings/finance/loan` as the live financing settings surface and keep historical loan migration visibly separate.

## Linked Task
- Task Title: Financing Settings Workspace
- Task File: brain/tasks/roadmap.md

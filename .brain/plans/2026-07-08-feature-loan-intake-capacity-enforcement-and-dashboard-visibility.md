# Plan: Loan Intake Capacity Enforcement And Dashboard Visibility

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
- Intake Item: Enforce monthly quick/normal loan quota limits and show capacity usage on loan and dashboard surfaces.

## Goal Or Problem
Admins need the system to stop request intake when the monthly quick or normal quota is reached, and they need visibility into remaining capacity before approving or disbursing financing. Approval must not imply guaranteed disbursement; actual deployable funds remain the final safety check.

## Current Context
Loan request submission already validates active member, active loan product, requested term, savings-multiple eligibility, estimated servicing, and loan-request charges. Review and disbursement are separate steps. Dashboard metrics already expose available pool and loan risk summaries. The missing behavior is monthly cycle capacity enforcement and quota visibility by quick/normal product type.

## Proposed Approach
Apply the monthly financing cycle model to request submission, review, disbursement, and dashboard summaries.

Capacity rules:
- Only `submitted`, `under_review`, and `approved` live requests consume intake reservation.
- `rejected`, `cancelled`, and `expired` requests do not consume remaining intake capacity.
- Disbursed loans consume disbursed capacity for reporting.
- Strict v1 rule: block new submitted requests when the requested amount exceeds remaining allocation for the selected loan product type.
- If a cycle is paused or closed, block new request submission for that cycle.
- If no cycle is open, either create a draft preview and require opening before submission, or block submission with a setup warning. Default behavior: block submission until the current cycle is open.
- Disbursement must block when principal exceeds actual deployable funds after reserves, active holds, pending approved disbursements, and ring-fenced amounts are excluded.

Visibility rules:
- Show projected monthly commitment capacity separately from actual collection/deployable-funds position.
- Show quick and normal budget usage: budget, requested, approved, disbursed, remaining.
- Surface quota-closed, cycle-paused, and insufficient-deployable-funds warnings on the loan workspace and overview/dashboard metrics.

## Implementation Steps
- Update loan request submission to resolve the current monthly financing cycle and selected product loan type.
- Add a capacity check before creating a request:
  - cycle must be open;
  - selected product type must have remaining intake capacity;
  - requested amount must not exceed remaining allocation.
- Store relevant cycle/policy snapshots on the request if the data model added snapshot fields; otherwise include the cycle id and audit metadata.
- Update loan review and disbursement flows to include capacity and deployable-funds context in warnings/audit metadata.
- Tighten disbursement guard so approved loans are blocked when deployable funds are insufficient.
- Update loan page data loaders and tables to include cycle budget usage, product availability, and blocked/closed intake states.
- Update overview/dashboard read models to include monthly financing cycle health in exception-led metrics and action queues.
- Add reporting/export fields only if existing report queries already expose loan summaries; otherwise keep reporting to dashboard/loan workspace in this slice.

## Affected Files Or Areas
- `packages/db/src/queries/loans.ts`
- `packages/db/src/queries/dashboard.ts`
- `packages/db/src/queries/financing-cycles.ts` if created by the model plan
- `apps/dashboard/src/lib/loans/load-loans-page.ts`
- `apps/dashboard/src/components/loans-page-view.tsx`
- `apps/dashboard/src/components/forms/finance-forms.tsx`
- `apps/dashboard/src/components/tables/loans/requests-table.tsx`
- `apps/dashboard/src/components/tables/loans/portfolio-table.tsx`
- `apps/api/src/routers/dashboard-actions.route.ts`
- `brain/product/admin-dashboard-kpi-framework.md`
- `brain/features/member-commitments-and-payment-allocation.md`

## Acceptance Criteria
- New quick loan requests are blocked when the quick allocation for the open monthly cycle is exhausted.
- New normal loan requests are blocked when the normal allocation for the open monthly cycle is exhausted.
- Rejected, cancelled, and expired requests release intake capacity.
- A paused or closed financing cycle blocks new request submission with a clear reason.
- Approval remains possible only through the existing review flow and does not guarantee disbursement.
- Disbursement is blocked when actual deployable funds are insufficient, even if projected monthly capacity remains.
- The loan workspace shows quick/normal budget, requested amount, approved amount, disbursed amount, and remaining capacity for the active cycle.
- Overview/dashboard metrics show financing-cycle warnings or action counts when intake is closed, paused, over-requested, or blocked by deployable funds.
- All enforcement is tenant-scoped and audit metadata explains blocked or approved decisions where applicable.

## Test Plan
- Add loan request tests for quick and normal product allocation exhaustion.
- Add tests proving rejected/cancelled/expired requests do not consume remaining capacity.
- Add tests proving submission is blocked when the current cycle is paused, closed, or missing.
- Add disbursement tests proving approved loans are blocked when deployable funds are below principal.
- Add dashboard query tests for cycle budget usage and warning counts.
- Manual dashboard check: open a cycle, submit requests until quota is exhausted, verify the request form/table warning, reject one request, and verify remaining capacity returns.

## Brain Update Requirements
- Update `brain/product/admin-dashboard-kpi-framework.md` with financing-cycle visibility and warnings.
- Update `brain/features/member-commitments-and-payment-allocation.md` if request or disbursement workflow details change.
- Update `brain/features/core-cooperative-platform.md` with quota enforcement behavior.
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
- Concurrent request submissions can oversubscribe capacity unless the implementation uses a transaction or locking strategy around the capacity check.
- Partial disbursement is not part of this v1 plan; block the whole disbursement when funds are insufficient.
- Import/backfill loan rows should not consume live monthly intake capacity unless a later migration plan explicitly maps them to a cycle.
- Existing approved loans created before this feature may not have cycle data; reporting should classify them as uncategorized or legacy rather than failing.

## Open Questions
- None. Default v1 behavior blocks submission until the current monthly financing cycle is open.

## Linked Task
- Task Title: Loan Intake Capacity Enforcement And Dashboard Visibility
- Task File: brain/tasks/roadmap.md

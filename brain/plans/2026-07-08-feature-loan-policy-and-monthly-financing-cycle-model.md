# Plan: Loan Policy And Monthly Financing Cycle Model

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
- Intake Item: Standardize monthly loan capacity from projected member commitments, with quick/normal allocation and quota tracking.

## Goal Or Problem
Admins need a durable, auditable model for monthly financing capacity so the cooperative can stop manually tracking loan-form quotas. Capacity should default to projected active member commitments for the month, split between quick and normal financing, and remain separate from actual deployable funds used at disbursement time.

## Current Context
Halaalvest already models tenant policy, loan products, loan requests, loans, repayment schedules, member contribution plans, contributions, dashboard metrics, and audit logs. `TenantPolicy` already stores general loan settings such as eligibility multiple, quick/normal terms, reserve buffer, and dual approval. `LoanProduct` already differentiates quick and normal products by type, term, active state, and savings multiple. Existing docs require interest-free financing, tenant isolation, auditability, and no guaranteed disbursement.

This plan should extend the existing policy/product model rather than creating a competing loan settings system. It should also stay narrower than the older broad Loan Rule Settings plan by focusing on monthly cycle capacity and budget allocation.

## Proposed Approach
Add a tenant-scoped monthly financing cycle model and supporting policy fields. A cycle captures the capacity snapshot for a month and the configured split between quick and normal financing. A read model can preview a draft cycle from current data before the cycle is opened. The model must preserve defaults: quick loan term `3`, normal loan term `18`, tenant/member eligibility cap up to `2x` savings, quick allocation `30%`, normal allocation `70%`, and strict submitted-request reservation for v1.

Recommended durable shape:
- Extend `TenantPolicy` with allocation and intake policy fields:
  - `financingCapacityBasis`, default `projected_monthly_commitments`.
  - `quickLoanAllocationPercentage`, default `30`.
  - `normalLoanAllocationPercentage`, default `70`.
  - `loanIntakeReservationMode`, default `submitted_request_amount`.
  - `disbursementRequiresDeployableFunds`, default `true`.
- Add a tenant-scoped `FinancingCycle` model:
  - tenant, period start/end or year/month, status `draft | open | paused | closed`.
  - capacity basis and policy snapshots used for that cycle.
  - projected commitment amount snapshot.
  - reserve/ring-fenced amount snapshot.
  - total capacity amount.
  - quick budget amount and normal budget amount.
  - opened/paused/closed metadata and audit notes.
- Add query helpers that calculate current-month projected commitments from active `ContributionPlan` records and actual collection coverage from posted `Contribution` records.
- Treat generated previews and opened cycle snapshots separately so posted history remains explainable.

## Implementation Steps
- Add Prisma enum/model changes for financing capacity basis, intake reservation mode, cycle status, and monthly financing cycles.
- Add a migration and regenerate the Prisma client using the repository's normal DB workflow.
- Add query helpers in the DB layer to:
  - get or preview a monthly financing cycle for a tenant and period;
  - calculate projected commitments from active monthly contribution plans;
  - calculate actual posted contributions for the period;
  - derive quick and normal budgets from configured percentages;
  - summarize requested, approved, disbursed, held, and remaining amounts by loan type.
- Add tenant-policy update helpers for the new policy fields, including validation that quick and normal percentages total `100`.
- Add audit logs for policy changes and cycle status changes.
- Keep existing `LoanProduct` term and savings-multiple rules as product-level caps; do not move those rules into the cycle model.
- Update seed/test utilities so default tenant policies include the new financing-cycle defaults.

## Affected Files Or Areas
- `packages/db/prisma/enums/loans.prisma`
- `packages/db/prisma/models/tenant.prisma`
- `packages/db/prisma/models/loans.prisma`
- `packages/db/prisma/migrations/*`
- `packages/db/src/queries/loans.ts` or a focused `packages/db/src/queries/financing-cycles.ts`
- `packages/db/src/queries/tenant-finance.ts`
- `packages/db/src/test-utils.ts`
- `packages/db/prisma/seed.ts`
- `brain/database/schema.md`
- `brain/features/core-cooperative-platform.md`

## Acceptance Criteria
- A tenant policy can store quick/normal allocation percentages with defaults of `30` and `70`.
- A monthly financing cycle can be previewed from current active member commitment plans before being opened.
- Opening a cycle stores auditable snapshots for projected commitment capacity, reserve/ring-fenced amount, and quick/normal budgets.
- Cycle summaries report requested, approved, disbursed, held, and remaining capacity by quick and normal loan type.
- Existing quick/normal product terms and member eligibility rules continue to apply.
- All new finance reads and writes are tenant-scoped and privileged writes create audit logs.
- No interest, compounding, penalty interest, or hidden interest-like fees are introduced.

## Test Plan
- Add DB query tests for projected commitment capacity from active contribution plans.
- Add DB query tests for quick/normal allocation math and validation that percentages total `100`.
- Add DB query tests for reserve/ring-fenced deduction and remaining-capacity calculations.
- Add tenant-isolation tests proving one tenant's cycle and request totals do not affect another tenant.
- Run the relevant DB tests, for example `bun test packages/db/src/queries/loans.test.ts` plus any new financing-cycle query test file.

## Brain Update Requirements
- Update `brain/database/schema.md` with the new financing cycle model and tenant policy fields.
- Update `brain/features/core-cooperative-platform.md` with monthly financing cycle and allocation rules.
- Update `brain/product/admin-dashboard-kpi-framework.md` if the cycle summary changes dashboard KPI definitions.
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
- Projected commitments are not cash in hand; disbursement must still use actual deployable funds.
- Active contribution plans can change after a cycle is opened; opened cycles should preserve snapshots while previews can recalculate.
- Rejected, cancelled, and expired requests should not consume remaining capacity.
- Backfilled/imported loans must remain separate from live cycle intake unless explicitly attached by migration logic later.
- Decimal rounding must not create negative remaining capacity or make quick/normal budgets sum above total capacity.

## Open Questions
- None. Default to projected monthly commitments, quick allocation `30%`, normal allocation `70%`, and strict submitted-request reservation for v1.

## Linked Task
- Task Title: Loan Policy And Monthly Financing Cycle Model
- Task File: brain/tasks/roadmap.md

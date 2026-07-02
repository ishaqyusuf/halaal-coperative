# Plan: Business Profit Policy Settings

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
- Intake Item: Add business settings for profit/dividend sessions such as annual, semi-annual, quarterly, and migration readiness.

## Goal Or Problem
Cooperatives need tenant-level business profit settings that define when and how reviewed business profit becomes distributable member profit. The current business setup can record historical businesses and profit entries, but it does not clearly expose a cooperative business model or profit-distribution cadence.

## Current Context
`/settings/finance/business` currently manages historical business registry, profit entries, dividend-ready allocatable profit, and migration review. The product model requires business profit allocation to be tied to actual cooperative business or investment results. Migration safety requires historical profit pools to be imported or explicitly marked as not applicable before member backfill. Existing models include business pools, profit entries, expense lines, share profit allocations, and dividend periods, but no obvious tenant-level business policy model for distribution cadence.

## Proposed Approach
Add a business policy section to `/settings/finance/business` for configuring profit-distribution rules. The first release should prefer explicit, auditable settings over automatic posting. Implemented with a dedicated `TenantBusinessPolicy` model. Policy fields include distribution frequency, financial year start, distribution basis, default distributable percentage, reserve retention percentage, approval requirement, expense treatment, and migration mode.

Use "profit distribution" in explanatory copy and retain "dividend" where the existing model or table uses that term. Do not model guaranteed returns. Any automatic generation should create draft periods or suggested allocation work only; publication remains a privileged audited action.

## Implementation Steps
- Confirm whether existing models can hold the first-release policy or whether a new `TenantBusinessPolicy` model is needed.
- If a new model is needed, add tenant-scoped policy fields for:
  - `profitDistributionFrequency`: annual, semi_annual, quarterly, monthly, ad_hoc
  - `financialYearStartMonth`
  - `distributionBasis`: share_capital_balance initially
  - `defaultDistributablePercentage`
  - `reserveRetentionPercentage`
  - `requiresProfitDistributionApproval`
  - `expenseTreatment`: deduct_reviewed_expenses_before_distribution
  - `historicalProfitMigrationMode`: no_historical_business_profit, import_historical_profit_pools, manual_review_required
- Add tenant-scoped read/update helpers with role checks and audit logs for policy changes.
- Add a settings form section to `/settings/finance/business` above or beside the existing historical registry.
- Make migration readiness consume the historical profit migration mode so tenants can explicitly mark "no historical business profit" without creating dummy business rows.
- Ensure generated dividend/profit periods, if included, are draft-only and explain their basis.
- Add tests for validation, audit logging, tenant isolation, and migration readiness behavior.

## Affected Files Or Areas
- `packages/db/prisma/models/tenant.prisma` or a new Prisma model file for tenant business policy
- `packages/db/src/queries/tenant-finance.ts` or focused policy query module
- `packages/db/src/queries/migration.ts`
- `apps/api/src/routers/dashboard-actions.route.ts`
- `apps/dashboard/src/lib/dashboard-actions.ts`
- `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/business/page.tsx`
- `apps/dashboard/src/components/forms/tenant-finance-forms.tsx`
- `apps/dashboard/src/components/business-header.tsx`
- `brain/features/onboarding-finance-setup-and-member-backfill.md`
- `brain/features/core-cooperative-platform.md`

## Acceptance Criteria
- `/settings/finance/business` exposes tenant business profit policy settings for finance-management roles.
- Admins can configure profit distribution frequency using standard names including `annual`, `semi_annual`, `quarterly`, and `ad_hoc`.
- Admins can configure reserve/distributable treatment without creating hidden fees or guaranteed returns.
- Business policy changes are tenant-scoped and audit logged.
- Historical migration can explicitly represent "no historical business profit" without dummy profit records.
- Business profit policy does not publish allocations automatically without privileged review.

## Test Plan
- Run `bun run --cwd apps/dashboard typecheck`.
- Run `bun run --cwd apps/api typecheck`.
- Run focused package tests for tenant-finance/business policy helpers.
- Manually verify tenant admin and finance officer can view/update business policy.
- Manually verify operations officer and member roles cannot update business policy.
- Manually verify migration readiness changes when historical profit mode is set to no historical business profit.

## Brain Update Requirements
- Update `brain/features/onboarding-finance-setup-and-member-backfill.md` with the business policy and migration mode.
- Update `brain/features/core-cooperative-platform.md` with durable profit-distribution policy behavior.
- Update `brain/AI_PROMPT_RULES.md` only if a new durable rule is introduced.
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
- Policy changes must not rewrite already-published profit allocations.
- Distribution frequency should not imply profit exists or guarantee a payout.
- Migration mode must not allow staff to bypass real historical profit records when they exist.
- Reserve retention and distributable percentages need validation so allocatable profit cannot exceed reviewed profit after expenses.

## Open Questions
- Monthly distribution frequency remains out of first release.
- Allocation basis remains `share_capital_balance` only for first release.

## Linked Task
- Task Title: Business Profit Policy Settings
- Task File: brain/tasks/roadmap.md

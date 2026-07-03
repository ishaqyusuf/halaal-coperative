# Plan: Recent Cooperative Backfill Gate And Alert Tone

## Type
Bug Fix

## Status
Proposed

## Created Date
2026-07-03

## Last Updated
2026-07-03

## Intake
- Intake File: brain/intake/2026-07-03-recent-cooperative-backfill-cleanup.md
- Intake Item: Hide unnecessary historical/member backfill for cooperatives whose start date is today or this month, and tone the next-step alert when no historical records are needed.

## Goal Or Problem
Recent cooperatives should not be pushed through historical member backfill or warned that historical records are important when there are no prior closed months to migrate. Backfill should remain available and required only when the cooperative or member has real prior-month history, legacy positions, or already-started migration records.

## Current Context
- `Tenant.startDate` is the canonical cooperative finance start date.
- `packages/db/src/queries/migration.ts` currently derives initial migration status and expected member backfill coverage.
- `getExpectedBackfillMonthKeys` in `packages/db/src/queries/migration.ts` uses an inclusive range through the current month, which can make a current-month cooperative look like it needs historical backfill.
- `apps/dashboard/src/app/(app)/(sidebar)/getting-started/page.tsx` chooses the active Getting Started step from `migrationState.snapshot.missingStepKeys`.
- `apps/dashboard/src/components/getting-started-page-view.tsx` shows the "Continue without historical records?" alert through `StepFooter`.
- `brain/features/onboarding-finance-setup-and-member-backfill.md` and `brain/AI_PROMPT_RULES.md` require staged/generated/backfilled records to stay separate from live records and avoid silent finance history rewrites.

## Proposed Approach
Define one deterministic "historical backfill required" rule and use it across migration state and dashboard copy.

Backfill should be required for closed historical months only:
- If today is 2026-07-03, a cooperative or member start date in July 2026 has no historical month to backfill.
- A cooperative or member start date before 2026-07-01 has at least one prior closed month and may require backfill.
- Existing historical imports, legacy loan drafts, applied/draft backfill batches, applied backfill months, or historical business/profit rows should keep the migration tools discoverable.

Update the migration state query so current-month members with zero expected historical months are considered satisfied for `member_ledger_backfill` instead of forcing a backfill batch. Align the Getting Started default step and next-step alert with this rule so the mandatory admin-member/backfill step is hidden or marked not applicable for genuinely recent cooperatives.

Keep the manual member backfill route available for staff who deliberately need it, but do not make it a required Getting Started step when there are no prior closed months.

## Implementation Steps
- Add or extract a tested helper that compares tenant/member dates to the first day of the current calendar month with an injectable `now` for tests.
- Update `getExpectedBackfillMonthKeys` in `packages/db/src/queries/migration.ts` to return only months before the current month.
- Update `getTenantInitialMigrationState` so members with zero expected historical months do not block `member_ledger_backfill`.
- Make legacy loan/no-history review requirements not block a recent cooperative when there are no historical months and no explicit legacy/historical records.
- Pass a recent-cooperative or historical-backfill-required flag from `apps/dashboard/src/app/(app)/(sidebar)/getting-started/page.tsx` into `GettingStartedPageView`.
- Update `resolveDefaultStep` and `ActiveStepPanel`/`StepFooter` behavior so the admin-member/backfill step is not the next required step for recent cooperatives with no history.
- Replace the generic "Historical records are important" alert text with conditional, short copy that only warns when prior closed months or historical rows exist.
- Keep tenant scoping and finance-management role checks unchanged.
- Update Brain feature docs after implementation.

## Affected Files Or Areas
- `packages/db/src/queries/migration.ts`
- `packages/db/src/queries/migration.test.ts`
- `packages/domain/src/modules/migration.ts`
- `packages/domain/src/modules/migration.test.ts`
- `apps/dashboard/src/app/(app)/(sidebar)/getting-started/page.tsx`
- `apps/dashboard/src/components/getting-started-page-view.tsx`
- `apps/dashboard/src/lib/members/load-member-backfill-workflow.ts`
- `apps/dashboard/src/components/members/member-backfill-page-view.tsx`
- `apps/dashboard/src/components/modals/member-backfill-start-modal.tsx`
- `apps/dashboard/src/components/modals/member-create-modal.tsx`
- `apps/dashboard/src/components/tables/members/columns.tsx`
- `brain/features/onboarding-finance-setup-and-member-backfill.md`

## Acceptance Criteria
- A tenant with `startDate` in the current calendar month and members joined in the current calendar month does not show `member_ledger_backfill` as a missing required step solely because the current month exists.
- A tenant or member with a start/join date before the first day of the current calendar month still requires historical backfill for prior closed months.
- The Getting Started flow does not route a recent cooperative into the mandatory member backfill procedure when no historical month exists.
- The next-step alert does not say historical records are important when the cooperative has no historical records to enter.
- If historical imports, legacy loans, applied/draft backfill records, or prior-month member dates exist, the backfill path remains visible and the warning copy is accurate.
- Current-month staged monthly records remain handled by normal monthly-record workflows, not historical backfill.
- All behavior remains tenant-scoped and role-gated.

## Test Plan
- `bun test packages/db/src/queries/migration.test.ts`
- `bun test packages/domain/src/modules/migration.test.ts`
- `bun --cwd apps/dashboard typecheck`
- Manual: create or simulate a tenant with start date 2026-07-03 and confirm Getting Started does not require member backfill.
- Manual: simulate a tenant with start date 2026-06-30 and confirm prior-month backfill is still required.

## Brain Update Requirements
- Update `brain/features/onboarding-finance-setup-and-member-backfill.md` with the final recent-cooperative backfill rule.
- Update `brain/progress.md` after implementation.

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
- Current-month handling must not erase the ability to enter deliberate opening balances or legacy positions when staff actually have historical data.
- Date comparisons must avoid timezone drift; use date/month helpers consistently.
- Existing applied backfill batches should continue to count as historical migration state even if the tenant start date is later edited.
- Hiding a required step in the UI must not bypass server-side finance safety checks.

## Open Questions
- None.

## Linked Task
- Task Title: Recent Cooperative Backfill Gate And Alert Tone
- Task File: brain/tasks/roadmap.md

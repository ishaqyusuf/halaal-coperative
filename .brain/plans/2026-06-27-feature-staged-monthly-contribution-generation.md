# Plan: Staged Monthly Contribution Generation

## Type
Feature

## Status
Done

## Created Date
2026-06-27

## Last Updated
2026-06-27

## Intake
- Intake File: brain/intake/2026-06-27-halaalvest-product-and-onboarding.md
- Intake Item: Monthly contribution should auto-generate on the first day of the month with staged status, new members should also auto-generate for that month, and staged rows should only show through the current-month date filter.

## Goal Or Problem
Monthly contribution obligations should be prepared automatically at the start of each month without posting live financial records until staff review or apply them. New members added during the current month should appear in that month's staged contribution roll, and staged rows should not clutter historical contribution views unless the user is explicitly looking at the current period.

## Current Context
The app already has monthly-record scaffolding:
- `packages/db/prisma/models/monthly-records.prisma` defines `MonthlyRecord`, `MonthlyRecordSetting`, and `MonthlyRecordMember`.
- `packages/db/src/queries/monthly-records.ts` exposes settings, record creation, member seeding, current-member insertion, and due generation helpers.
- `packages/jobs/src/handlers/monthly-record-generate.ts`, `packages/jobs/src/tasks/monthly-record-generate.task.ts`, and `apps/dashboard/src/app/api/cron/monthly-records/route.ts` provide a cron/job entry point.
- `apps/dashboard/src/app/(app)/(sidebar)/monthly-records/page.tsx` and `apps/dashboard/src/components/monthly-records-page-view.tsx` expose the operator UI.

Existing schema terms are `MonthlyRecord.status` values like `draft/open/closed` and `MonthlyRecordMember.status` values like `pending/applied/cancelled`. The user-facing requested word is `staged`.

## Proposed Approach
Verify and complete the first-day auto-generation path so each tenant with enabled monthly settings receives one current-month record on day one, with all active members seeded as staged/pending rows. Reuse existing pending rows as the implementation state unless product requires a new persisted `staged` enum. Ensure member creation and member approval flows call the existing current-month insertion helper so a new member gets a row in the already-generated current period. Update the monthly/member-contributions view so staged/pending rows are visible for the current date filter and hidden from non-current contribution views unless the selected monthly record is opened.

## Implementation Steps
- Audit `generateDueMonthlyRecords` in `packages/db/src/queries/monthly-records.ts` and confirm it only generates records when `autoGenerateEnabled` is true and the tenant's `generationDayOfMonth` is due.
- Lock the default setting to first-day generation unless tenant settings explicitly choose another day; if the product requires first day only, remove or hide the day selector in the dashboard.
- Confirm new monthly records are created in the non-posted staged state. Prefer mapping `MonthlyRecordMember.status = pending` to a UI label of `staged`; only add a schema enum if pending is semantically insufficient.
- Ensure member creation, member approval, and member import apply paths call `ensureMemberInGeneratedMonthlyRecord` for the current month after the member becomes active.
- Update the monthly records or member-contributions page to make "This month" the default filter for staged rows and prevent staged rows from appearing in historical contribution lists by default.
- Add focused tests for generation idempotency, first-day due behavior, new member insertion into an existing current-month record, and hidden staged rows outside the current-month filter.
- Update Brain docs after implementation to record the final state vocabulary and route behavior.

## Affected Files Or Areas
- `packages/db/src/queries/monthly-records.ts`
- `packages/db/src/queries/monthly-records.test.ts`
- `packages/jobs/src/handlers/monthly-record-generate.ts`
- `packages/jobs/src/tasks/monthly-record-generate.task.ts`
- `apps/dashboard/src/app/api/cron/monthly-records/route.ts`
- `apps/dashboard/src/components/monthly-records-page-view.tsx`
- `apps/dashboard/src/app/(app)/(sidebar)/monthly-records/page.tsx`
- `apps/dashboard/src/components/contributions-page-view.tsx`
- `apps/dashboard/src/components/tables/contributions/*`
- `apps/dashboard/src/lib/dashboard-actions.ts`
- `packages/db/src/queries/member-onboarding.ts`
- `packages/db/src/queries/members.ts`
- `packages/db/src/queries/imports.ts`
- `brain/features/member-commitments-and-payment-allocation.md`

## Acceptance Criteria
- On the first day of a month, the scheduled monthly record generation path creates exactly one staged monthly contribution record per eligible tenant and does not duplicate records on retries.
- Every active member with an eligible monthly contribution plan appears in the staged current-month record.
- A new member added or approved after the current-month record exists is inserted into that current-month staged record.
- Staged member rows are visible when the user filters to the current month.
- Staged rows are not shown by default in historical contribution views or non-current date filters.
- Applying a staged row remains the explicit action that posts contribution and repayment records.

## Test Plan
- `bun test packages/db/src/queries/monthly-records.test.ts`
- `bun test packages/db/src/queries/member-onboarding.test.ts`
- `bun test packages/db/src/queries/imports.test.ts`
- `bun run typecheck`
- Manual: call the cron route with an authorized secret in local development, then confirm `/monthly-records` shows the current month with staged rows.

## Brain Update Requirements
- Update `brain/features/member-commitments-and-payment-allocation.md` or add a monthly-record feature note describing staged monthly generation.
- Update `brain/progress.md` if present; otherwise update `brain/tasks/done.md` when implementation lands.

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
- Tenants with incomplete initial migration may be blocked from live financial writes; staged generation should either respect that gate or show a clear blocked state.
- Time zone handling matters because "first day of the month" may differ by tenant timezone.
- Imported members and approved signup members may enter through different code paths.
- TODO: confirm whether staged is only a UI label or a required persisted enum.

## Open Questions
- TODO: Does "member-contributions page" refer to `/monthly-records`, `/contributions`, or a future member-facing route?
- TODO: Should tenant admins be allowed to choose a day other than the first day, or should the first day be enforced?

## Linked Task
- Task Title: Staged Monthly Contribution Generation
- Task File: brain/tasks/roadmap.md

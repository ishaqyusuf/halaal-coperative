# Plan: First Run Onboarding Wizard

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
- Intake Item: After signup or login, if there is zero data so far, open onboarding screen with steps for charges, shares, business, add/import member, member migration screen, loan, and commitment progression.

## Goal Or Problem
A new or empty workspace should not drop admins into a blank dashboard. If no members or finance records exist, the app should guide them through the first operational setup sequence: charges, shares, business setup, member creation/import, member migration, loans, and commitment progression.

## Current Context
Existing Brain and code already cover pieces of this flow:
- `brain/features/onboarding-finance-setup-and-member-backfill.md` documents finance setup, share structure, charge history, business registry, and member backfill.
- `brain/plans/2026-06-20-feature-initial-cooperative-migration-and-member-ledger-backfill.md` covers migration gating and backfill lifecycle.
- `packages/db/src/queries/onboarding.ts` provides onboarding status.
- `packages/domain/src/modules/onboarding.ts` contains domain onboarding logic.
- Finance setup routes exist under `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/*`.
- Import routes exist under `apps/dashboard/src/app/(app)/(sidebar)/settings/imports/*`.
- Migration routes exist under `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/migration/*`.
- Loan and contribution pages exist under `/loans`, `/contributions`, and `/monthly-records`.

## Proposed Approach
Add a first-run onboarding router and guided wizard that appears after signup or login when the tenant has no meaningful operational data. Use existing setup/import/migration screens where possible instead of rebuilding all forms. The wizard should compute completion from real tenant state and route the user to the next incomplete step. It should also allow returning users to resume the wizard until the required setup path is complete.

## Implementation Steps
- Define "zero data input so far" using tenant state: no active members, no applied imports, no monthly records/contributions/loans, and incomplete finance setup.
- Extend onboarding status query/domain logic to return first-run wizard steps, current step, completion state, and next route.
- Add an onboarding route/screen in the authenticated dashboard that shows the step progression without marketing-style explanation.
- Route admins to the onboarding wizard after signup or login when the workspace is empty or wizard is incomplete.
- Step sequence:
  - Charges: configure active member charges or levy structures.
  - Shares: configure share structure.
  - Business: register business/profit setup if relevant.
  - Add/import member: create first member or import members.
  - Member migration: open member migration/backfill screen for historical records.
  - Loan: configure or review loan setup/migration.
  - Commitment progression: confirm contribution commitments and monthly generation readiness.
- Respect role permissions: admins can configure, finance officers can continue finance steps, other roles see a blocked or read-only state.
- Add tests for empty-workspace detection, completed-workspace bypass, and next-step routing.

## Affected Files Or Areas
- `packages/db/src/queries/onboarding.ts`
- `packages/db/src/queries/onboarding.test.ts`
- `packages/domain/src/modules/onboarding.ts`
- `packages/domain/src/modules/migration.ts`
- `apps/api/src/routers/onboarding.route.ts`
- `apps/dashboard/src/lib/server-context.ts`
- `apps/dashboard/src/lib/auth-redirect.ts`
- `apps/dashboard/src/app/(app)/(sidebar)/layout.tsx`
- `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/page.tsx`
- `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/charges/page.tsx`
- `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/shares/page.tsx`
- `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/business/page.tsx`
- `apps/dashboard/src/app/(app)/(sidebar)/settings/imports/members/page.tsx`
- `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/migration/page.tsx`
- `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/loan/page.tsx`
- `apps/dashboard/src/app/(app)/(sidebar)/loans/page.tsx`
- `apps/dashboard/src/app/(app)/(sidebar)/monthly-records/page.tsx`
- `apps/dashboard/src/components/tenant-finance-page-view.tsx`
- `apps/dashboard/src/components/initial-migration-preview.tsx`
- `brain/features/onboarding-finance-setup-and-member-backfill.md`

## Acceptance Criteria
- After signup or login, tenant admins with an empty workspace are routed to the onboarding wizard before the normal dashboard.
- A workspace with existing members and records bypasses the first-run wizard.
- The wizard shows the configured sequence and routes the user to the next incomplete step.
- Completing charges, shares, business, member add/import, migration, loan, and commitment readiness updates the wizard state.
- Non-admin users cannot perform privileged onboarding steps and receive a clear blocked/read-only state.
- The wizard can be resumed until complete and does not erase existing setup data.

## Test Plan
- `bun test packages/db/src/queries/onboarding.test.ts`
- `bun test packages/domain/src/modules/onboarding.test.ts` if present, or add focused domain tests.
- `bun test packages/domain/src/modules/migration.test.ts`
- `bun run typecheck`
- Manual: create a fresh tenant, log in, confirm wizard opens; add/import a member and complete setup steps; confirm normal dashboard opens after completion.

## Brain Update Requirements
- Update `brain/features/onboarding-finance-setup-and-member-backfill.md` with the final first-run wizard behavior.
- Update `brain/system/architecture.md` only if auth/login routing changes materially.
- Update progress or done tasks after implementation.

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
- Existing migration gate may already block some writes; the wizard should coordinate with it rather than create a competing gate.
- Empty-workspace detection must not reroute established tenants that temporarily have no current-month records.
- Business and loan setup may be optional for some tenants, so the wizard needs skip or not-applicable semantics.
- Imported members and manually created members should both satisfy member setup.

## Open Questions
- TODO: Which steps are mandatory for every tenant, and which can be skipped or marked not applicable?
- TODO: Should member-facing users ever see this onboarding flow, or only tenant admins and finance operators?

## Linked Task
- Task Title: First Run Onboarding Wizard
- Task File: brain/tasks/roadmap.md

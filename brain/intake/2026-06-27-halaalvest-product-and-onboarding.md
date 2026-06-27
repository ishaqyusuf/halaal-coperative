# Brain Intake: Halaalvest Product And Onboarding Polish

## Status
Approved

## Created Date
2026-06-27

## Last Updated
2026-06-27

## Raw Input
Halaalvest needs monthly contributions to auto-generate on the first day of each month with staged status; newly added members should also receive a staged row for the current month; the member-contributions page should show staged rows only through a date filter such as this month. Signup should support passwords and password reset. The product should receive a serious UI/UX redesign with dummy or unnecessary content removed, including the marketing landing page and login page. Signup should be controllable by admins, including disable/hide behavior, and signup should require admin approval. After signup or login, if the workspace has zero data so far, users should enter a clean onboarding flow covering charges, shares, business, add/import member, member migration, loan, and commitment progression.

## Generated Plans
- [x] Staged Monthly Contribution Generation - `brain/plans/2026-06-27-feature-staged-monthly-contribution-generation.md` - Status: Approved
- [x] Password Signup And Reset Flow - `brain/plans/2026-06-27-feature-password-signup-and-reset.md` - Status: Approved
- [x] Admin Controlled Signup Visibility And Approval - `brain/plans/2026-06-27-feature-admin-controlled-signup-approval.md` - Status: Approved
- [x] Marketing And Auth Experience Redesign - `brain/plans/2026-06-27-ux-ui-marketing-and-auth-redesign.md` - Status: Approved
- [x] First Run Onboarding Wizard - `brain/plans/2026-06-27-feature-first-run-onboarding-wizard.md` - Status: Approved

## Recommended Execution Order
1. Staged Monthly Contribution Generation - monthly operational records are core finance behavior and already have a nearby implementation surface.
2. Admin Controlled Signup Visibility And Approval - establishes the membership gate before polishing public entry points.
3. Password Signup And Reset Flow - strengthens auth completion once signup policy is confirmed.
4. First Run Onboarding Wizard - depends on existing finance/member/migration surfaces and should route users through them coherently.
5. Marketing And Auth Experience Redesign - best once target flows and empty-workspace routing are stable enough to design around.

## Agent Recommendations
- Staged Monthly Contribution Generation: open-code - focused backend, job, and dashboard table behavior with clear tests.
- Admin Controlled Signup Visibility And Approval: open-code - mostly tenant policy, server-action, and dashboard UI refinement.
- Password Signup And Reset Flow: open-code - auth-sensitive implementation with existing token and reset route surfaces to verify.
- First Run Onboarding Wizard: antigravity - cross-screen product flow and UI coordination across finance, imports, migration, and loans.
- Marketing And Auth Experience Redesign: antigravity - design-heavy work that benefits from screenshot iteration and taste review.

## Merged Items
- Marketing landing page, login page, UI/UX redesign, and dummy/unnecessary content cleanup were merged into one public/auth redesign plan because they share the same user-facing surfaces and acceptance checks.
- Signup disable/hide control and signup approval were merged into one admin signup policy plan because they share tenant policy, public route visibility, and approval workflow boundaries.
- Zero-data onboarding, charges, shares, business, add/import member, member migration, loan, and commitment progression were merged into one first-run onboarding wizard plan because the requested user outcome is one guided setup path.

## Duplicate Or Existing Items
- Signup approval overlaps with `brain/features/member-signup-gating-and-links.md` and `brain/tasks/done.md` entries from 2026-04-15; the new plan focuses on visible admin hide/disable controls, route entry cleanup, and approval UX verification rather than rebuilding the existing request model.
- Public tenant signup and onboarding overlap with `brain/features/public-signup-onboarding.md`; the password and first-run onboarding plans treat that work as existing foundation.
- Finance setup and member migration overlap with `brain/features/onboarding-finance-setup-and-member-backfill.md` and `brain/plans/2026-06-20-feature-initial-cooperative-migration-and-member-ledger-backfill.md`; the new onboarding plan focuses on routing and guided sequencing across those existing areas.
- Monthly record generation overlaps with existing `packages/db/src/queries/monthly-records.ts`, `packages/jobs/src/handlers/monthly-record-generate.ts`, and `apps/dashboard/src/app/api/cron/monthly-records/route.ts`; the new plan focuses on exact first-day staging behavior, current-month new-member insertion, and member-contributions filtering.

## Needs Clarification
- Confirm whether "Signup feature controllable by admin" refers only to member signup inside a tenant workspace, or also to platform/cooperative signup on the marketing site.
- Confirm whether "staged" must be a new persisted enum value, or whether existing pending monthly-record rows can be relabeled as staged in the UI.
- Confirm whether "member-contributions page" means the existing `/monthly-records` page, `/contributions`, or a future member-facing contributions screen.
- Confirm exact brand assets, logo treatment, and copy tone for the redesign if available.

## Skipped Items
- None.

## Approval Notes
- 2026-06-27: User approved all generated plans from this intake. All five plans were marked Approved and their companion tasks were moved from roadmap to backlog.

## Handoff Notes
- Use `brain-batch-handoff` to convert approved plans into handoffs and queue items.

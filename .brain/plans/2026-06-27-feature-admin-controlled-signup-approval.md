# Plan: Admin Controlled Signup Visibility And Approval

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
- Intake Item: Signup feature should be controllable by admin, disable/hide, and require approval from admin.

## Goal Or Problem
Tenant admins need explicit control over whether member signup is publicly visible, link-only, fully disabled, or hidden from public/auth entry points. Applicants should not become active members until an admin approves them.

## Current Context
`brain/features/member-signup-gating-and-links.md` documents an in-office-by-default member signup gate, staff-issued links, and request approval flow. Completed work also mentions `/app/member-signup-links`, membership approvals, signed links, expiry/cap controls, and analytics. Current likely implementation surfaces include:
- `apps/dashboard/src/app/(app)/(sidebar)/member-signup-links/page.tsx`
- `apps/dashboard/src/components/signup-links/member-signup-link-manager.tsx`
- `apps/dashboard/src/app/(app)/(sidebar)/membership-approvals/page.tsx`
- `apps/dashboard/src/components/onboarding/membership-approval-form.tsx`
- `apps/dashboard/src/app/(public)/signup/members/page.tsx`
- `apps/dashboard/src/lib/member-signup-access.ts`
- `packages/db/src/queries/member-signup-links.ts`
- `packages/db/src/queries/member-onboarding.ts`

## Proposed Approach
Treat the existing member signup gate and approval system as the foundation. Add or verify an explicit admin-controlled visibility mode that can hide public signup links and disable signup entirely, including staff-issued links if desired. Ensure all public signup entry points, login links, and shortcut CTAs respect the mode. Keep approval mandatory for member-created accounts, and make pending approval states clear after signup and email verification.

## Implementation Steps
- Audit current tenant policy values for member signup access and identify whether they can represent `hidden` and `disabled` distinctly from `in_office` and `public`.
- If needed, extend tenant policy/domain types to include explicit signup visibility/access modes.
- Update member signup access checks so disabled mode blocks direct signup and token signup, while hidden mode removes public links but may still allow staff-issued URLs if product wants that.
- Update `/login`, tenant root, members page, and membership approvals shortcuts so signup CTAs only appear when allowed.
- Verify public signup submission creates a pending onboarding request, never an active member.
- Polish awaiting-approval or post-verification states so applicants understand admin approval is required.
- Add tests for each visibility mode, link behavior, approval gating, and hidden CTA rendering.

## Affected Files Or Areas
- `packages/domain/src/modules/policies.ts`
- `packages/db/prisma/models/tenant.prisma`
- `packages/db/src/queries/member-signup-links.ts`
- `packages/db/src/queries/member-signup-links.test.ts`
- `packages/db/src/queries/member-onboarding.ts`
- `packages/db/src/queries/member-onboarding.test.ts`
- `apps/dashboard/src/lib/member-signup-access.ts`
- `apps/dashboard/src/lib/public-actions.ts`
- `apps/dashboard/src/lib/dashboard-actions.ts`
- `apps/dashboard/src/app/(public)/signup/members/page.tsx`
- `apps/dashboard/src/app/(public)/awaiting-approval/page.tsx`
- `apps/dashboard/src/app/(public)/login/page.tsx`
- `apps/dashboard/src/app/(app)/(sidebar)/member-signup-links/page.tsx`
- `apps/dashboard/src/components/signup-links/member-signup-link-manager.tsx`
- `apps/dashboard/src/app/(app)/(sidebar)/membership-approvals/page.tsx`

## Acceptance Criteria
- Admins can choose whether member signup is public, link-only/in-office, hidden, or disabled according to the final policy model.
- Disabled signup blocks direct public signup and staff-issued signup links with a clear blocked state.
- Hidden signup removes public CTAs and login-page signup links.
- Member signup submissions remain pending until admin approval.
- Approved applicants become active members only through the admin approval path.
- Existing signed link expiry, capacity, and rotation controls still work.

## Test Plan
- `bun test packages/db/src/queries/member-signup-links.test.ts`
- `bun test packages/db/src/queries/member-onboarding.test.ts`
- `bun run typecheck`
- Manual: switch each signup mode as an admin, inspect `/login` and `/signup/members`, submit an applicant, and approve from `/membership-approvals`.

## Brain Update Requirements
- Update `brain/features/member-signup-gating-and-links.md` with the final access/visibility modes and approval behavior.
- Update done/progress task notes after implementation.

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
- "Hidden" and "disabled" have different semantics; hidden may still allow staff-issued URLs, while disabled should likely block all self-service signup.
- Approval must remain tenant-scoped and migration-aware.
- Existing links must behave predictably if an admin changes tenant signup mode after sharing them.

## Open Questions
- TODO: Should hidden mode still allow existing staff-issued links, or should hiding imply total self-service disablement?
- TODO: Does this plan also need to cover public cooperative/tenant signup from `apps/marketing`, or only tenant member signup?

## Linked Task
- Task Title: Admin Controlled Signup Visibility And Approval
- Task File: brain/tasks/roadmap.md

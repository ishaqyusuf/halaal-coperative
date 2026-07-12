# Plan: Password Signup And Reset Flow

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
- Intake Item: Signup password and reset password feature.

## Goal Or Problem
Users who sign up or receive access should have a clear password setup path, and users who forget their password should be able to request and complete a secure reset without staff manually changing credentials.

## Current Context
The repository already contains password and reset surfaces:
- `packages/db/src/queries/auth.ts` stores and reads `passwordHash`.
- `apps/dashboard/src/lib/password.ts` and `apps/dashboard/src/lib/password-reset-token.ts` provide password/token helpers.
- `apps/dashboard/src/app/(public)/login/page.tsx`, `apps/dashboard/src/app/auth/login/route.ts`, `apps/dashboard/src/app/(public)/login/reset/page.tsx`, and `apps/dashboard/src/app/(public)/login/reset/confirm/page.tsx` exist.
- Member onboarding currently accepts password data in `packages/db/src/queries/member-onboarding.ts` and UI lives in `apps/dashboard/src/components/onboarding/member-signup-form.tsx`.
- Tenant signup and onboarding live in `apps/web/app/signup/page.tsx`, `apps/web/app/onboarding/page.tsx`, `apps/web/app/api/signup/route.ts`, and `apps/web/app/api/onboarding/route.ts`.

## Proposed Approach
Audit the existing password and reset routes, then close the product gaps: password creation during the relevant signup flow, secure reset request, reset email/outbox delivery, token verification, password update, and polished success/error states. Keep password hashing and token signing centralized in existing helpers. If tenant signup currently creates a workspace without a dashboard password, add a password setup or invite flow at the onboarding handoff.

## Implementation Steps
- Confirm which signup surfaces need password entry: public member signup, tenant admin signup, or both.
- Audit current reset request and confirm whether it creates a durable token, sends or queues email, and avoids account enumeration.
- Add or complete reset token persistence if current helpers are stateless and cannot support revocation or one-time use.
- Wire reset request into the notification/outbox system using the existing notification package pattern.
- Ensure reset confirmation validates token expiry, tenant/host scope, and single-use behavior before updating `passwordHash`.
- Ensure login accepts reset passwords and invalidates old reset tokens after success.
- Add password validation, form errors, loading/submitted states, and completion navigation.
- Add focused tests for password hash update, expired token rejection, used token rejection, tenant scoping, and non-enumerating reset request responses.

## Affected Files Or Areas
- `packages/db/src/queries/auth.ts`
- `packages/db/prisma/models/auth.prisma`
- `apps/dashboard/src/lib/password.ts`
- `apps/dashboard/src/lib/password-reset-token.ts`
- `apps/dashboard/src/app/(public)/login/page.tsx`
- `apps/dashboard/src/app/auth/login/route.ts`
- `apps/dashboard/src/app/(public)/login/reset/page.tsx`
- `apps/dashboard/src/app/(public)/login/reset/confirm/page.tsx`
- `apps/dashboard/src/components/onboarding/member-signup-form.tsx`
- `packages/db/src/queries/member-onboarding.ts`
- `packages/notifications/src/types/onboarding.ts`
- `packages/notifications/src/types/registry.ts`
- `packages/jobs/src/handlers/notification-outbox-deliver.ts`
- `apps/web/src/components/signup/signup-form.tsx`
- `apps/web/src/components/signup/onboarding-form.tsx`

## Acceptance Criteria
- Signup requires or initiates password setup for the intended user type.
- A user can request password reset from the login screen without exposing whether an email exists.
- A valid reset link allows the user to set a new password.
- Expired, malformed, cross-tenant, or already-used reset links are rejected with clear user-facing states.
- After reset, the user can log in with the new password and the reset token cannot be reused.
- Reset email creation is recorded through the existing notification/outbox architecture.

## Test Plan
- `bun test packages/db/src/queries/auth.test.ts` if present, or add focused auth query tests beside `packages/db/src/queries/auth.ts`.
- `bun test packages/db/src/queries/member-onboarding.test.ts`
- `bun run typecheck`
- Manual: request a reset from `/login/reset`, complete `/login/reset/confirm`, then log in with the new password.

## Brain Update Requirements
- Update `brain/features/public-signup-onboarding.md` if tenant signup password setup changes.
- Update `brain/features/member-signup-gating-and-links.md` if member signup password behavior changes.
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
- Reset flows must avoid account enumeration and token replay.
- Tenant-host scoping must prevent resetting the wrong tenant user's password.
- Existing dev quick-login behavior must remain development-only.
- TODO: confirm whether tenant admin signup should collect password immediately or send a setup link after admin approval.

## Open Questions
- TODO: Is "signup password" for tenant admins, member applicants, staff-created users, or all three?

## Linked Task
- Task Title: Password Signup And Reset Flow
- Task File: brain/tasks/roadmap.md

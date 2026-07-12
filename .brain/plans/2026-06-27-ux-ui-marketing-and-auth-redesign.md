# Plan: Marketing And Auth Experience Redesign

## Type
UX/UI

## Status
Done

## Created Date
2026-06-27

## Last Updated
2026-07-03

## Intake
- Intake File: brain/intake/2026-06-27-halaalvest-product-and-onboarding.md
- Intake Item: UI/UX redesign, remove dummy/unnecessary contents, agency design with "$100m startup" taste, marketing landing page, and login page.

## Goal Or Problem
The first impression of Halaalvest should feel polished, credible, and focused on the actual cooperative finance product. Public and auth pages should remove placeholder/dummy content, explain the product clearly, and guide users into the correct signup/login path without visual clutter.

## Current Context
Existing public/auth surfaces include:
- `apps/marketing/app/page.tsx` for the platform marketing root.
- `apps/marketing/app/signup/page.tsx`, `apps/marketing/src/components/signup/signup-shell.tsx`, and related signup/onboarding components.
- `apps/dashboard/src/app/page.tsx` for the tenant root.
- `apps/dashboard/src/app/(public)/login/page.tsx`, reset pages, member signup pages, and awaiting approval page.
- `packages/domain/src/modules/marketing.ts` controls `SHOW_HOME_PAGE` and marketing visibility behavior.
Brain notes show the landing page and login page have had prior redesign passes, but the user requested a higher-quality redesign and cleanup.

## Proposed Approach
Run a focused public/auth redesign pass. Remove demo language and filler content, build a concrete Halaalvest narrative around cooperative savings, interest-free financing, charges, statements, approvals, and member trust, and tighten the UI into a premium operational SaaS feel. Make the landing page useful as the first screen, and make login/reset/signup pages calm, direct, and obviously tenant-aware. Preserve existing route behavior, auth handling, and visibility gates.

## Implementation Steps
- Inventory visible marketing/auth copy and identify dummy, placeholder, duplicated, or unnecessary content.
- Redesign `apps/marketing` landing content around real product outcomes, target customers, and conversion paths.
- Redesign dashboard tenant login and reset pages using shared UI primitives, clear hierarchy, and no placeholder claims.
- Ensure signup, login, reset, and awaiting-approval pages all reflect admin-controlled signup visibility.
- Keep pages responsive with no overlapping text, no nested cards, and no decorative clutter.
- Use real product UI screenshots or generated/curated visuals only if the design needs imagery; avoid fake dashboard claims.
- Verify desktop and mobile screenshots for marketing root, signup, tenant root/login, reset, and awaiting approval.
- Update Brain notes with the final positioning/copy decisions.

## Affected Files Or Areas
- `apps/marketing/app/page.tsx`
- `apps/marketing/app/signup/page.tsx`
- `apps/marketing/app/onboarding/page.tsx`
- `apps/marketing/src/components/signup/signup-shell.tsx`
- `apps/marketing/src/components/signup/signup-form.tsx`
- `apps/marketing/src/components/signup/onboarding-form.tsx`
- `apps/dashboard/src/app/page.tsx`
- `apps/dashboard/src/app/(public)/login/page.tsx`
- `apps/dashboard/src/app/(public)/login/reset/page.tsx`
- `apps/dashboard/src/app/(public)/login/reset/confirm/page.tsx`
- `apps/dashboard/src/app/(public)/awaiting-approval/page.tsx`
- `apps/dashboard/src/app/(public)/signup/members/page.tsx`
- `packages/domain/src/modules/marketing.ts`
- `brain/product/vision.md`

## Acceptance Criteria
- Marketing landing page contains no dummy or placeholder content.
- Login, reset, signup, and awaiting-approval pages contain no unnecessary demo-only copy.
- Public pages present Halaalvest as a credible cooperative management platform for interest-free savings and financing, contributions, charges, and member trust.
- Login page clearly supports the intended user paths without exposing signup when admin policy hides it.
- Pages are responsive on mobile and desktop, with no visible overlap or clipped button/card text.
- Existing auth, signup, reset, and route gating behavior is preserved.

## Test Plan
- `bun run typecheck`
- `bun run lint`
- Manual screenshot review at mobile and desktop widths for `/`, `/signup`, tenant `/`, `/login`, `/login/reset`, `/login/reset/confirm`, `/signup/members`, and `/awaiting-approval`.
- Manual flow check for hidden/disabled signup modes after the admin signup plan lands.

## Brain Update Requirements
- Update `brain/product/vision.md` if positioning language changes materially.
- Update `brain/system/architecture.md` only if route behavior changes.
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
- Design taste is subjective; future implementer should verify with screenshots and be willing to iterate.
- Marketing claims must stay grounded in implemented or near-term product capabilities.
- Signup visibility policy may alter which CTAs are allowed.

## Open Questions
- TODO: Confirm final brand assets, color constraints, and whether the landing page should target cooperative admins only or also prospective members.

## Linked Task
- Task Title: Marketing And Auth Experience Redesign
- Task File: brain/tasks/roadmap.md

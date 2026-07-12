# Halaalvest Mobile MVP Release Audit

Date: 2026-07-11
Spec: `brain/specs/2026-07-11-halaalvest-mobile-app-mvp.md`
Ticket set: `.scratch/halaalvest-mobile-app-mvp/issues/01` through `18`

## Status

The Halaalvest mobile MVP is pilot-ready for local validation. The app now has signed mobile auth, server-derived tenant/member/admin context, production DTO reads, staged member submissions, safe admin review actions, stale read banners, draft-first forms, virtualized long lists, device registration, and a repeatable smoke/visual QA gate.

## Evidence Map

- Mobile auth/session/tenant/role resolver: signed bearer session flow, `auth.mobile.signIn/me/signOut/switchRole`, secure native storage, active membership switcher.
- Member self-service reads: member home, commitments/financing/shares sections, More hub, statement, receipts, support, guarantor approvals, procurement, Foodstuff Purchase, project financing, notifications.
- Member submissions: staged receipts, receipt-linked support, support replies, financing, procurement, Foodstuff Purchase, project financing, optional shares, guarantor responses.
- Admin operations reads/actions: overview support triage, member directory/detail, onboarding/KYC review, receipt review, financing/procurement/Foodstuff Purchase/project/share review, collection follow-up notes, tenant admin invitations, report previews/export links.
- Offline and notification hardening: cached read DTOs with stale timestamps, stale-action guards, draft persistence cleared on auth/workspace transitions, safe notification copy, mobile device registration/revocation audit evidence.
- Performance and QA: `VirtualizedCardList` over `@legendapp/list`, mobile native import guard, smoke coverage gate, visual QA viewport matrix.

## Completed Local Checks

- `bun test apps/api/src/routers/mobile.route.test.ts`
- `bun --cwd packages/db node_modules/.bin/tsc --noEmit --pretty false`
- `bun --cwd apps/mobile typecheck`
- `bun --cwd apps/mobile check:native-imports`
- `bun --cwd apps/mobile check:smoke`
- Scoped `eslint` checks for touched mobile files and smoke scripts
- Scoped `prettier --check`
- Scoped `git diff --check`

## Skipped Checks

- Native simulator/device walkthroughs were not run in this local pass.
- App Store/Play Store build, EAS build, OTA update publish, and release signing were not run.
- Full monorepo test suite and full production build were not run.
- Push notification delivery was not implemented or tested; only safe notification surfaces and device/session audit registration were added.
- Formal accessibility audit, screen reader pass, and real cooperative pilot data load test remain pre-pilot tasks.

## Residual Risks

- Visual QA is now covered by a repeatable matrix and smoke gate, but still needs manual simulator/device execution before external pilot.
- Draft persistence is best-effort local AsyncStorage and should not be treated as durable storage.
- Offline behavior is read-cache only; no privileged offline write queue exists by design.
- Mobile report exports open/share governed dashboard URLs rather than native file downloads.
- Device registration is audit-backed foundation work; push token lifecycle and delivery provider integration remain later scope.
- Admin review actions depend on the same server procedures and role gates as web, but broad regression coverage should be expanded before scale rollout.

## Release Checklist

- Run `bun --cwd apps/mobile check:smoke`.
- Run `bun --cwd apps/mobile typecheck`.
- Run `bun --cwd apps/mobile check:native-imports`.
- Run API mobile router tests against the current branch.
- Run DB mobile query typecheck.
- Execute `apps/mobile/qa/mobile-visual-qa.md` on compact iOS, typical iOS, compact Android, typical Android, and wider layout.
- Confirm production API URL and app variant metadata.
- Confirm tenant branding and support contact values for the pilot cooperative.
- Confirm staff roles for tenant admin, finance officer, operations officer, and member workspaces.

## Pilot Boundary

Pilot-ready means the mobile app can be validated by internal users and a controlled cooperative pilot. It does not mean the mobile app is ready for public app-store release, push notifications, offline financial posting, or replacing the desktop dashboard for advanced accounting operations.

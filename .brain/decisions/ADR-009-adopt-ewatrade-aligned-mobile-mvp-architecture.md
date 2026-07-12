# ADR-009: Adopt EwaTrade-Aligned Mobile MVP Architecture

## Status

Accepted

## Context

- Halaalvest needed a mobile MVP without creating a second product standard beside the ongoing EwaTrade mobile app.
- The web platform already owns tenant isolation, role hierarchy, financing policy, receipt posting, support workflow, procurement, Foodstuff Purchase, project financing, shares, reports, and audit evidence.
- The mobile app needed member self-service and safe admin operations, but any screen-local finance or role logic would create drift from the dashboard and weaken auditability.

## Decision

- Keep the mobile app as an Expo Router app under `apps/mobile`.
- Keep the EwaTrade-aligned pattern: Expo Router route groups, typed tRPC client calls, NativeWind-first UI primitives, secure native session storage, safe-area wrappers, bottom-sheet/auth patterns, thin screens, and reusable mobile components.
- Treat API/router and database query/action modules as the mobile business contract. Mobile screens render server-shaped DTOs and submit typed actions; they do not calculate balances, eligibility, repayment state, share capital, receipt posting effects, procurement settlement, Foodstuff Purchase accounting, or audit-sensitive decisions.
- Use signed mobile bearer sessions with server-derived tenant, user, active membership, member profile, and workspace role. Client-supplied tenant/user/role/member overrides are not trusted.
- Keep member and admin mobile routes separate, with a workspace switcher for users who have both member and staff access.
- Use read-cache offline behavior with visible stale timestamps. Money-affecting submissions, admin reviews, postings, role/access changes, and privileged support actions remain blocked until live server confirmation.
- Persist safe form drafts locally for navigation/connectivity interruptions, and clear drafts on auth/workspace transitions and successful server-confirmed submissions.
- Use `@legendapp/list` via a shared `VirtualizedCardList` primitive for cooperative-sized lists.
- Use a repeatable smoke/visual QA gate (`bun --cwd apps/mobile check:smoke`) and the Brain release audit before calling the mobile MVP pilot-ready.

## Consequences

- Mobile can move quickly while staying aligned with EwaTrade and Halaalvest web architecture.
- Business behavior remains auditable because writes go through existing server-owned procedures and query/action helpers.
- The first pilot can support useful member self-service and field/admin review work without pretending mobile replaces every dashboard workflow.
- Offline write queue, push delivery, native file downloads, app-store binaries, and advanced accounting automation remain explicit later scope.

## Alternatives Considered

- Build a separate mobile-only API and role model.
  - Rejected because it would duplicate tenant/role logic and increase security drift.
- Port dashboard UI/forms directly into mobile.
  - Rejected because dashboard components and browser/Next.js assumptions are not native-safe.
- Implement screen-local finance previews and approval logic.
  - Rejected because mobile must not become a second source of truth for cooperative money rules.
- Wait for full public app-store readiness before shipping any mobile pilot.
  - Rejected because the cooperative can validate member self-service and safe admin workflows in a controlled pilot first.

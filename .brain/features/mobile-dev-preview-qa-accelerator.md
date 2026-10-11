# Mobile And Web Development And Preview QA Accelerator

## Purpose

Provide one secure non-production QA layer for Halaalvest mobile, marketing,
authentication, and tenant-dashboard clients. Authorized testers validate a QA
Domain, choose a domain-scoped cooperative access profile, enter an ordinary
short-lived session without receiving a password, and Quick Fill eligible forms
with valid synthetic cooperative data.

## Status

Implemented on 2026-08-29 for local, development, and preview environments.
The server-owned capability, credential lifecycle, exact-domain profile entry,
mobile/dashboard/marketing entry points, typed Quick Fill inventory, safe exclusions,
QA tenant seed, and production fail-closed checks are in place. Local Chromium
evidence covers authorization, all three seeded roles, member entry, owned-form
Quick Fill, and responsive mobile/tablet/desktop layouts. One physical Android
QA-entry correction flow is verified; the full Android/iOS matrix, WebKit,
routed-provider canary, and preview purge remain release-environment evidence,
not incomplete source implementation. A signed Android EAS preview artifact is
now built and inspected with the isolated preview identity.

## Product Boundary

- The accelerator exists only for local, development, or preview clients attached to an
  authorized non-production API/database environment.
- Mobile QA access is an optional accelerator, never a bootstrap requirement.
  Development and preview launch show a dismissible suggestion; normal sign-in
  and recovery remain usable without QA authorization, and the sign-in page
  retains a compact Set up/Update QA access CTA after dismissal.
- A configured QA Domain is a data and routed-email namespace, not a credential.
  A separate tester credential is always required.
- QA access profiles expose only cooperative, identity, membership role, linked
  member context, and eligibility labels; they never return or fill passwords,
  OTPs, access codes, provider credentials, or other secrets.
- Selected profiles mint ordinary short-lived, revocable mobile bearer or web
  cookie sessions. Tenant scoping, role permissions, member self-scope, Operation
  Profile modes, subscription entitlements, and purge state remain authoritative.
- Authorization tokens are also bound to the original client/device signal,
  client kind, contract version, server environment, exact QA Domain, active
  tester credential, expiry, and revocation state. A mobile authorization cannot
  be replayed through the web issuance branch or another client.
- A QA-authorized dashboard administrator may enter an otherwise empty live
  workspace for page and create-flow verification without being redirected into
  first-run onboarding. Ordinary administrator sessions retain the onboarding
  redirect, and the QA exception does not bypass setup, permission, readiness,
  ledger, or mutation guards inside a feature.
- Every in-scope form declares QA coverage: a safe Quick Fill recipe, a required
  prerequisite/test adapter, or an explicit exclusion with a reason.
- Generated identities are unique and recognizable. Every generated email uses
  the active QA Domain; synthetic phone, address, document, and payment data must
  not identify or contact a real person.
- Existing routed QA email remains allowed under
  `EMAIL_QA_DOMAIN_ROUTES`. SMS, WhatsApp, payment, subscription, domain, media,
  document, and other external effects require a registered test adapter,
  separately authorized controlled canary, or a server-enforced block.
- Quick Fill prepares drafts only. It never submits, approves, posts, disburses,
  releases funds, waives, reverses, publishes profit, or performs another
  irreversible action automatically.
- Production authentication and forms expose no usable accelerator capability;
  server capability checks and production mobile configuration fail closed even
  under forged client inputs.
- Development and preview mobile identities are distinct from production. Local
  preview testing rewrites localhost through Expo, while EAS preview URL values
  must target the isolated preview API/dashboard and must never target production.

## Halaalvest Reuse Boundaries

- Keep `EMAIL_QA_DOMAIN_ROUTES`, `Tenant.dataClassification`,
  `Tenant.qaSourceDomain`, `Tenant.qaPurgeStartedAt`, and the existing QA purge
  lifecycle authoritative for QA ownership, routed email, write blocking, and
  cleanup.
- Extend the canonical signed mobile profile/session and dashboard cookie
  session; do not introduce a parallel authorization model for protected product
  queries.
- Migrate `apps/mobile/src/dev/*`, `DevQuickFill`, dashboard/marketing development
  fills, and the dashboard login password shortcut into the authorized shared
  coverage contract. Do not keep hard-coded development passwords, `example.com`
  identities, or mock finance sessions as a second system.
- Preserve the centralized mobile runtime, scoped query/draft caches, no-offline-
  command-replay rule, keyboard-safe floating-sheet contract, and semantic
  NativeWind design system.
- Reuse the existing tenant/member/role permission matrix and finance command
  guards. QA mode never weakens operational readiness, contribution/financing
  policy, ledger, idempotency, approval, or audit requirements.

## Planned Capability Families

1. Non-production environment attachment and production-absence guarantees.
2. QA Domain plus independent tester-credential authorization.
3. Cooperative access-profile discovery and ordinary session entry.
4. Mobile and website bootstrap/account chooser.
5. Shared typed Quick Fill fixtures and coverage enforcement.
6. Member, cooperative, staff, finance, operations, and secondary workflow
   recipes or explicit exclusions.
7. Provider, financial-write, audit, redaction, revocation, and cleanup safety.
8. Device, browser, isolated-preview, and production-negative release evidence.

## Planning Artifacts

- [Execution plan](../plans/2026-08-27-feature-mobile-dev-preview-qa-accelerator.md)
- [Approved 15-ticket implementation batch](../../.scratch/mobile-web-dev-preview-qa-accelerator/issues/)
- [Internal QA Email Routing](./internal-qa-email-routing.md)
- [Mobile Architecture Hardening](./mobile-architecture-hardening.md)
- [QA Email Routing ADR](../decisions/ADR-010-adopt-explicit-qa-email-domain-routing.md)
- [Mobile Runtime ADR](../decisions/ADR-021-centralize-mobile-runtime-and-ban-offline-command-replay.md)

## Open Work

Release owners may add deployed preview evidence for physical devices, WebKit,
provider canaries, revocation/purge drills, and artifact inspection. These checks
require external preview infrastructure and do not authorize production QA
enablement or live-provider effects.

## Ticket 30 production-contract foundation — 2026-09-04

- Added a versioned `@halaalvest/domain` scenario plan and `@halaalvest/db`
  collision-preview/idempotent provisioner for nine exact `ishaq.qa.test`
  cooperative shells.
- Local execution proves every plan, four roles per tenant, four Operation
  Profile combinations, all nine reserved state labels, and stable rerun counts.
  All 36 cooperative numbers match `ABC-0123`; provider links, password hashes,
  sessions, and custom domains remain absent.
- Tenant policy now resets from one deterministic seed on every rerun; the live
  readback found 9 policies and 0 drift.
- The foundation deliberately does not mint sessions. It reuses this feature's
  existing exact-domain authorization and ordinary short-lived session entry.
- Three of 18 positive real-session journeys now pass through this accelerator:
  `member-core-reads`, `share-profit-governance-read`, and
  `subscription-plan-request`. The remaining 15
  positive journeys, seven negative journeys, one routed
  invitation, and the complete native visual matrix remain Ticket 30 work.
  Metadata labels are not counted as completed journeys.
- Accepted subscription run `t30-subscription-v13` hardens the Android adapter
  without weakening authorization: it verifies input focus, enters the fixed
  78-digit credential one key event at a time, retries only a single observed
  dropped digit, and fails closed on overshoot or wider divergence. Read-only UI
  hierarchy dumps have three bounded retries; taps and mutations are never
  replayed. Sheet expansion begins on the drag handle rather than the scroll
  body. The run passed every checkpoint and read back both sessions revoked.
- The Starter/healthy fixture intentionally gives one person both Tenant Admin
  and Member memberships under the same display name. Android automation must
  therefore match the selected profile's exact role accessibility segment, not
  a display-name substring. Profile entry is inside the native sign-out cleanup
  boundary so a shell assertion failure still revokes its mobile session.
- The fact-based inspector now proves 9/9 persisted states. Pending review is an
  audited member receipt created through the existing self-service workflow and
  reused without duplicate records or audits. Published profit is prepared only
  inside its exact QA-owned period and completed through the ordinary governed
  approval/publication commands, with stable record and audit counts on rerun.
  Overdue is produced through the ordinary financing lifecycle and collections
  refresh; stale is an ordinary rejected Operation Profile compare-and-set tied
  to the unchanged setting. Two complete reruns retain stable fixture ids.
- Exact-domain inventory now exposes 37 eligible Ticket 30 harness profiles
  across 9 tenants and 36 users: 9 Tenant Admin, 9 Finance Officer, 9 Operations
  Officer, and 10 Member profiles. The Starter/healthy Tenant Admin also has a
  non-default Member membership and linked profile for role-switch testing;
  tenant-local default selection remains deterministic. Five API tests cover environment availability,
  ordinary mobile entry, forged token/client/kind/selection rejection, and
  derived-session credential revocation.
- Platform-issued tester credentials use a fixed-width 78-digit decimal encoding
  derived from 32 cryptographically random bytes. The raw value is returned once
  and remains process-local in automated runs; only its digest is persisted.
  The numeric representation preserves the 256-bit random source while avoiding
  ADB text-entry punctuation, case, and key-event loss.
- A separate versioned positive-journey contract defines 18 journeys across the
  16 required product areas and verifies their named paths against the actual
  production router. It consumes this accelerator as the only governed session
  entry and does not treat route coverage as execution evidence. Its executor
  accepts an injected adapter so authorization/session material remains outside
  the report model; terminal failures are reduced to bounded codes.
- The first injected native adapter proof, run `t30-core-v20`, entered the
  Starter/healthy Member profile through a cold-launched Android development
  client, passed four member-core production reads plus the native checkpoint,
  and revoked the temporary credential and both ordinary sessions afterward.
- The separate negative executor applies the same closure-owned private runtime
  boundary while reserving a dedicated verifier for offline suppression. A
  recorded transport call or an outcome mismatch fails closed before later
  checkpoints can receive credit.
- Ticket 30's invitation proof deliberately consumes this feature through the
  public authorization/profile-entry procedures after issuing a temporary
  credential through the platform-owner procedure. It never imports a token,
  records only redacted proof facts, signs out the durable session, and revokes
  the credential. The first external run was rejected before launch pending
  explicit approval for the configured routed inbox.
- Ticket 30 cleanup consumes the existing QA-maintenance lifecycle instead of
  adding another purge root. Its exact-scenario preflight blocks live,
  foreign-domain, credential/session, custom-domain, document, and provider
  hazards before the canonical `qaPurgeStartedAt` marker and QA-only tenant
  delete. A local rollback rehearsal deleted all nine targets inside one
  transaction and restored their identical fingerprint/counts afterward; no
  persistent deletion occurred.
- Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/ticket-30-production-contract-qa-harness/evidence-report.md`
  and `.scratch/mobile-architecture-hardening-and-feature-completion/ticket-30-production-contract-qa-harness/cleanup-rehearsal.md`.

## Implementation Evidence

- Midday-style implementation plan: `.scratch/mobile-web-dev-preview-qa-accelerator/implementation-plan.md`
- Design HTML variants and selected final: `~/.gstack/projects/ishaqyusuf-halaal-coperative/designs/qa-access-20260829/`
- Automated contract suite: 24 focused tests (55 assertions) plus domain/auth/database/API/dashboard/marketing/mobile typechecks and the complete mobile contract. The API regression suite also proves credential revocation immediately invalidates a derived web session.
- Live UI: local dashboard authorization/profile/member flow and marketing Quick Fill flow in Chromium at 375, 768, and 1280 pixel widths.
- Mobile follow-up UI: physical Android Expo Go on Samsung SM-S928U1 verified
  the optional launch suggestion, dismissal, persistent Set up QA access CTA,
  keyboard-safe setup sheet, accessible close action, and return to enabled
  ordinary login controls. Expo web remained blocked before app render by the
  existing React Native Worklets web-runtime error.
- Deployed preview artifact: EAS Android preview build
  `f42d828e-93c2-4837-8d10-2d2e3125fe4b` completed successfully on 2026-08-29.
  APK inspection confirms package `com.halaalvest.mobile.preview`, application
  label `Halaalvest Preview`, version code `2`, and deep-link scheme
  `halaalvest-preview`. The managed prebuild and remote EAS environment also
  confirm QA accelerator enablement and isolated preview API/dashboard URLs.


## 11 October 2026 alignment

QA profile selection is now reachable from mobile More and the personal-access recovery gate as well as sign-in, with cooperative/name/role search. Switching still uses `acceptServerProfile`, which clears scoped drafts/files/read caches before persisting the ordinary signed profile. Transient refresh failures retain SecureStore authorization; rejected, expired or malformed authorization is cleared. Production config hides the panel before its network effect; conflicting Production deployment identity disables server capability. See [Preview updates](preview-build-updates.md).

## Domain-only QA entry — 11 October 2026

At the user's request, Mobile, Dashboard and Marketing no longer ask for or send a tester credential. Entry requires the exact normalized domain in server-owned `EMAIL_QA_DOMAIN_ROUTES`, a signing secret of at least 32 characters, enabled non-Production capability, and eligible active QA profiles. The server creates an expiring system receipt and returns the existing client-bound authorization token. Existing credential API support remains for older clients; no credential is embedded in clients. See ADR-20261011-domain-only-qa-entry.

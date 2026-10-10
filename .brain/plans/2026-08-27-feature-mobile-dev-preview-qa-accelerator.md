# Plan: Mobile And Web Development And Preview QA Accelerator

## Objective

Create one secure Halaalvest QA accelerator for development/preview mobile builds
and marketing/dashboard deployments. Testers authorize an exact QA Domain with
an independent tester credential, select a cooperative access profile for
ordinary short-lived session entry, and Quick Fill every eligible form with
valid domain-bound synthetic data. Production and ordinary manual workflows stay
unchanged and expose no QA endpoints, cookies, controls, or fixture bundles.

## Current Baseline

Halaalvest already has useful but fragmented development seams:

- explicit `.test` email routing and QA-tenant classification/purge;
- canonical signed mobile sessions and dashboard cookie sessions;
- mobile `DevQuickFill`, development fixture adapters, and fixture coverage
  guards;
- dashboard and marketing Quick Fill helpers and coverage checks;
- a development dashboard account picker that currently fills a shared
  hard-coded password;
- tenant, member, role, Operation Profile, subscription, audit, and finance
  command guards.

The accelerator consolidates and secures these seams. It must migrate or retire
the current shortcuts rather than add a second fixture/authentication system.

## Assumptions And Non-Negotiable Rules

- The server privately decides whether the accelerator exists. Expo/Next public
  values may control presentation but can never enable server capability.
- Development and preview use an isolated non-production API/database. Existing
  production-capable QA email routing does not authorize the accelerator in
  production.
- QA Domain and tester credential are separate. Store only a credential digest;
  discard raw credential material after exchange.
- Profile entry uses ordinary session mechanisms and current Tenant, User,
  Membership, Member, role, entitlement, purge, and readiness facts.
- Quick Fill sets form state through the owning validation contract, creates a
  draft only, and never submits or invokes a mutation.
- Every generated email uses the active QA Domain. Other identity/contact fields
  must be unmistakably synthetic and non-contactable.
- Posted financial history remains immutable. Test data uses ordinary audited
  commands and remains explicitly QA-classified and purgeable.
- No recipe may bypass interest-free financing rules, liquidity/cycle capacity,
  member self-scope, approval separation, ledger/idempotency constraints, or
  Operation Profile access modes.
- Routed QA email may be delivered. Other external or irreversible effects are
  adapter-gated, separately canary-authorized, or blocked server-side.

## Detailed Execution Plan

### 1. Establish Environment Isolation

1. Define a versioned, server-private QA capability contract for development and
   preview API environments.
2. Configure authorized client origins/build variants, QA domains, credential
   verification secrets, authorization/session lifetimes, throttling, and
   provider test modes without placing secrets in client configuration.
3. Add startup and deployment guards that refuse QA enablement in production or
   with incomplete/mismatched configuration.
4. Prove forged client headers, cookies, deep links, query strings, package names,
   and public environment values cannot enable the capability.

Dependency: none.

Validation: environment fixtures cover development, preview, production,
missing secrets, unauthorized hosts/builds, and contract-version skew.

### 2. Implement Server-Owned QA Authorization And Profile Entry

1. Add a narrow QA router/service/repository boundary rather than branching
   loosely inside production login.
2. Add a platform-operator credential lifecycle: issue, one-time display,
   digest storage, expiry, rotation, revocation, throttling, and redacted audit.
3. Exchange an exact normalized QA Domain and credential for a bounded client
   authorization.
4. Discover only active profiles from QA-classified tenants whose persisted
   `qaSourceDomain` matches, excluding purge-started, inactive, unsafe, or
   live-commercial-resource contexts.
5. Reauthorize the selected User, Membership, role, linked Member, Tenant,
   subscription, and purge state, then mint the ordinary mobile or web session.

Dependency: Phase 1.

Validation: domain isolation, non-enumeration, response redaction, expiry,
revocation, lockout, membership changes, purge races, cross-tenant selection,
concurrency, and exact cleanup tests.

### 3. Build Mobile And Website Bootstrap

1. Add a mobile QA provider above the route shell that hydrates minimal secure
   authorization state before member/admin routes render.
2. When authorization is absent or invalid, show a keyboard-safe floating sheet
   that cannot be dismissed around the gate; provide distinct retry, offline,
   expired, revoked, locked, and version-skew recovery.
3. Add an accessible searchable account chooser after server authorization,
   install the ordinary session, and clear tenant-sensitive query/draft caches
   on profile changes.
4. Preserve normal mobile sign-in and recovery for production-equivalent QA.
5. Add the same SSR-safe gate to marketing/auth and dashboard using secure,
   HttpOnly, SameSite, host/environment-scoped cookies and responsive dialog/
   sheet UI.
6. Retire the dashboard shared-password development picker after migration.

Dependency: Phase 2.

Validation: Android/iOS launch, keyboard, accessibility, safe-area, theme,
offline/recovery, role/member routing, and cache switching; Chromium/WebKit SSR,
hydration, refresh, direct navigation, Back/Forward, multi-tab revocation,
responsive layout, keyboard-only use, and normal-login fallback.

### 4. Introduce Typed QA Form Coverage And Fixtures

1. Create one shared fixture core plus mobile, marketing/auth, and dashboard
   registries keyed by stable form identifiers.
2. Require each entry to declare a safe recipe, prerequisite/test adapter, or
   explicit exclusion and reason.
3. Generate QA-domain emails and safe cooperative names, member identities,
   access codes/member numbers, phones, addresses, dates, amounts, quantities,
   references, notes, and document placeholders from the current tenant,
   timezone, currency, Operation Profile, and policy context.
4. Support unique invocations, deterministic test seeds, Regenerate, Reset,
   dirty-form confirmation, Undo, arrays, selectors, multi-step drafts, and
   offline/prerequisite behavior.
5. Enforce separate inventories for mobile, marketing/auth, and dashboard,
   including forms inside sheets, dialogs, and inline editors.

Dependency: Phase 3.

Validation: type/recipe tests prove schema validity, exact domain binding,
uniqueness, deterministic seeds, dependent-field consistency, accessibility,
and production absence.

### 5. Integrate Low-Risk Identity And Setup Workflows

1. Prove the cross-platform contract on cooperative member creation.
2. Cover safe website early-access, signup, onboarding, member signup, and
   cooperative profile forms while keeping passwords, OTPs, signed links, and
   access credentials manual.
3. Cover member, KYC-metadata-without-private-document, Collection Source,
   workspace-role invitation, and safe settings workflows.
4. Preserve normal validation, consent, uniqueness, tenant isolation, and
   notification commands.

Dependency: Phase 4 plus provider policy for any submitted invitation/email.

Validation: representative ordinary submissions create only QA-classified,
tenant-scoped records and routed email preserves the synthetic recipient.

### 6. Integrate Cooperative Finance And Operations Workflows

1. Cover contribution commitments, contribution/payment receipt drafts, shares,
   charges, repayments, and safe import/migration drafts with current server
   prerequisites and internally consistent amounts.
2. Cover financing request, guarantor response, procurement, Foodstuff Purchase,
   and project-financing forms using actual tenant/member policies, active cycles,
   eligibility, capacity, payback, and obligation facts.
3. Cover support, follow-up, notification, and other operational text workflows
   without automatically sending, posting, approving, disbursing, releasing,
   waiving, reversing, or publishing.
4. Explicitly exclude secrets, private documents/media, destructive
   confirmations, ledger corrections without a safe adapter, compliance
   decisions, external payment/domain operations, and any action that could
   create a real-world effect.

Dependency: Phases 4–5 and provider/financial safety boundary.

Validation: every inventoried form has exact coverage; representative ordinary
submissions preserve tenant/member scope, money invariants, interest-free rules,
policy guards, idempotency, audit, and cleanup.

### 7. Enforce Provider, Financial, Audit, And Cleanup Safety

1. Keep QA email on `EMAIL_QA_DOMAIN_ROUTES` and preserve the original synthetic
   recipient in delivery evidence.
2. Block unsupported SMS, WhatsApp, payments, subscriptions, domains/hosting,
   media/document providers, destructive operations, and irreversible financial
   effects before provider or posting invocation.
3. Require explicit scoped, expiring, single-purpose capabilities for controlled
   canaries, separate from Quick Fill authorization.
4. Record credential validation, profile listing, session entry/revocation, and
   high-risk denied attempts with minimal redacted identifiers.
5. Remove credentials/session material and private/generated content from logs,
   Sentry, analytics, navigation payloads, and screenshots.
6. Clear mobile/web authorization, sessions, preferences, drafts, and caches
   locally without pretending to delete server data; use the existing classified
   QA purge lifecycle for server cleanup.

Dependency: Phases 2 and 4.

Validation: provider/posting spies prove zero unauthorized effects; redaction,
rate-limit, revocation, purge-race, finance-guard, and cleanup tests pass.

### 8. Release And Preview Acceptance

1. Run focused database/API/mobile/marketing/dashboard tests, typechecks,
   architecture/runtime/theme/keyboard/form-coverage guards, and diff hygiene.
2. Run a disposable QA-domain lifecycle against the isolated preview database:
   authorize, list roles, enter mobile/web sessions, Quick Fill and manually
   submit representative safe forms, verify routed email and blocked effects,
   revoke, and purge.
3. Test Android and iOS preview builds across compact/standard screens, light/
   dark themes, offline/recovery states, and OTA version skew.
4. Test preview marketing/dashboard in Chromium and WebKit across desktop,
   tablet, and narrow widths with SSR/hydration, secure cookies, browser
   navigation, multi-tab revocation, keyboard use, and responsive sheets.
5. Inspect production API routes, artifacts, server output, client bundles,
   cookies, and deep-link behavior to prove QA capability is absent even under
   forged inputs.

Dependency: Phases 1–7.

Validation: final evidence links exact automated/device/browser results and
reports unavailable devices, browsers, providers, or canaries as unverified.

## Dependency-Ordered Ticket Batch

The approved implementation batch lives at
`.scratch/mobile-web-dev-preview-qa-accelerator/issues/`:

1. Attach QA tooling to authorized non-production environments.
2. Authorize a QA Domain with a tester credential.
3. Enter a cooperative-scoped QA Access Profile.
4. Add the mobile QA bootstrap and account chooser.
5. Add the website QA bootstrap and account chooser.
6. Enforce provider and financial-write safety.
7. Prove cross-platform Quick Fill with a member form.
8. Complete Quick Fill interactions and coverage enforcement.
9. Quick-fill website signup, onboarding, and lead forms.
10. Quick-fill cooperative, member, and staff workflows.
11. Quick-fill contributions, shares, charges, and receipt workflows.
12. Quick-fill financing, repayment, and cooperative-service workflows.
13. Quick-fill support, notifications, and operational workflows.
14. Classify secondary, security-sensitive, private, and irreversible forms.
15. Prove preview readiness and production absence.

## Risks And Mitigations

- **QA becomes an authentication bypass:** independent credential, QA-only
  classification, short sessions, reauthorization, throttling, revocation, and
  production-absence tests.
- **Client flags enable server behavior:** only server-private configuration can
  expose capability.
- **Fixtures bypass finance correctness:** recipes prepare drafts only and use
  ordinary schemas/commands; policy, approval, idempotency, and ledger guards
  remain server-owned.
- **Synthetic identities contact real people:** exact QA-domain emails and
  reserved/non-contactable phone/address/document fixtures.
- **Preview reaches a live provider:** deny-by-default provider/financial-effect
  policy with explicit adapters and separately authorized canaries.
- **State leaks across cooperatives:** bind authorization/session/profile to QA
  Domain, Tenant, User, Membership, role, and linked Member; clear caches/drafts
  on transitions.
- **Credentials or member/finance data leak through telemetry:** minimal audited
  events plus enforced redaction across logs, Sentry, analytics, screenshots,
  errors, and navigation.

## Status

Implemented on 2026-08-29 for local, development, and preview. The shared
capability/fixture contracts, DB credential/profile records, ordinary session
entry, mobile/dashboard/marketing authorization surfaces, production fail-closed
guards, and typed form inventory are complete. Local Chromium and automated
evidence pass. Physical-device, WebKit, provider-canary, deployed-preview purge,
and production-artifact inspection are explicitly deferred to release owners
because those require external environments or authorization.

# ADR-035: Adopt Versioned Production-contract QA Scenarios

## Status

Accepted — 2026-09-04

## Context

- Production-contract mobile QA needs stable cooperative, role, subscription,
  Operation Profile, and state combinations without copying production data or
  weakening authorization.
- Ad hoc fixture scripts can collide with live tenants, drift between reruns,
  create undocumented credentials, or let client mocks appear to prove server
  behavior.
- The existing QA accelerator already owns exact-domain authorization,
  short-lived ordinary sessions, QA classification, routed-email policy, and
  purge safety. A second auth or cleanup system would create an unsafe bypass.

## Decision

- `@halaalvest/domain` owns a versioned, deterministic production-QA scenario
  plan and bounded evidence vocabulary.
- `@halaalvest/db` owns read-only collision preview and idempotent persistence of
  those plans into existing tenant-owned records.
- Stable QA slugs, cooperative prefixes, and cooperative numbers may be reused
  only when the existing tenant is QA-classified and belongs to the same exact
  `.test` QA Domain. Live, foreign-domain, or partial identifier collisions fail
  closed before writes.
- Provisioning resets governed tenant, subscription, policy, Operation Profile,
  role, and member shell state deterministically. Transaction-derived savings in
  the overdue fixture are preserved on rerun so seed persistence cannot erase
  posted financial evidence. Provisioning clears provider linkage and
  never creates a password, OTP, tester credential, bearer token, custom domain,
  or provider side effect.
- Session entry continues through the existing QA accelerator and production
  authorization contracts. The harness does not import arbitrary tokens or mint
  an alternate session.
- Authorization must remain bound to its digest-only token, original client
  signal and kind, contract version, environment, exact QA Domain, credential,
  expiry, and revocation. Profile selection remains an authorization-derived
  opaque reference; the harness cannot choose a raw membership id.
- Scenario state labels reserve the intended matrix but do not count as feature
  fixture completion until each product package owns and verifies its records.
- A read-only state inspector derives coverage from persisted tenant,
  subscription, member, request, repayment-schedule, and dividend facts. It must
  not infer completion from scenario metadata.
- `@halaalvest/domain` also owns an immutable v1 positive-journey registry. Each
  journey declares one scenario, required role, fixture prerequisites, exact
  production tRPC paths, a redacted evidence assertion, and an Android
  checkpoint. Repository conformance must fail when a declared path is absent
  from the assembled production router.
- A truthful role-switch journey requires one user with more than one active
  membership in the same tenant. The Starter/healthy Tenant Admin therefore
  owns a non-default Member membership and linked Member profile. Auth selection
  prefers the default membership inside the already resolved tenant and only
  falls back to that tenant's first membership when no default exists.
- Journey-definition coverage and router conformance are planning evidence, not
  runtime evidence. A journey is complete only after its API assertions and
  native checkpoint are executed through an authorized exact-domain session.
- The domain executor is transport-agnostic. Secrets and session state belong to
  the injected runtime adapter closure, while the executor records only declared
  contracts, bounded pass/fail/block codes, skip state, timestamps, and counts.
  Thrown adapter details are never copied into execution evidence.
- Negative coverage is a separate immutable v1 registry. Client-offline writes
  must prove transport suppression; server-denial journeys declare bounded
  expected application codes; exact retries declare canonical idempotent replay.
  Every journey retains a native checkpoint and router conformance.
- Negative execution uses separate adapter methods for invoked and suppressed
  steps. The suppressed verifier must report zero transport calls, observed
  outcomes must exactly match the registry, terminal results skip remaining
  proof, and private thrown details are reduced to bounded failure codes.
- Invitation delivery proof must enter through the existing platform-owner
  credential and QA accelerator boundaries, use an ordinary durable mobile
  Tenant Admin session, invoke the production route, and clean up in `finally`.
  DB inspection returns proof booleans/counts only. A sent result passes only
  when routing mode is `qa_domain` and the original reserved address was not the
  delivered recipient.

## Consequences

- Local/development/preview environments can reproduce the same safe tenant
  shells and role matrix without record growth on rerun.
- The harness can produce a human-readable, redacted report while preserving
  honest gaps for journey execution, provider delivery, and visuals.
- Production fails before database access, and collision preview remains a
  mandatory gate.
- Product teams must add records through their authoritative workflows or
  package-owned fixture builders; metadata alone cannot satisfy a state journey.
- Route renames or removals now break the positive-journey conformance test,
  keeping the QA plan synchronized with the production API surface.
- The pending-review baseline follows this rule by using the existing Operation
  Profile-guarded member receipt workflow. Its stable QA reference is reused
  while pending and its normal submission audit remains authoritative.
- The published-profit baseline follows the package-owned fixture-builder
  allowance only for exact QA-owned period preparation. It then exercises the
  ordinary allocation generator plus expected-state/idempotent mobile approval
  and publication commands. It refuses unrelated periods and mixed-business
  period contents.
- The overdue baseline must use the ordinary contribution, cycle, request,
  approval, disbursement, ledger, schedule, and collection-refresh services.
  Internal clock seams may replay coherent historical timestamps but are not
  exposed through public API schemas.
- The stale baseline must execute the ordinary expected-state command, prove the
  conflict, verify the governed row is unchanged, and link one stable audit
  observation to that row.
- QA cleanup remains the existing tenant-classification purge lifecycle, with a
  counts-only receipt retained outside the deleted tenant aggregate. The harness
  may add an exact-scenario preflight, fingerprint, and rollback rehearsal, but
  rehearsal and irreversible execution must call the canonical
  `qaPurgeStartedAt` marker and QA-only tenant-delete functions rather than own a
  second deletion root. A 2026-09-04 local rehearsal deleted all nine exact
  targets inside one transaction and restored the identical fingerprint/counts
  after deliberate rollback.

## Alternatives Considered

- Create one large mock response for every mobile screen.
  - Rejected because it would not exercise current API, permission, tenancy,
    ledger, or idempotency contracts.
- Seed users with a shared password and sign in directly.
  - Rejected because it creates credential material and bypasses the governed QA
    authorization lifecycle.
- Generate new random tenants on every run.
  - Rejected because cleanup, evidence comparison, and collision auditing would
    be nondeterministic.

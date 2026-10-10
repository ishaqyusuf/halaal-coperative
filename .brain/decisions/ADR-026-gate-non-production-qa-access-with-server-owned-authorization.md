# ADR-026: Gate Non-Production QA Access With Server-Owned Authorization

## Status

Accepted — 2026-08-29

## Context

Halaalvest had useful local fixture and Quick Fill helpers, but they were
fragmented across mobile, dashboard, and marketing and included a shared
password-prefill shortcut. Preview testers need fast role and form coverage
without turning public client flags into an authentication bypass or weakening
tenant, finance, provider, and production boundaries.

## Decision

Use one versioned server-private capability for local, development, and preview.
An independent tester credential authorizes one exact QA Domain and creates a
bounded, revocable client authorization whose secret evidence is stored only as
digests. Eligible profiles are discovered from active QA-classified tenants with
the same persisted domain, and selection mints the ordinary signed mobile or web
session. Quick Fill is owned by typed forms and the shared coverage inventory;
secrets, identity/compliance decisions, providers, financial posting, approvals,
and destructive actions remain manual, adapter-gated, or excluded. Production
fails closed server-side and production mobile configuration omits the client.
The mobile client presents QA as an optional, dismissible suggestion and a
sign-in-page Set up/Update CTA. QA authorization is never required to reach or
use ordinary sign-in and recovery, and clearing QA authorization does not clear
an unrelated ordinary authentication session.

## Consequences

- Local, development, and preview share one authorization and fixture contract.
- Tester credentials and profile selection never expose account passwords.
- Platform-issued tester credentials use a fixed-width decimal representation
  derived from 32 cryptographically random bytes so Android automation can enter
  them without punctuation, case, or dropped-key ambiguity. The raw credential
  is still shown once and only its digest is stored.
- Existing tenant, membership, role, subscription, readiness, finance, provider,
  audit, and purge rules remain authoritative.
- Dashboard and marketing use separate host-scoped HttpOnly authorization
  cookies; mobile keeps only bounded authorization state in SecureStore.
- Mobile QA setup uses a closable keyboard-safe sheet; closing or dismissing it
  preserves the normal authentication path.
- Release owners still need deployed device/browser/provider/purge evidence when
  those environments and authorizations are available.
- The first production-contract native proof cold-launched the headless Android
  development client, entered through this exact authorization boundary, and
  revoked the temporary credential plus both ordinary mobile sessions after the
  member-core journey. This is evidence for the existing decision, not a new
  session-entry architecture.

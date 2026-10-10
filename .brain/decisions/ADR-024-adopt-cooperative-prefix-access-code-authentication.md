# ADR-024: Adopt Cooperative Prefix Access-Code Authentication

## Status

Accepted

## Context

- A tenant custom domain supplies cooperative context for website sign-in, so a user can safely identify themselves there by tenant-scoped email or cooperative code.
- The mobile app has no trustworthy tenant host during initial sign-in. Accepting a tenant slug from the client would make tenant matching ambiguous and unnecessarily expose tenancy selection to authentication input.
- Existing `memberNumberPrefix` values are free-form and may repeat across tenants, so they cannot safely serve as a global tenant identifier.

## Decision

- Add a distinct nullable, globally unique `Tenant.cooperativeCodePrefix`. New public cooperative signups require 3–5 alphabetic characters and normalize them to uppercase.
- Add a nullable, globally unique normalized `User.cooperativeAccessCode`. New owners and member-linked accounts compose it from the cooperative prefix and their tenant account/member identifier.
- Mobile sign-in accepts only cooperative access code + password, resolves the user globally, and derives tenant context from the matched user before membership and entitlement checks.
- Product-facing mobile copy names this credential `Cooperative number` and uses `ABC-0123` as its neutral placeholder; the stable internal/API field remains `cooperativeAccessCode`.
- After credential validation and before session transition, mobile briefly replaces the Halaalvest identity with the resolved cooperative name and avatar/mark so the user can verify the tenant handshake.
- Mobile exposes no membership activation/sign-up feature. Account provisioning remains an authorized staff/web concern; mobile public auth is limited to sign-in and account recovery.
- Retired mobile activation routes, fixtures, persisted challenge writers and executable database commands are removed. Historical challenge enum values may remain for stored-data compatibility but cannot be produced through the mobile or onboarding runtime.
- Tenant-hosted website sign-in accepts email or cooperative access code + password, with the resolved custom domain constraining lookup to that tenant. Platform-host sign-in remains email-only without tenant context.
- Invalid code/email/password combinations use neutral failure responses. Availability checks are advisory; tenant bootstrap repeats global prefix uniqueness enforcement.
- Legacy tenant and user fields remain nullable until an explicit collision-aware backfill and communication plan is approved. Cooperative prefixes are not exposed as ordinary editable profile settings.

## Consequences

- Mobile tenant matching is deterministic without trusting client-supplied tenant identifiers.
- Owner bootstrap, member account linking, website auth, mobile auth, QA Quick Fill, and recovery must share normalization rules.
- Staff provisioning needs an intentional setup/invite delivery path that surfaces the issued code and establishes credentials; silently generating a code is not a complete user workflow.
- Recovery must avoid account enumeration while supporting the appropriate mobile code and tenant-hosted email/code identifiers.
- Production rollout requires a reviewed legacy prefix assignment/backfill, collision report, communication, and rollback plan.

## Alternatives Considered

- Reuse `memberNumberPrefix` as the tenant identifier.
  - Rejected because legacy values are free-form, often generic, and not globally unique.
- Ask mobile users for tenant slug, email, and password.
  - Rejected because it adds a third credential-like input, trusts tenant selection from the client, and is weaker than one globally resolvable code.
- Permit email-only mobile sign-in.
  - Rejected because an email may participate in multiple cooperative contexts and does not encode the intended tenant account.

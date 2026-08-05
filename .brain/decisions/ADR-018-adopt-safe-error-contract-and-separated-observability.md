# ADR-018: Adopt Safe Error Contract And Separated Observability

## Status

Accepted for the runtime-neutral contract and internal audit boundary. External Sentry transmission remains approval-gated.

## Context

Halaalvest spans Hono/tRPC, two Next.js deployments, Trigger.dev jobs, and Expo. Existing dashboard crash reporting stored redacted messages, stacks, paths, component stacks, and user agents in tenant audit logs. That still mixed technical diagnostics with tenant-facing audit evidence and created unnecessary exposure for member and financial data.

## Decision

- `@halaalvest/errors` is the single runtime-neutral classifier and public error envelope.
- `@halaalvest/observability` builds bounded, scalar-only capture context and removes member, cooperative, contribution, deduction, financing, loan, repayment, ledger, statement, balance, bank, guarantor, payroll, employer, tenant, identity, request, and secret metadata.
- APIs return `{ error: PublicError }`; tRPC also exposes the envelope at `data.appError`. Public copy never comes from arbitrary provider, database, or transport messages.
- Tenant audit evidence stores only category, code, reference ID, retryability, and an allowlisted source. Stacks, messages, URLs, user agents, component stacks, and request payloads are prohibited.
- Expected authentication, permission, validation, not-found, ordinary conflict, rate-limit, offline/network, and readiness failures remain user-actionable and non-reportable by default.
- External exception diagnostics belong in independently configured production Sentry projects, with replay and default PII disabled. SDK initialization, capture calls, source-map upload, and smoke events require explicit authorization for external transmission.

## Consequences

- Users receive consistent professional recovery copy and a support reference across API, dashboard, marketing, jobs, and mobile.
- Raw technical evidence is no longer available in tenant audit history; operators use the reference ID to correlate an approved external diagnostic event.
- Preview and development environments cannot report merely because `NODE_ENV=production`; an explicit production deployment environment and DSN are both required.
- Each independently deployed surface needs its own DSN/project configuration and production smoke verification.

## Alternatives Considered

- Continue redacting raw stacks into audit metadata: rejected because redaction cannot reliably make arbitrary financial/member diagnostics safe.
- Return framework/provider messages to clients: rejected because it leaks implementation details and produces inconsistent recovery UX.
- One shared Sentry project for every runtime: rejected because deployment ownership, releases, and alert routing differ across API, web, jobs, and mobile.

# Observability Transmission Policy

## Status

Proposed and implementation-ready. No external transmission is authorized by this document. Sentry SDK dependencies, initialization, capture calls, source-map uploads, alert creation, and smoke events remain disabled until the project owner explicitly selects the external-production mode described below.

## Purpose

This policy defines the exact diagnostic data Halaalvest may send to an external error-monitoring provider. It adapts GND's runtime wiring to Halaalvest's higher-risk cooperative-finance and member-identity domain. The public error contract and authenticated internal audit receipts remain independent of this decision.

## Decision modes

### External production diagnostics

This mode requires explicit project-owner approval. It permits only sanitized error events and private release source maps under the controls in this document.

### Internal-only diagnostics

This mode installs no Sentry SDK and sends no diagnostic or source-map data externally. Halaalvest keeps the shared public error contract, support references, safe UI, request correlation, retry policy, and authenticated minimal audit receipts already implemented.

### Policy revision

If neither mode is accepted, implementation remains paused at Halaalvest. Later projects do not start because the ordered project review gate has not been reached.

## Runtime isolation

External mode uses a separate private Sentry project and DSN for every independently deployed runtime:

| Runtime   | Proposed project boundary | Event sources                                                             |
| --------- | ------------------------- | ------------------------------------------------------------------------- |
| API       | `halaalvest-api`          | Hono fallback and tRPC error boundary                                     |
| Dashboard | `halaalvest-dashboard`    | Next.js client, Node, Edge, route boundaries, and handled server failures |
| Marketing | `halaalvest-marketing`    | Next.js client, Node, Edge, form APIs, and route boundaries               |
| Jobs      | `halaalvest-jobs`         | Trigger.dev terminal task-failure hook                                    |
| Mobile    | `halaalvest-mobile`       | Expo root boundary and explicitly handled unexpected failures             |

Events may not be forwarded between projects. Every project needs separate access control, alert ownership, DSN, release, environment, and smoke verification.

## Enablement gates

All of the following must be true before a runtime can transmit:

- the project owner has explicitly approved external production diagnostics;
- the runtime has a non-empty deployment-specific DSN;
- `NODE_ENV` is `production`;
- the explicit deployment environment is `production`, not merely a production build running in preview;
- mobile additionally has an explicit production variant enable flag;
- Trigger.dev additionally reports only when its environment type is `PRODUCTION`;
- the classified error is reportable under `@halaalvest/errors`;
- the event passes the final SDK `beforeSend` sanitizer.

Development, test, preview, staging, QA, local, and unclassified deployment environments fail closed. Missing or partial source-map credentials also fail closed.

## Allowed error-event fields

The final outbound event is reconstructed from an allowlist. It may contain only:

- provider-generated `event_id` and timestamp;
- runtime platform, environment, release, and distribution identifiers;
- severity level;
- exception type;
- stack frames limited to module, function, filename, line, and column data;
- fingerprint: shared error code plus bounded static operation name;
- tags: `error_category`, `error_code`, `error_reference`, `retryable`, `runtime`, `source`, and bounded static `operation`;
- API-only tags: HTTP method, tRPC procedure type, static router name, and generated request ID;
- job-only fields: static task name, attempt number, Trigger run ID, deployment version, environment slug, and environment type;
- mobile-only tags: app variant, Expo update ID, embedded-update flag, and runtime version;
- explicitly reviewed scalar extras whose keys pass the Halaalvest denylist and whose string values are capped at 200 characters.

The exception value and top-level event message are replaced with generic classified copy before transmission. The original runtime error message is not an allowed outbound field even when the original cause is used to preserve stack fidelity.

## Always-prohibited fields and features

The sanitizer removes or disables all of the following:

- request or response bodies, payloads, form input, task payloads, queued commands, imports, and uploaded content;
- raw exception messages and arbitrary provider, database, transport, or user-authored messages;
- URLs, paths, query strings, route parameters, headers, cookies, authorization values, IP addresses, and user agents;
- user, member, cooperative, tenant, staff, recipient, employer, guarantor, and customer identity;
- email, phone, address, bank, account, identity-document, or authentication data;
- contribution, deduction, financing, loan, repayment, ledger, statement, balance, payroll, payment, and charge data;
- document names or contents, media, transcripts, support messages, notification bodies, and delivery recipients;
- browser breadcrumbs, console breadcrumbs, navigation breadcrumbs, fetch/XHR breadcrumbs, SDK logs, and local variables;
- device identifiers, device names, advertising identifiers, browser fingerprinting context, and precise location;
- session replay, feedback screenshots, profiling, performance transactions, spans, and session tracking.

The SDK configuration uses `sendDefaultPii: false`, but that flag is not treated as sufficient protection. Each runtime also uses the explicit final-event allowlist and regression tests.

## Capture and duplication rules

- Expected authentication, permission, validation, not-found, precondition, ordinary conflict, rate-limit, and offline/network failures are not reported.
- Unexpected failures are captured once at the highest boundary that still has safe operational context.
- tRPC capture owns procedure failures; the enclosing Hono fallback must not capture the same failure again.
- A route or server action that captures a handled unexpected failure marks that ownership so a boundary does not duplicate it.
- Trigger captures only terminal task failure, never each retry attempt.
- Mobile and web query/mutation caches provide safe user feedback but capture only when no more specific owner exists.

## Private source maps

Source-map upload is a separate external transmission covered only by approval of external production diagnostics. Upload occurs only when environment, organization, project, auth token, and release are all present and match the target runtime. Maps are associated with the exact release, deleted from deployable artifacts after upload where supported, and never published to a public asset path.

Source maps contain application source code. Sentry project access must therefore be restricted to designated maintainers, and the auth token must be build-time only, least-privilege, non-public, and absent from runtime/client bundles.

## Operational prerequisites

Before enabling the first production DSN, the owner must record:

- Sentry organization and project owners for all five runtime projects;
- the selected data region and contractual/privacy basis;
- retention no longer than the operationally necessary period, proposed at 30 days;
- least-privilege member access and token rotation ownership;
- alert destinations and an on-call owner for new regressions, backend 5xx spikes, terminal job failures, and high-severity provider failures;
- incident workflow for searching by `error_reference` without copying event contents into tenant-visible audit history;
- deletion/export handling and the response process for a suspected sensitive-data event.

## Verification checklist

External mode is not complete until every runtime passes all applicable checks:

- [ ] disabled without a DSN;
- [ ] disabled in development, test, preview, staging, and QA;
- [ ] expected failures produce no event;
- [ ] one synthetic unexpected failure produces exactly one event;
- [ ] event routes to the correct runtime project, environment, and release;
- [ ] raw exception message is absent;
- [ ] request, user, breadcrumb, context, payload, URL, header, cookie, and device fields are absent;
- [ ] only allowlisted tags and extras remain;
- [ ] support reference and fingerprint correlate with the public receipt;
- [ ] source-mapped stack resolves without exposing a public source map;
- [ ] replay, logs, tracing, profiling, feedback, and sessions remain disabled;
- [ ] the synthetic smoke flag is removed immediately after verification.

## Approval record

Approval must be an explicit user statement in the implementation task, such as `Approve Halaalvest external production diagnostics under the observability transmission policy`. Resuming the goal without that statement is not approval. If internal-only mode is selected, ADR-018 and the master tracker are updated to record that external diagnostics are intentionally out of scope for Halaalvest.

# Architecture

## Purpose

This file documents the intended high-level architecture, service boundaries, and design principles.

## How To Use

- Update when introducing major modules, services, or cross-cutting patterns.
- Link ADRs for important architectural decisions.

## Target Architecture

- SaaS marketing web application.
- Tenant application that serves each cooperative's public homepage, shared auth, and protected workspace routes on one host.
- API/backend service for auth, business workflows, notifications, and reporting.
- Relational database for transactional consistency.
- Background jobs for scheduled tasks such as repayment generation, reminders, and statement preparation.
- Offline-capable client experience with synchronization for low-connectivity environments.

## Implemented Scaffold

- Bun workspace monorepo orchestrated with Turbo.
- App layout now centers on `apps/marketing`, `apps/dashboard`, and `apps/api`, with `apps/dashboard` absorbing the former tenant-site responsibility into one host-aware tenant app.
- `apps/marketing` now uses a server-driven marketing-state switch so the main landing route can render either a pre-launch page or the full launch landing experience from environment configuration. `MARKETING_EARLY_ACCESS_ENABLED` controls whether public CTAs route through early access and whether `/signup` requires an approved token before setup can begin.
- `apps/marketing` and `apps/dashboard` now share one env-driven homepage visibility config through `packages/domain/src/modules/marketing.ts`, allowing non-production platform marketing roots to redirect to `/signup` and tenant roots to redirect to `/login` when `SHOW_HOME_PAGE` is disabled; production marketing keeps the homepage available so visitors use the early access form.
- `apps/marketing` now also uses a `src/` layout so route files, marketing sections, and server-side config helpers are separated more cleanly in the same direction as the reference applications.
- `apps/api` now uses a Hono + tRPC foundation with grouped routers and shared request context.
- Shared packages are split by responsibility: `auth`, `db`, `domain`, `notifications`, `notifications-react`, `ui`, `utils`, `eslint-config`, and `tsconfig`.
- `packages/db` now owns tenant resolution, auth seed/query scaffolding, and runtime-status boundaries instead of exporting one flat demo helper.
- `packages/db` now also exposes an optional Prisma client runtime so repository callers can switch from seed-backed reads to DB-backed reads without changing call sites.
- `packages/auth` now owns scoped session cookie naming, request session-scope helpers, and role hierarchy helpers.
- Dashboard auth now uses signed, expiring, host-scoped session tokens; server context derives the user only from the verified session payload and ignores client-supplied auth headers.
- Domain logic is intended to flow from `packages/domain` into apps, not the reverse.
- Notification behavior is intended to flow from `packages/notifications` into web surfaces through `packages/notifications-react`, not be recreated per app.
- Shared server notification delivery now uses explicit `console`, opt-in `qa_routed`, and production-default `live` modes. QA routing is supported in every runtime, including production; it maps exact reserved `.test` recipient domains to tester inboxes at the provider-envelope boundary, blocks unmatched recipients, preserves application identity, and records original/delivered recipient metadata.
- Tenant host resolution and proxy-based header injection are handled in shared utilities plus the dashboard app's Next `proxy.ts` entry point, which sanitizes internal auth/tenant headers before setting trusted tenant context.
- Dashboard public and protected pages now consume tenant resolution through app-level server context loaders rather than hardcoded sample-only page state.
- Dashboard workspace modules now use server-rendered loaders to surface onboarding progress plus members, recent contributions, and charge setup without introducing a separate client-side data layer.
- Dashboard routes now also sit inside a shared role-filtered shell with a registry-driven sidebar and route-aware header, borrowing the information architecture idea from the local `gnd` site-nav pattern while keeping route data ownership local to each page.
- Initial cooperative setup now hands off from `/getting-started` to a dedicated `/onboarding-success` route once finance and operation setup are complete. The setup gate returns admins to that route while member migration is the next action, then returns them to migration review after all required member records are applied.
- Dashboard UI now uses a Midday-style `src/` architecture under `apps/dashboard/src`, with route grouping in `src/app`, canonical shell and page composition in `src/components/dashboard`, table atoms in `src/components/tables/core`, domain table views in `src/components/tables/<domain>`, and route/data helpers in `src/lib/<domain>`.
- The old dashboard `features/`, `primitives/`, `data-display/`, and `shell/` buckets have been retired in favor of the `src/components/*` and `src/lib/*` structure so new work follows one standard by default.
- `apps/mobile` is an Expo Router app aligned with the EwaTrade mobile pattern, including EAS development/preview Android build commands, a root account-aware EAS runner, preview OTA update publishing, manual Expo Updates checking, and environment-driven Expo project identity.
- Reusable list filtering now lives in `src/components/search-filter`, split into typed search/filter shell, active filter pills, field renderers, and label utilities that match the Midday invoice search-filter interaction while preserving server-first URL params.
- The members workspace now demonstrates the intended route pattern inside the new layout: `/members` route files stay thin, member loaders and URL-filter mapping live in `src/lib/members`, member page widgets live in `src/components/members`, and member-facing tables live in `src/components/tables/members`.
- The members list route now explicitly follows the local Midday table-page anatomy, using the Midday invoice/customers pattern of `ScrollableContent -> CollapsibleSummary -> compact toolbar/search-filter -> table surface`.
- The business workspace now follows the Midday invoices-style table and sheet anatomy: the route server-prefetches tRPC list/setup/summary data, the table owns virtualized querying and row selection, and sheet flows are split across an open button, sheet wrapper, sheet header, content router, and form context.
- The contributions and loans workspaces now follow the same structure, with route entrypoints under `src/app/(app)/(sidebar)/*`, shared page framing in `src/components/dashboard`, and domain-specific page composition in `src/components/tables/contributions` and `src/components/tables/loans`.
- The authenticated dashboard now also includes a dedicated `/analytics` route so overview, analytics, tables, reports, and settings all live inside the same Midday-style app structure.
- Local named-host development is routed through `/Users/M1PRO/Documents/code/local-infra-kit` with profile `halaalvest`, the exact root contract `.env` plus one of `.env.local`, `.env.dev`, `.env.preview`, or `.env.production`, shared service readiness, and Portless workspace scripts. Each selected mode file's `HALAALVEST_DATABASE_URL` is authoritative; the toolkit resolves profile-specific database URLs first while retaining `DATABASE_URL` for other unmigrated projects. Halaalvest Prisma and runtime code read only the profile-specific name. The toolkit derives transient Docker Compose settings from a local URL and skips Docker for hosted URLs. Halaalvest uses `127.0.0.1:55434/halaalvest`, allowing its PostgreSQL container to run beside School Clerk on `55432`. Tenant/public-site URLs use `*.halaalvest.localhost`, while local dashboard workspaces use `*.halaalvest-dash.localhost` and remain behind the HTTPS Portless entrypoint. Direct-port and path-style URLs such as `localhost:1441/<tenant>` remain explicit troubleshooting fallbacks.
- Current tenant resolution is implemented through shared repository/query scaffolding and seed-backed lookup flows, with Prisma execution intended to replace the seed store after migrations and generation are formalized.

## Core Design Principles

- Multi-tenant by design.
- Ledger-backed financial events.
- Explicit workflow states for loans and repayments.
- Strong authorization boundaries by tenant and role.
- Configuration-driven cooperative policies where safe.

## Candidate Modules

- Auth and tenant access.
- Member management.
- Member classification and deduction source management.
- Contributions.
- Charges engine.
- Loans.
- Repayments.
- Ledger and statements.
- Reporting and dividends.
- Notifications.
- Offline sync engine.
- Office operations tooling.

## Open Decisions

- Modular monolith package layout adopted. See `brain/decisions/ADR-001-monorepo-scaffold.md`.
- Plot-keys-aligned multi-app and notification architecture adopted. See `brain/decisions/ADR-003-align-app-and-api-architecture-with-plot-keys.md`.
- Seed-backed tenant and auth repository scaffolding adopted as the transitional bridge to real Prisma-backed runtime queries. See `brain/decisions/ADR-004-adopt-seed-backed-tenant-resolution-and-scoped-session-foundation.md`.
- Role-filtered dashboard navigation registry adopted for operational route scaling. See `brain/decisions/ADR-005-adopt-role-filtered-dashboard-navigation-registry.md`.
- Dashboard UI primitive layer adopted for authenticated workspace consistency. See `brain/decisions/ADR-006-adopt-dashboard-ui-primitives-layer.md`.
- Midday-style dashboard `src` architecture adopted for authenticated workspace routes and components. See `brain/decisions/ADR-007-adopt-midday-style-dashboard-src-architecture.md`.
- Explicit all-environment QA email domain routing adopted at the shared notification transport boundary. See `brain/decisions/ADR-010-adopt-explicit-qa-email-domain-routing.md`.
- Payment and disbursement integrations strategy.
- Exact ledger model and posting rules.
- TODO: define offline sync conflict-resolution strategy for money-related events.

## Error And Observability Boundary

- `packages/errors` owns typed classification, original-cause preservation, safe transport envelopes, support references, and user presentation helpers. It has no framework or telemetry dependency.
- `packages/observability` owns production/DSN gating and bounded redacted capture context. It never accepts nested request or domain payloads.
- `apps/api` normalizes all tRPC procedures, exposes `data.appError`, returns safe REST envelopes, and propagates `x-request-id`.
- Dashboard crash audit evidence is deliberately separate from technical diagnostics and contains only an allowlisted classification receipt.
- Dashboard, marketing, mobile, and background jobs render the same public presentation contract; jobs retry only classified retryable failures and return a safe terminal receipt.
- Production telemetry is designed as one capture boundary per runtime. External SDK transmission is not active until explicitly approved and configured; see ADR-018.

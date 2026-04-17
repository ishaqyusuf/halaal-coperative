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
- App layout now centers on `apps/web`, `apps/dashboard`, and `apps/api`, with `apps/dashboard` absorbing the former tenant-site responsibility into one host-aware tenant app.
- `apps/web` now uses a server-driven marketing-state switch so the main landing route can render either a pre-launch page or the full launch landing experience from environment configuration.
- `apps/web` and `apps/dashboard` now share one env-driven homepage visibility config through `packages/domain/src/modules/marketing.ts`, allowing the platform marketing root to redirect to `/signup` and tenant roots to redirect to `/login` when `SHOW_HOME_PAGE` is disabled.
- `apps/web` now also uses a `src/` layout so route files, marketing sections, and server-side config helpers are separated more cleanly in the same direction as the reference applications.
- `apps/api` now uses a Hono + tRPC foundation with grouped routers and shared request context.
- Shared packages are split by responsibility: `auth`, `db`, `domain`, `notifications`, `notifications-react`, `ui`, `utils`, `eslint-config`, and `tsconfig`.
- `packages/db` now owns tenant resolution, auth seed/query scaffolding, and runtime-status boundaries instead of exporting one flat demo helper.
- `packages/db` now also exposes an optional Prisma client runtime so repository callers can switch from seed-backed reads to DB-backed reads without changing call sites.
- `packages/auth` now owns scoped session cookie naming, request session-scope helpers, and role hierarchy helpers.
- Domain logic is intended to flow from `packages/domain` into apps, not the reverse.
- Notification behavior is intended to flow from `packages/notifications` into web surfaces through `packages/notifications-react`, not be recreated per app.
- Tenant host resolution and proxy-based header injection are handled in shared utilities plus the dashboard app's Next `proxy.ts` entry point.
- Dashboard public and protected pages now consume tenant resolution through app-level server context loaders rather than hardcoded sample-only page state.
- Dashboard workspace modules now use server-rendered loaders to surface onboarding progress plus members, recent contributions, and charge setup without introducing a separate client-side data layer.
- Dashboard routes now also sit inside a shared role-filtered shell with a registry-driven sidebar and route-aware header, borrowing the information architecture idea from the local `gnd` site-nav pattern while keeping route data ownership local to each page.
- Dashboard UI now uses a Midday-style `src/` architecture under `apps/dashboard/src`, with route grouping in `src/app`, canonical shell and page composition in `src/components/dashboard`, table atoms in `src/components/tables/core`, domain table views in `src/components/tables/<domain>`, and route/data helpers in `src/lib/<domain>`.
- The old dashboard `features/`, `primitives/`, `data-display/`, and `shell/` buckets have been retired in favor of the `src/components/*` and `src/lib/*` structure so new work follows one standard by default.
- The members workspace now demonstrates the intended route pattern inside the new layout: `/members` route files stay thin, while member loaders live in `src/lib/members` and member-facing tables/views live in `src/components/tables/members`.
- The members list route now explicitly follows the local Midday table-page anatomy, using the Midday invoice/customers pattern of `ScrollableContent -> CollapsibleSummary -> compact toolbar -> table surface`.
- The contributions and loans workspaces now follow the same structure, with route entrypoints under `src/app/(app)/(sidebar)/*`, shared page framing in `src/components/dashboard`, and domain-specific page composition in `src/components/tables/contributions` and `src/components/tables/loans`.
- The authenticated dashboard now also includes a dedicated `/analytics` route so overview, analytics, tables, reports, and settings all live inside the same Midday-style app structure.
- Local named-host development is supported through `portless` scripts and the shared environment bootstrap script.
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
- Payment and disbursement integrations strategy.
- Exact ledger model and posting rules.
- TODO: define offline sync conflict-resolution strategy for money-related events.

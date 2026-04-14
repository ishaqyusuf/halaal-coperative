# Architecture

## Purpose
This file documents the intended high-level architecture, service boundaries, and design principles.

## How To Use
- Update when introducing major modules, services, or cross-cutting patterns.
- Link ADRs for important architectural decisions.

## Target Architecture
- SaaS marketing web application.
- Tenant dashboard application for internal cooperative workflows.
- Tenant public site application for each cooperative's external presence.
- API/backend service for auth, business workflows, notifications, and reporting.
- Relational database for transactional consistency.
- Background jobs for scheduled tasks such as repayment generation, reminders, and statement preparation.
- Offline-capable client experience with synchronization for low-connectivity environments.

## Implemented Scaffold
- Bun workspace monorepo orchestrated with Turbo.
- App layout follows the same top-level shape used in `plot-keys`: `apps/web`, `apps/dashboard`, `apps/tenant-site`, and `apps/api`.
- `apps/web` now uses a server-driven marketing-state switch so the main landing route can render either a pre-launch page or the full launch landing experience from environment configuration.
- `apps/web` now also uses a `src/` layout so route files, marketing sections, and server-side config helpers are separated more cleanly in the same direction as the reference applications.
- `apps/api` now uses a Hono + tRPC foundation with grouped routers and shared request context.
- Shared packages are split by responsibility: `auth`, `db`, `domain`, `notifications`, `notifications-react`, `ui`, `utils`, `eslint-config`, and `tsconfig`.
- `packages/db` now owns tenant resolution, auth seed/query scaffolding, and runtime-status boundaries instead of exporting one flat demo helper.
- `packages/db` now also exposes an optional Prisma client runtime so repository callers can switch from seed-backed reads to DB-backed reads without changing call sites.
- `packages/auth` now owns scoped session cookie naming, request session-scope helpers, and role hierarchy helpers.
- Domain logic is intended to flow from `packages/domain` into apps, not the reverse.
- Notification behavior is intended to flow from `packages/notifications` into web surfaces through `packages/notifications-react`, not be recreated per app.
- Tenant host resolution and proxy-based header injection are handled in shared utilities plus Next `proxy.ts` entry points for dashboard and tenant-site apps.
- Dashboard and tenant-site pages now consume tenant resolution through app-level server context loaders rather than hardcoded sample-only page state.
- Dashboard workspace modules now use server-rendered loaders to surface onboarding progress plus members, recent contributions, and charge setup without introducing a separate client-side data layer.
- Dashboard routes now also sit inside a shared role-filtered shell with a registry-driven sidebar and route-aware header, borrowing the information architecture idea from the local `gnd` site-nav pattern while keeping route data ownership local to each page.
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
- Payment and disbursement integrations strategy.
- Exact ledger model and posting rules.
- TODO: define offline sync conflict-resolution strategy for money-related events.

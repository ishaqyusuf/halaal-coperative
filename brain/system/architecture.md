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
- `apps/api` now uses a Hono + tRPC foundation with grouped routers and shared request context.
- Shared packages are split by responsibility: `auth`, `db`, `domain`, `notifications`, `notifications-react`, `ui`, `utils`, `eslint-config`, and `tsconfig`.
- Domain logic is intended to flow from `packages/domain` into apps, not the reverse.
- Notification behavior is intended to flow from `packages/notifications` into web surfaces through `packages/notifications-react`, not be recreated per app.
- Tenant host resolution and proxy-based header injection are handled in shared utilities plus Next `proxy.ts` entry points for dashboard and tenant-site apps.
- Local named-host development is supported through `portless` scripts and the shared environment bootstrap script.

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
- Payment and disbursement integrations strategy.
- Exact ledger model and posting rules.
- TODO: define offline sync conflict-resolution strategy for money-related events.

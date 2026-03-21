# Architecture

## Purpose
This file documents the intended high-level architecture, service boundaries, and design principles.

## How To Use
- Update when introducing major modules, services, or cross-cutting patterns.
- Link ADRs for important architectural decisions.

## Target Architecture
- Web application for admins and members.
- API/backend service for auth, business workflows, and reporting.
- Relational database for transactional consistency.
- Background jobs for scheduled tasks such as repayment generation, reminders, and statement preparation.
- Offline-capable client experience with synchronization for low-connectivity environments.

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
- Monolith first vs modular monolith packages.
- Payment and disbursement integrations strategy.
- Exact ledger model and posting rules.
- TODO: define offline sync conflict-resolution strategy for money-related events.

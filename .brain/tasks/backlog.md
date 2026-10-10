# Backlog

## Purpose
This file tracks confirmed work that is not yet in progress.

## How To Use
- Add clear, actionable backlog items.
- Move items to `in-progress.md` when active.

## Current Backlog
- Generate the first Prisma migration for the grouped cooperative schema.
- Replace seed-backed repository scaffolding in `packages/db/src/queries/` with real Prisma client access and queries.
- Implement DB-backed tenant-domain onboarding, custom-domain management, and hostname verification flows.
- Expand role model and permission matrix into full auth/session workflows and app route protection.
- Build tenant onboarding and workspace bootstrap flows using the new server context foundation.
- Implement first dashboard modules: members, contributions, and charges.
- Decide whether the first release is web-only or includes mobile.
- Write ADR for ledger strategy.
- Write ADR for tenant isolation strategy.
- Define halal-compliant loan and dividend policy model in detail.
- Design offline sync strategy for financial events.
- Define office software scope and staff workflows.
- Harden the full charge lifecycle: add auditable settlement for `pay_separately` applications, transaction-safe workflow idempotency, immutable applicability snapshots, and exact tenant/target validation across all automated charge posting paths.
- Define and implement the separately authorized Foodstuff Purchase cash/ledger release posting, inventory/commodity tracking, persisted accounting-review metadata, and approved-profit destination workflow. The current cycle release and accepted accounting remain audited operational evidence only.

## Next 10 Phases
- Phase 8: Build tenant onboarding, workspace bootstrap, and first-run configuration flows for new cooperatives.
- Phase 9: Implement dashboard member management with list, detail, create, update, and status-change flows backed by `packages/db/src/queries/members.ts`.
- Phase 10: Implement contribution posting, contribution history, and contribution plan workflows backed by `packages/db/src/queries/contributions.ts`.
- Phase 11: Implement charge definition and charge application management backed by `packages/db/src/queries/charges.ts`.
- Phase 12: Implement loan request submission, review, and approval workflows with role-aware API guards.
- Phase 13: Implement repayment schedules, repayment posting, overdue tracking, and collection follow-up flows.
- Phase 14: Complete ledger strategy ADR and wire all financial writes through balanced ledger posting paths.
- Phase 15: Build tenant-site publishing and tenant-controlled public content/configuration flows.
- Phase 16: Expand notifications from in-app scaffolding to channel delivery, tenant preferences, and user notification history.
- Phase 17: Build tenant-domain onboarding, custom-domain verification, and tenant self-service domain management.

- Audit cross-application payment-reference uniqueness under concurrent financial postings. Charge settlement currently checks for an existing tenant reference before insertion, while LedgerTransaction.reference is not unique. Same-application status claims protect corrections/settlement but do not serialize separate applications using the same reference.

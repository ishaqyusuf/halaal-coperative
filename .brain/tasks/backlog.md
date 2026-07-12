# Backlog

## Purpose
This file tracks confirmed work that is not yet in progress.

## How To Use
- Add clear, actionable backlog items.
- Move items to `in-progress.md` when active.

## Current Backlog
- Halaalvest Mobile UI Flow Refresh - Triage: ready-for-agent. Spec: `brain/specs/2026-07-12-halaalvest-mobile-ui-flow-refresh.md`. Refresh the completed mobile MVP UI flow using the selected Dribbble/Pinterest-inspired direction while preserving the accepted EwaTrade-aligned Expo/tRPC/NativeWind architecture and server-owned finance behavior.
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

# Cooperative Operation Profile Full QA Map

## Destination

A release-grade QA report for the Cooperative Operation Profile implementation, with browser/mobile/API/database evidence, known blockers separated from new defects, critical bugs fixed or ticketed, and a clear ship/no-ship recommendation for this feature.

## Notes

- Domain: Halaalvest tenant Operation Profile, Getting Started, Settings, procurement, Foodstuff Purchase, payment receipts, Collection Sources, Collection Source batch posting, dashboard/member/mobile visibility, reports, overview queues, audit evidence, and tenant/role boundaries.
- This map is execution-oriented because the requested destination is full QA testing. Each ticket should run the relevant QA, fix critical/high defects found in that ticket when feasible, and record evidence. Do not broaden into unrelated product work.
- Consult `.brain/audits/2026-07-12-operation-profile-qa.md`, `.brain/product/halaal-cooperative-operating-model.md`, `.brain/features/procurement-requests.md`, `.brain/features/food-purchase-operations.md`, `.brain/features/member-commitments-and-payment-allocation.md`, `.brain/features/member-payment-receipts.md`, `.brain/api/contracts.md`, `.brain/api/permissions.md`, and `.scratch/cooperative-feature-configuration/spec.md`.
- Start with environment/data readiness. Browser QA must identify the app URL, login path, tenant/demo credentials, local DB state, migration status, and whether destructive DB reset is allowed before any UI evidence is trusted.
- Treat finance-safety defects as critical: cross-tenant reads/writes, unauthorized service activation, create actions bypassing Operation Profile, settlement paths disappearing for existing obligations, double posting, silent money mutation, missing audit evidence, or member/staff role leakage.
- Local tracker convention: child tickets live in `.scratch/cooperative-operation-profile-full-qa/issues/`.

## Decisions so far

## Not yet specified

- Exact local browser QA URL and credentials until environment/data readiness is resolved.
- Whether local database drift should be reset, migrated, or QA should use a seeded isolated database until environment/data readiness is resolved.
- Exact native mobile device/simulator matrix until mobile QA decides whether Expo/browser/API smoke is enough for this feature pass.
- Exact bug-fix tickets until each QA slice reports defects.
- Exact final ship/no-ship recommendation until all open QA tickets are resolved.

## Out of scope

- Redesigning Operation Profile UX beyond defects found during QA.
- Adding project financing or emergency financing to the first Operation Profile catalog.
- Foodstuff Purchase profit distribution semantics.
- Bank integration, payroll/ministry API integration, production deployment, app-store release, and formal penetration testing.
- Load testing beyond lightweight responsiveness/performance smoke.

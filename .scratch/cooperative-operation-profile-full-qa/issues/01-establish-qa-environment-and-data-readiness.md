# 01 — Establish QA Environment And Data Readiness

**What to build:** A trustworthy local QA baseline for Operation Profile testing, including app URLs, tenant/demo access, database state, migration status, seed/demo records, and a clear non-destructive reset or isolation decision before browser or mobile QA begins.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] Record the exact app/API/mobile commands, URLs, tenant hosts, and credentials or access path used for QA.
- [x] Verify whether the current local database schema matches committed Prisma migrations, or document drift precisely.
- [x] Decide whether QA uses the existing local DB, a reset local DB, a separate test DB, or mocked/API-only flows.
- [x] Confirm demo records exist for procurement, Foodstuff Purchase, payment receipts, Collection Sources, and member accounts.
- [x] Record blockers before any downstream browser/mobile QA starts.

## Approved Comment

Run QA in two phases:

1. Website QA first
   - dashboard web app
   - Getting Started
   - Settings -> Operation Profile
   - staff workspaces
   - member web portal
   - reports, overview, navigation
   - server guards reached from web actions

2. Mobile QA second
   - mobile API DTOs
   - member home/service tiles
   - More sections
   - receipt/procurement/Foodstuff Purchase submit behavior
   - native/simulator smoke only after website QA is stable

For this ticket, prepare the environment for the website phase first:

- confirm web app/API commands and reachable local URLs;
- identify tenant host/login path and available demo credentials or seed access path;
- inspect local PostgreSQL and Prisma migration state;
- decide whether website QA uses the existing DB, reset DB, separate QA DB, or API-only/mocked flows;
- confirm demo data for Operation Profile, procurement, Foodstuff Purchase, payment receipts, Collection Sources, batch posting, staff users, and member users;
- record blockers before website QA starts.

Do not reset or force-push database changes without explicit approval.

## Implementation Evidence

Website QA command:

- `bun run dev --local --filter dashboard marketing`

Expected clean Portless URLs:

- Marketing/public: `halaalvest.localhost`
- Tenant dashboard: `tenant.halaalvest-dash.localhost`

Observed local environment:

- `bun run db:start` passed: local PostgreSQL container is running and ready.
- `bun run db:generate` passed and generated Prisma Client 7.7.0.
- First `bun --cwd packages/db prisma migrate status` reported 7 pending migrations, including `20260712120000_add_tenant_operation_profile` and `20260712130000_add_collection_source_contribution_batches`.
- First `bun run db:push --local` refused to continue without `--accept-data-loss` because Prisma warned about a new unique constraint. Per the approved QA rule, this was not forced.
- `bun run db:migrate:deploy` applied the 7 pending committed migrations successfully.
- Follow-up `bun --cwd packages/db prisma migrate status` passed: database schema is up to date.
- Follow-up `bun run db:push --local` passed: database is in sync with the Prisma schema.
- `bun --cwd packages/db prisma validate` passed.

Observed local data after migration:

- Tenants: 11
- Users: 11
- Members: 124
- Collection Sources / `deductionSources`: 0
- Procurement requests: 0
- Foodstuff Purchase cycles: 0
- Foodstuff Purchase applications: 0
- Member payment receipts: 0
- Tenant Operation Profiles: 0
- Tenant service settings: 0
- Collection Source contribution batches: 0

Access path:

- Development login page provides a dev account picker when `NODE_ENV !== "production"`.
- Dev picker fills password `password123`.
- Existing local tenant/admin records include `codex-qa-620c`, `codex-qa-620d`, and other seeded tenant admin accounts.

QA data decision:

- Use the existing local DB after the committed migrations were applied.
- Do not reset the local DB.
- Create any required procurement, Foodstuff Purchase, payment receipt, Collection Source, and batch-posting records during the relevant QA slices, because the current local DB has no records for those feature areas.

Resolved Portless blocker:

- Stale Portless proxy state was cleared with `portless proxy stop`.
- Portless was restarted with `portless proxy start -p 1355 --no-tls --wildcard`.
- `bun run dev --local --filter dashboard marketing` now starts the dashboard and marketing apps through Portless.
- Marketing/public route is reachable at `http://halaalvest.localhost:1355`.
- Dashboard platform route is reachable at `http://halaalvest-dash.localhost:1355`.
- Generic tenant-pattern route `http://tenant.halaalvest-dash.localhost:1355` resolves through the wildcard proxy, but the seeded QA tenant used for browser evidence is `http://codex-qa-620c.halaalvest-dash.localhost:1355`.
- The tenant login page exposes the seeded dev account `codex.qa.620c@example.com` through the local dev account picker.
- Browser QA may proceed using the approved Portless hostnames and the seeded QA tenant host; raw localhost URLs are still not used for evidence.

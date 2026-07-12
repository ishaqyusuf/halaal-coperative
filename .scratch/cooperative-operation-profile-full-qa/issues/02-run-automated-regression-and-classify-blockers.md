# 02 — Run Automated Regression And Classify Blockers

**What to build:** An automated regression baseline for Operation Profile that separates feature regressions from existing unrelated blockers and fixes critical/high Operation Profile failures where feasible.

**Blocked by:** 01 — Establish QA Environment And Data Readiness.

**Status:** completed

- [x] Run package typechecks for touched workspaces and the root typecheck where possible.
- [x] Run focused Operation Profile tests and the full root test suite where possible.
- [x] Run Prisma validation/migration/push checks according to the environment decision.
- [x] Classify every failure as Operation Profile defect, pre-existing blocker, environment blocker, or intentionally skipped.
- [x] Fix critical/high Operation Profile automated failures within this ticket when feasible, or create follow-up bug tickets.

## Approved Comment

Run automated checks in the same split order: website/server first, mobile second.

Website/server phase:

- Prisma schema validation and non-destructive migration/push checks where possible.
- `packages/db`, `apps/api`, and `apps/dashboard` typechecks.
- Focused Operation Profile tests for defaults, service modes, procurement, Foodstuff Purchase, payment receipts, Collection Sources, batch posting, navigation, reports, and overview queues.
- Root test suite, with failures classified as Operation Profile defect, website blocker, environment blocker, or unrelated existing blocker.

Mobile phase:

- `apps/mobile` typecheck.
- Mobile API/router tests for Operation Profile DTOs and member create guards.
- Mobile smoke checks only after website/server checks are stable.

Any critical/high Operation Profile regression found here should be fixed before browser QA continues. Existing unrelated failures should be documented, not mixed into the Operation Profile verdict.

## Implementation Evidence

Database/schema checks:

- `bun run db:start` passed.
- `bun run db:generate` passed.
- `bun --cwd packages/db prisma validate` passed.
- `bun --cwd packages/db prisma migrate status` passed after committed migrations were applied.
- `bun run db:push --local` passed after committed migrations were applied.
- `bun run db:push --prod` was not run because production DB validation was not explicitly required for this local QA pass.

Targeted package typechecks:

- `bun --filter @halaalvest/db typecheck` passed.
- `bun --filter @halaalvest/api typecheck` passed.
- `bun --filter @halaalvest/dashboard typecheck` passed.
- `bun --filter @halaalvest/mobile typecheck` passed.

Focused Operation Profile and related workflow tests:

- `bun test packages/db/src/queries/operation-profile.test.ts packages/db/src/queries/procurement.test.ts packages/db/src/queries/food-purchase.test.ts packages/db/src/queries/payment-receipts.test.ts packages/db/src/queries/collection-source-batches.test.ts` passed: 56 tests.
- `bun test apps/dashboard/src/lib/navigation/lib.test.ts apps/dashboard/src/lib/payment-receipts/load-payment-receipts-page.test.ts` passed: 4 tests.
- `bun test apps/api/src/routers/mobile.route.test.ts apps/api/src/routers/mobile-auth.route.test.ts` passed: 80 tests.
- `bun test packages/notifications/src/types/payment-receipts.test.ts scripts/dev.test.ts scripts/db-push.test.ts scripts/database-profile.test.mjs` passed: 23 tests.

Broad baseline:

- `bun run typecheck` passed: 16 successful package tasks.
- `bun run test` passed: 3 successful package test tasks, including 325 `@halaalvest/db` tests and 86 `@halaalvest/api` tests.
- Previous unrelated broad-baseline failures were fixed during QA hardening:
  - Package `tsconfig` files now keep Bun test files out of package `tsc --noEmit` runs where those packages do not typecheck tests as source.
  - Backfill lifecycle guards now keep historical migration tools locked after finalization while still allowing audited member amount history updates during live operations before that member's backfill is applied.

Failure classification:

- No focused Operation Profile automated failures were found.
- No broad automated failures remain after QA hardening.
- Browser QA remains blocked by ticket 01's Portless clean-URL blocker, not by an Operation Profile automated regression.

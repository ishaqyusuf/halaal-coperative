# 12 - Finalize Operation Profile QA And Documentation

**What to build:** Brain docs, automated coverage, and manual QA prove the end-to-end Operation Profile works across setup, admin, member, mobile, receipts, procurement, Foodstuff Purchase, and collection-source posting.

**Blocked by:** 02 - Add Operation Profile Review To Getting Started; 03 - Add Operation Profile Settings Workspace; 05 - Enforce Procurement Active Obligation Limits; 07 - Enforce Foodstuff Purchase Active Obligation And Open-Cycle Rules; 10 - Add Collection Source Batch Posting; 11 - Apply Operation Profile To Navigation, Member Portal, Mobile, And Reports.

**Status:** completed

- [x] Product and domain documentation describe Operation Profile, Collection Source, service access modes, Procurement rules, Foodstuff Purchase rules, and batch posting.
- [x] Permission and audit documentation reflects who can update operation-profile settings and what is logged.
- [x] Automated tests cover the externally observable behavior of service modes and key finance guards.
- [x] Manual QA covers one new-tenant setup path from setup mode through Operation Profile to live readiness.
- [x] Manual QA covers staff and member behavior for disabled, office-managed, member-self-service, and read-only services.
- [x] Completion notes record checks run, skipped checks, residual risks, and any follow-up tickets.

## Completion Notes

- Brain audit: `.brain/audits/2026-07-12-operation-profile-qa.md`.
- Primary docs updated: `.brain/product/halaal-cooperative-operating-model.md`, `.brain/database/schema.md`, `.brain/database/migrations.md`, `.brain/api/contracts.md`, `.brain/api/permissions.md`, `.brain/features/procurement-requests.md`, `.brain/features/food-purchase-operations.md`, `.brain/features/member-commitments-and-payment-allocation.md`, `.brain/features/member-payment-receipts.md`, `.brain/progress.md`, and `.brain/tasks/done.md`.
- Checks passed: `bun --cwd packages/db typecheck`; `bun --cwd apps/api typecheck`; `bun --cwd apps/dashboard typecheck`; `bun --cwd apps/mobile typecheck`; `bun test packages/db/src/queries/operation-profile.test.ts`; `bun test packages/db/src/queries/procurement.test.ts`; `bun test packages/db/src/queries/food-purchase.test.ts`; `bun test packages/db/src/queries/members.test.ts`; `bun test packages/db/src/queries/collection-source-batches.test.ts`; `bun test packages/db/src/queries/dashboard.test.ts`; `bun test apps/dashboard/src/lib/payment-receipts/load-payment-receipts-page.test.ts`; `bun test apps/dashboard/src/lib/navigation/lib.test.ts`; `bun test apps/api/src/routers/mobile.route.test.ts`; `git diff --check`.
- Attempted checks: `bun db:migrate` hung in the Docker startup wrapper; direct `prisma migrate dev` reached the local database but stopped on pre-existing drift that would require reset; direct `prisma db push` stopped on a data-loss warning and was not forced; root `bun run typecheck` stopped on existing `packages/backfill` `bun:test` type declarations; root `bun test` now passes 511 tests and has 7 remaining failures in `packages/db/src/queries/backfill.test.ts` lifecycle-guard stubs unrelated to Operation Profile.
- Residual risks: native mobile device QA, source-batch correction/reversal design, Foodstuff Purchase profit distribution rules, and deferred project/emergency financing profile catalog entries.

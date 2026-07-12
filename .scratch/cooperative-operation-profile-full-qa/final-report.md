# Cooperative Operation Profile Full QA Report

Date: 2026-07-12

## Verdict

Recommendation: **Ship the Cooperative Operation Profile feature for the current pre-launch/local QA milestone.**

No unresolved critical or high-priority Operation Profile blockers remain from this QA pass. The feature correctly gates procurement, Foodstuff Purchase, member payment receipts, Collection Sources, and Collection Source batch posting by tenant configuration while preserving existing obligations/history and settlement paths.

## Tested Setup

- Dev command: `bun run dev --local --filter dashboard marketing`
- Browser hosts:
  - `halaalvest.localhost`
  - `tenant.halaalvest-dash.localhost`
  - QA tenant host used most heavily: `amanah-multipurpose.halaalvest-dash.localhost:1355`
- DB readiness rules recorded for the project:
  - Local: `bun run db:push --local`
  - Production: `bun run db:push --prod`
- QA tracker: `.scratch/cooperative-operation-profile-full-qa/issues/`
- Screenshots: `.scratch/cooperative-operation-profile-full-qa/screenshots/`

## Tickets Completed

- `01 — Establish QA Environment And Data Readiness`
- `02 — Run Automated Regression And Classify Blockers`
- `03 — QA Getting Started And Settings Operation Profile`
- `04 — QA Staff Service Workspaces And Server Guards`
- `05 — QA Member Web Portal Service Visibility And Actions`
- `06 — QA Mobile Operation Profile Behavior`
- `07 — QA Reports Overview Navigation And Preservation`
- `08 — QA Security Audit And Tenant Boundaries`
- `09 — QA Visual Responsive And Accessibility Pass`

## Defects Found And Fixed

- Getting Started no longer 500s when Operation Profile defaults initialize.
- Duplicate-create races during Operation Profile/service-setting default initialization now recover by re-reading the existing row.
- Invalid positive-integer policy caps are rejected with readable errors.
- `/settings/operation-profile` remains reachable during first-run setup.
- `/members` no longer emits Decimal hydration warnings or server-side relative tRPC URL errors.
- Member dashboard no longer shows disabled unused procurement/Foodstuff Purchase cards/actions.
- Dashboard collapsed sidebar links now expose accessible names during keyboard focus.

## Verification Commands

- `bun --filter @halaalvest/db typecheck`
- `bun --filter @halaalvest/dashboard typecheck`
- `bun run typecheck:mobile`
- `bun test apps/api/src/routers/mobile.route.test.ts`
- `bun run --filter @halaalvest/mobile check:smoke`
- `bun run --filter @halaalvest/mobile check:native-imports`
- `bun test packages/db/src/queries/procurement.test.ts packages/db/src/queries/food-purchase.test.ts packages/db/src/queries/payment-receipts.test.ts packages/db/src/queries/collection-source-batches.test.ts packages/db/src/queries/members.test.ts apps/dashboard/src/lib/payment-receipts/load-payment-receipts-page.test.ts`
- `bun test apps/dashboard/src/lib/setup-gate.test.ts packages/db/src/queries/operation-profile.test.ts packages/db/src/queries/procurement.test.ts packages/db/src/queries/food-purchase.test.ts packages/db/src/queries/payment-receipts.test.ts packages/db/src/queries/collection-source-batches.test.ts packages/db/src/queries/members.test.ts apps/dashboard/src/lib/navigation/lib.test.ts apps/dashboard/src/lib/payment-receipts/load-payment-receipts-page.test.ts apps/api/src/routers/mobile.route.test.ts`
- Final compact regression: `bun test packages/db/src/queries/operation-profile.test.ts apps/dashboard/src/lib/navigation/lib.test.ts apps/api/src/routers/mobile.route.test.ts packages/db/src/queries/members.test.ts`

Final compact regression result: **105 pass, 0 fail**.

## Browser QA Summary

- Enabled/self-service tenant staff pages returned 200 for procurement, Foodstuff Purchase, payment receipts, members, contributions, reports, Getting Started Operation Profile, Settings Operation Profile, and import batches.
- Disabled/default tenant staff pages preserved direct route access with blocked-state copy instead of crashing.
- Member self-service tenant showed allowed create actions for receipts, procurement, and Foodstuff Purchase.
- Disabled/default member tenant hid disabled unused service actions.
- Temporary office-only/read-only checks verified member routes can keep history visible without create/submit links.
- Disabled-with-history preservation was verified by creating a local QA procurement record, disabling procurement again, and confirming staff/member history plus report/nav evidence remained visible while new requests stayed closed.
- Security checks verified member-role users cannot render Operation Profile settings or member-admin controls; direct member tRPC mutation attempts are rejected.

## Mobile QA Summary

- Mobile router tests passed.
- Mobile typecheck passed.
- Mobile smoke coverage passed: 21 routes, 5 viewports, 14 flows.
- Native import guard passed: 100 files.
- Source review confirmed mobile member home, More, receipts, procurement, and Foodstuff Purchase screens consume server DTO visibility/create flags instead of reintroducing hidden services locally.
- Native simulator/device evidence was not required because this slice is DTO-driven and no native-only behavior/layout defect was found.

## Visual And Accessibility Summary

- Desktop and narrow screenshots were captured for staff and member Operation Profile-related surfaces.
- Operation Profile mode controls have accessible names.
- Member action links and submit paths have accessible names.
- No page-level narrow-width horizontal scroll was found; secondary tabs and dense tables use expected horizontal scrolling.
- Cosmetic residual: the desktop Settings top nav can truncate `Trust readiness` near the user profile area at 1366px. This is not blocking because the nav remains reachable and no required Operation Profile/financial control is clipped.

## Residual Risks

- Local DB-backed standalone mobile DTO smoke could not be completed because new shell Prisma/Docker exec probes to the local Postgres container on port `55434` hung or returned unreachable errors while the running dashboard dev server continued serving authenticated browser QA routes.
- Foodstuff Purchase profit distribution remains intentionally deferred until a separate allocation rule is approved.
- Batch-posting correction/reversal workflows remain future work.
- Production deployment, external payroll/ministry integration, bank integration, formal penetration testing, and app-store release remain out of scope for this pre-launch QA milestone.

## Ship Recommendation

Ship for the current branch/local QA milestone. The remaining issues are cosmetic or environment/out-of-scope notes, not Operation Profile correctness blockers. Do not treat this report as a production deployment sign-off until production DB readiness, deployment checks, and any launch-specific security review are run.

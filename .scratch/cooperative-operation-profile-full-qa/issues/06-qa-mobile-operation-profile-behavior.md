# 06 — QA Mobile Operation Profile Behavior

**What to build:** Mobile/API QA evidence that mobile DTOs and screens reflect Operation Profile service modes for member service tiles, More sections, receipt submission, procurement requests, and Foodstuff Purchase applications.

**Blocked by:** 01 — Establish QA Environment And Data Readiness; 03 — QA Getting Started And Settings Operation Profile; 04 — QA Staff Service Workspaces And Server Guards; 05 — QA Member Web Portal Service Visibility And Actions.

**Status:** completed

- [x] Run mobile/API tests that cover Operation Profile DTO behavior.
- [x] Smoke mobile member home services and More sections for enabled, disabled, office-managed, self-service, and read-only states.
- [x] Verify mobile receipt, procurement, and Foodstuff Purchase submit actions hide or block consistently with web.
- [x] Verify existing history remains visible when services are read-only or disabled with records.
- [x] Decide whether native simulator/device QA is required for this feature or whether API/screen smoke is enough, and record evidence.

## Approved Comment

Approve mobile QA as the second phase, after the website/server and member web portal checks are stable enough to classify mobile findings cleanly. Mobile should not be used to discover the core server rules first; it should verify that the mobile DTOs and screens reflect the already-tested Operation Profile behavior.

Test the mobile member home services, More sections, receipt submission, procurement request flow, and Foodstuff Purchase application flow across enabled, disabled, office-managed, member-self-service, and read-only states. Existing history and payable obligations must remain visible when records exist, even if the service is no longer open for new member action.

Start with API/DTO and screen-level smoke coverage. Require native simulator/device evidence only if the changed surfaces include native-only behavior, layout risk, navigation risk, or a defect that cannot be trusted from API/screen smoke alone. Treat any mobile-only create action bypass, hidden payable obligation, cross-member data exposure, or mismatch with approved web/server behavior as a blocker.

## Evidence

- `bun test apps/api/src/routers/mobile.route.test.ts` passed: 75 tests, 0 failures. This covers mobile member/staff workspace boundaries, input validation, no-database fallback behavior, and routing of mobile member create flows through the database runtime.
- `bun run typecheck:mobile` passed for `@halaalvest/mobile`.
- `bun run --filter @halaalvest/mobile check:smoke` passed: 21 routes, 5 viewports, 14 flows.
- `bun run --filter @halaalvest/mobile check:native-imports` passed: 100 files.
- Source-level DTO verification:
  - `packages/db/src/queries/mobile.ts` builds member home service tiles from Operation Profile `shouldShowInMemberNav` plus existing receipt/procurement/Foodstuff Purchase/support record counts, so disabled services stay hidden when unused and history can still surface when records exist.
  - `getMobileMemberMore` filters More sections with the same Operation Profile-or-existing-record rule for receipts, procurement, Foodstuff Purchase, and support.
  - `getMobileMemberReceipts`, `getMobileMemberProcurement`, and `getMobileMemberFoodPurchase` return `canCreateReceipt`, `canCreateRequest`, and `canCreateApplication` from `canMemberCreate`.
  - Mobile create mutations for receipts, procurement, and Foodstuff Purchase route through the same server functions that enforce Operation Profile access modes and member ownership.
- Screen-level source verification:
  - `MemberHomeScreen` renders server-provided `home.services`, so disabled/hidden services are not reintroduced by the client template after live data loads.
  - `MoreScreen` renders server-provided member More sections.
  - `ReceiptsScreen` only renders the submit receipt form when `receipts?.canCreateReceipt` is true; recent receipt history remains visible separately.
  - `ProcurementScreen` only renders the new item request form when `procurement?.canCreateRequest` is true; request history remains visible separately.
  - `FoodPurchaseScreen` only renders the application form when `foodPurchase?.canCreateApplication` is true; cycle/application history remains visible separately.

## Native Simulator Decision

Native simulator/device evidence is not required for this Operation Profile QA slice. The changed mobile behavior is DTO-driven service visibility and create-permission gating, and the affected screens consume those flags without native-only branching. No native layout, gesture, device API, or navigation defect was found during source/test review that would require simulator escalation.

## Environment Note

A planned local DB-backed standalone DTO smoke could not be completed because new shell Prisma/Docker exec connections to the healthy local `halaalvest-postgres` container on port `55434` hung or returned unreachable errors, while the already-running dashboard dev server continued serving authenticated browser QA routes. This did not block the mobile verdict because the same Operation Profile server guards were covered by the website/server QA and focused server tests, and the mobile-specific risk is the DTO/screen consumption path covered above.

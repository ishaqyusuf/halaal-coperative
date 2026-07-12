# 04 — QA Staff Service Workspaces And Server Guards

**What to build:** Website/server QA evidence that staff workspaces and server actions enforce Operation Profile modes for procurement, Foodstuff Purchase, payment receipts, Collection Sources, and Collection Source batch posting while preserving existing records and settlement paths.

**Blocked by:** 03 — QA Getting Started And Settings Operation Profile.

**Status:** completed

- [x] Test staff create visibility and server rejection for `disabled`, `office_only`, `member_self_service`, and `read_only`.
- [x] Verify procurement active-obligation cap and active-financing blocking behavior.
- [x] Verify Foodstuff Purchase open-cycle and active-obligation cap behavior.
- [x] Verify staff payment receipt capture remains available where intended and product-specific allocation categories follow service state plus payable obligations.
- [x] Verify member Collection Source assignment is visible only when enabled and rejects inactive/cross-tenant sources.
- [x] Verify Collection Source batch staging, row update, exception, partial post, duplicate prevention, and audit evidence.

## Approved Comment

Approve website/server QA for staff workspaces as the next gate. Test staff/admin create paths and direct server actions for each Operation Profile mode: `disabled`, `office_only`, `member_self_service`, and `read_only`. The expected rule is: UI may hide entry points, but server actions must still be the source of truth and reject disallowed writes.

This QA should cover procurement, Foodstuff Purchase, payment receipts, Collection Source assignment, and Collection Source batch posting. It should also verify preservation: closing or disabling a service must not hide existing records, payable obligations, settlement targets, pending reviews, reports, or audit evidence.

Finance-safety checks should be treated as blockers: active procurement/Foodstuff obligation caps, active financing blocking, duplicate batch prevention, cross-tenant source rejection, inactive source rejection, partial batch posting behavior, adjustment/exception audit evidence, and receipt allocation categories matching both service state and existing payable obligations.

## Implementation Evidence

Environment and hosts:

- Approved dev command used: `bun run dev --local --filter dashboard marketing`.
- Portless routes used: `http://halaalvest.localhost:1355`, `http://halaalvest-dash.localhost:1355`, and tenant subdomains on `halaalvest-dash.localhost`.
- Enabled/self-service evidence tenant: `amanah-multipurpose.halaalvest-dash.localhost:1355`, admin `sadiq.lawal74@example.test`.
- Disabled/default live evidence tenant: `kano-unity-community-society.halaalvest-dash.localhost:1355`, admin `judson.rohan.7253@example.test`.

Defects found and fixed:

- Amanah `/procurement` initially hit a `tenant_service_settings_tenant_service_key` unique-constraint race while ensuring default service settings. Default service-setting initialization now recovers from duplicate-create/upsert races by re-reading the existing row.
- Amanah `/members` rendered a `TRPCClientError` from a server-side relative `/api/trpc/members.list` fetch and React warnings for Prisma Decimal objects. Member table rows now serialize `totalSavingsSnapshot` to a plain number, and the member table uses a non-suspense infinite query with the existing skeleton so SSR no longer attempts the browser-relative tRPC URL.

Browser/server evidence:

- Disabled/default Kano staff routes returned `200` for `/procurement`, `/food-purchase`, `/payment-receipts`, and `/contributions`.
- Disabled/default Kano `/procurement` rendered `Procurement` plus blocked-state copy containing `not enabled` and `has not enabled`, with no `TRPCClientError`, relative URL, Decimal, or plain-object warning markers.
- Disabled/default Kano `/food-purchase` rendered `Foodstuff Purchase` plus blocked-state copy containing `not enabled` and `has not enabled`, with no runtime error markers.
- Enabled Amanah staff routes returned `200` for `/procurement`, `/food-purchase`, `/payment-receipts`, `/contributions`, and `/members`.
- Enabled Amanah `/procurement` rendered `New procurement request`, member/item/vendor/requested-cost fields, repayment months, and `Save request`, with no runtime error markers.
- Enabled Amanah `/food-purchase` rendered `Monthly fund release`, cycle month/release amount fields, `Member application`, requested amount, payback months, and `Save application`, with no runtime error markers.
- Enabled Amanah `/payment-receipts` rendered `Submit receipt` and allocation-related staff receipt content with no runtime error markers.
- Enabled Amanah `/contributions` rendered `Collection Source`, `Batch posting`, and `Stage` content with no runtime error markers.
- Enabled Amanah `/members` rendered `Members`, `New member`, `Import members`, and `Open link generator` with no `TRPCClientError`, `Failed to parse URL`, `Only plain objects`, or `Decimal objects` markers. The latest server log for `/members` is a clean `GET /members 200`.

Automated evidence:

- Focused staff/server guard suite passed: `bun test packages/db/src/queries/procurement.test.ts packages/db/src/queries/food-purchase.test.ts packages/db/src/queries/payment-receipts.test.ts packages/db/src/queries/collection-source-batches.test.ts packages/db/src/queries/members.test.ts apps/dashboard/src/lib/payment-receipts/load-payment-receipts-page.test.ts` passed 75 tests.
- Broader Operation Profile regression passed after fixes: `bun test apps/dashboard/src/lib/setup-gate.test.ts packages/db/src/queries/operation-profile.test.ts packages/db/src/queries/procurement.test.ts packages/db/src/queries/food-purchase.test.ts packages/db/src/queries/payment-receipts.test.ts packages/db/src/queries/collection-source-batches.test.ts packages/db/src/queries/members.test.ts apps/dashboard/src/lib/navigation/lib.test.ts apps/dashboard/src/lib/payment-receipts/load-payment-receipts-page.test.ts apps/api/src/routers/mobile.route.test.ts` passed 161 tests.
- `bun --filter @halaalvest/db typecheck` passed.
- `bun --filter @halaalvest/dashboard typecheck` passed.

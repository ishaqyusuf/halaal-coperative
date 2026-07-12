# Operation Profile QA And Documentation Audit

## Scope

- Source mode: `$implement` from `.scratch/cooperative-operation-profile/issues`.
- Source spec: `.scratch/cooperative-feature-configuration/spec.md`.
- Current status: Implemented tenant Operation Profile configuration across Getting Started, Settings, service guards, staff/member web surfaces, mobile service tiles/actions, payment receipt categories, reports, overview queues, member Collection Source assignment, and staged Collection Source batch posting.

## Behavior Covered

- Operation Profile defaults are created for new tenants with payment receipts office-managed, procurement disabled, Foodstuff Purchase disabled, support self-service, Collection Sources disabled, and Collection Source batch posting disabled.
- Tenant admins and super admins can review/update Operation Profile settings. More restrictive access changes require a change reason and write audit evidence with before/after values.
- Procurement create flows are gated by service access mode and active obligation caps. Existing procurement history, repayment schedules, payment receipt settlement, reports, and member/mobile history remain readable when new requests are disabled or read-only.
- Foodstuff Purchase create flows are gated by service access mode, open-cycle requirement, and active unpaid application caps. Existing cycles, applications, payment evidence, accounting evidence, reports, and member/mobile history remain readable when new applications are disabled or read-only.
- Payment receipt submission is gated for member self-service while staff office capture remains staff-role controlled. Product-specific allocation categories are hidden unless enabled or an existing payable obligation needs settlement.
- Collection Source assignment is independent from member type and is exposed during member create/edit/backfill when enabled.
- Collection Source batch posting stages source/month rows before posting, records row exceptions, blocks unsupported rows, prevents duplicate source/month batches, posts selected collected rows through the normal contribution flow, and audits staging, row updates, and posting.
- Dashboard navigation, member portal cards, mobile service tiles, mobile More sections, overview queues, and report export cards hide disabled unused services while preserving access to services with existing records or pending work.

## Manual QA Matrix

- New-tenant setup path: open Getting Started, choose setup mode, review Operation Profile, save conservative defaults, enable selected services, then confirm live-readiness steps adapt to the saved profile.
- Staff access modes: verify `disabled`, `office_only`, `member_self_service`, and `read_only` for procurement, Foodstuff Purchase, payment receipts, support, Collection Sources, and batch posting. Staff create actions should be available only when the mode allows staff creation.
- Member access modes: verify member web and mobile create actions appear only for `member_self_service`, while office-managed/read-only services still show existing history when the member has records.
- Settlement preservation: close procurement or Foodstuff Purchase to new requests, then verify approved unpaid obligations can still appear in receipt allocation targets and reports.
- Source collections: assign members to an active Collection Source, stage a period batch, mark collected rows, record exceptions, and post selected rows. Manual/no-source members should not be included in the source batch by default.

## Automated Coverage

- `packages/db/src/queries/operation-profile.test.ts`: default profile creation, restrictive-change reason requirement, and operation-profile persistence behavior.
- `packages/db/src/queries/procurement.test.ts`: access-mode and active-obligation-cap guards for procurement create flows.
- `packages/db/src/queries/food-purchase.test.ts`: access-mode, open-cycle, and active-obligation-cap guards for Foodstuff Purchase.
- `apps/api/src/routers/mobile.route.test.ts`: mobile member create guards and Operation Profile-aware DTO behavior.
- `apps/dashboard/src/lib/payment-receipts/load-payment-receipts-page.test.ts`: member receipt create visibility and payment receipt category behavior.
- `packages/db/src/queries/members.test.ts`: Collection Source member assignment and validation behavior.
- `packages/db/src/queries/collection-source-batches.test.ts`: staged-first batch behavior, duplicate prevention, row blockers, partial posting, and tenant isolation.
- `apps/dashboard/src/lib/navigation/lib.test.ts`: Operation Profile hidden-path filtering preserves role boundaries while hiding disabled unused services.

## Residual Risks

- Native simulator/device QA was not part of this local slice; mobile coverage is API/type/test backed.
- The batch-posting workflow intentionally posts contribution records only; future correction/reversal workflows should be designed before supporting post-batch amendments.
- Foodstuff Purchase profit distribution remains explicitly deferred until a separate approved allocation rule exists.
- Project financing and emergency financing were intentionally deferred from the first Operation Profile catalog.

## Brain Files Updated

- `.brain/product/halaal-cooperative-operating-model.md`
- `.brain/features/procurement-requests.md`
- `.brain/features/food-purchase-operations.md`
- `.brain/features/member-commitments-and-payment-allocation.md`
- `.brain/features/member-payment-receipts.md`
- `.brain/api/contracts.md`
- `.brain/api/permissions.md`
- `.brain/database/schema.md`
- `.brain/database/migrations.md`
- `.brain/audits/2026-07-12-operation-profile-qa.md`
- `.brain/progress.md`
- `.brain/tasks/done.md`

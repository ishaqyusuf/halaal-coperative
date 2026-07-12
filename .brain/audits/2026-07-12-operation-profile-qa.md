# Operation Profile QA And Documentation Audit

## Scope

- Source mode: `$implement` from `.scratch/cooperative-operation-profile/issues`.
- Source spec: `.scratch/cooperative-feature-configuration/spec.md`.
- Current status: Implemented tenant Operation Profile configuration across Getting Started, Settings, service guards, staff/member web surfaces, mobile service tiles/actions, payment receipt categories, reports, overview queues, member Collection Source assignment, and staged Collection Source batch posting.

## Behavior Covered

- Operation Profile defaults are created for new tenants with payment receipts office-managed, procurement disabled, Foodstuff Purchase disabled, support self-service, Collection Sources disabled, and Collection Source batch posting disabled.
- Operation Profile default initialization recovers from concurrent duplicate-create races for both the tenant profile singleton and per-service settings by re-reading the existing row after unique-constraint conflicts.
- Tenant admins and super admins can review/update Operation Profile settings. More restrictive access changes require a change reason and write audit evidence with before/after values.
- Operation Profile Settings remains reachable during first-run setup, so admins can review service access from either Getting Started or Settings before live workspace operations are unlocked.
- Operation Profile policy caps reject submitted non-positive or non-whole-number values with readable errors instead of silently falling back to previous values.
- Procurement create flows are gated by service access mode and active obligation caps. Existing procurement history, repayment schedules, payment receipt settlement, reports, and member/mobile history remain readable when new requests are disabled or read-only.
- Foodstuff Purchase create flows are gated by service access mode, open-cycle requirement, and active unpaid application caps. Existing cycles, applications, payment evidence, accounting evidence, reports, and member/mobile history remain readable when new applications are disabled or read-only.
- Payment receipt submission is gated for member self-service while staff office capture remains staff-role controlled. Product-specific allocation categories are hidden unless enabled or an existing payable obligation needs settlement.
- Collection Source assignment is independent from member type and is exposed during member create/edit/backfill when enabled.
- Collection Source batch posting stages source/month rows before posting, records row exceptions, blocks unsupported rows, prevents duplicate source/month batches, posts selected collected rows through the normal contribution flow, and audits staging, row updates, and posting.
- Staff workspace routes were browser-checked through Portless for disabled/default and enabled/self-service tenants. Disabled procurement and Foodstuff Purchase routes preserve direct route access with blocked-state copy instead of throwing, while enabled staff routes expose the expected create/stage forms.
- The member registry route serializes Prisma Decimal money snapshots before hydration and avoids server-side browser-relative tRPC calls for the infinite table, so `/members` renders without `TRPCClientError` or Decimal object warnings.
- Member dashboard visibility distinguishes service visibility from create permission. Disabled unused procurement and Foodstuff Purchase no longer show member dashboard cards/actions, while office-managed/read-only direct member service routes can remain readable without request/submit links.
- Reports and navigation hide disabled unused services but re-surface service navigation/export evidence when records exist. Browser QA verified disabled Kano procurement reappeared in nav, reports, staff history, and member history after a local QA procurement record was created, while new request actions remained closed.
- Security QA verified member-role users cannot render Operation Profile settings or member-admin controls, and direct member tRPC attempts to update Operation Profile are rejected with an access-denied workspace-action error. Audit logs preserve before/after Operation Profile metadata, restrictive-change reasons, actor IDs, and restrictive service keys.
- Visual and accessibility QA captured authenticated desktop and narrow-width browser evidence for Getting Started, Operation Profile Settings, staff service workspaces, reports, import batches, contributions, and member portal views. Critical Operation Profile/member controls have accessible names, no page-level narrow-width horizontal scroll was found, and collapsed dashboard sidebar links now expose accessible labels while focused.
- Mobile QA verified the Operation Profile consumption path through mobile router tests, mobile typecheck, mobile smoke coverage, native-import safety, and source review of member home services, More sections, receipts, procurement, and Foodstuff Purchase screens. Native simulator/device evidence was not required because this slice is driven by server DTO visibility/create flags rather than native-only behavior.
- Dashboard navigation, member portal cards, mobile service tiles, mobile More sections, overview queues, and report export cards hide disabled unused services while preserving access to services with existing records or pending work.
- Full QA report is recorded at `.scratch/cooperative-operation-profile-full-qa/final-report.md`. Recommendation: ship for the current pre-launch/local QA milestone; no unresolved critical/high Operation Profile blockers remain.

## Manual QA Matrix

- New-tenant setup path: open Getting Started, choose setup mode, review Operation Profile, save conservative defaults, enable selected services, then confirm live-readiness steps adapt to the saved profile.
- Staff access modes: verify `disabled`, `office_only`, `member_self_service`, and `read_only` for procurement, Foodstuff Purchase, payment receipts, support, Collection Sources, and batch posting. Staff create actions should be available only when the mode allows staff creation.
- Member access modes: verify member web and mobile create actions appear only for `member_self_service`, while office-managed/read-only services still show existing history when the member has records.
- Settlement preservation: close procurement or Foodstuff Purchase to new requests, then verify approved unpaid obligations can still appear in receipt allocation targets and reports.
- Source collections: assign members to an active Collection Source, stage a period batch, mark collected rows, record exceptions, and post selected rows. Manual/no-source members should not be included in the source batch by default.

## Automated Coverage

- `packages/db/src/queries/operation-profile.test.ts`: default profile creation, concurrent default initialization recovery, restrictive-change reason requirement, invalid policy cap rejection, and operation-profile persistence behavior.
- `apps/dashboard/src/lib/setup-gate.test.ts`: Operation Profile Settings remains available during initial setup while unrelated settings pages stay gated.
- `packages/db/src/queries/procurement.test.ts`: access-mode and active-obligation-cap guards for procurement create flows.
- `packages/db/src/queries/food-purchase.test.ts`: access-mode, open-cycle, and active-obligation-cap guards for Foodstuff Purchase.
- `apps/api/src/routers/mobile.route.test.ts`: mobile member create guards and Operation Profile-aware DTO behavior.
- `apps/dashboard/src/lib/payment-receipts/load-payment-receipts-page.test.ts`: member receipt create visibility and payment receipt category behavior.
- `packages/db/src/queries/members.test.ts`: Collection Source member assignment and validation behavior, plus member-table money snapshot serialization for client-safe hydration.
- `packages/db/src/queries/collection-source-batches.test.ts`: staged-first batch behavior, duplicate prevention, row blockers, partial posting, and tenant isolation.
- `apps/dashboard/src/lib/navigation/lib.test.ts`: Operation Profile hidden-path filtering preserves role boundaries while hiding disabled unused services.

## Residual Risks

- Local DB-backed standalone mobile DTO smoke was not completed because new shell Prisma/Docker exec probes to the local Postgres container on port `55434` hung or returned unreachable errors while the running dashboard dev server still served authenticated browser QA routes. Mobile coverage is API/type/smoke/source-review backed and shares the server guards verified by website/server QA.
- The desktop settings top navigation can truncate `Trust readiness` near the user profile area at 1366px. This is tracked as cosmetic because the affected navigation remains reachable and no Operation Profile financial label or required control is clipped.
- The batch-posting workflow intentionally posts contribution records only; future correction/reversal workflows should be designed before supporting post-batch amendments.
- Foodstuff Purchase profit distribution remains explicitly deferred until a separate approved allocation rule exists.
- Project financing and emergency financing were intentionally deferred from the first Operation Profile catalog.

## Final QA Verdict

- Final compact regression: `bun test packages/db/src/queries/operation-profile.test.ts apps/dashboard/src/lib/navigation/lib.test.ts apps/api/src/routers/mobile.route.test.ts packages/db/src/queries/members.test.ts` passed with 105 tests and 0 failures.
- Ship recommendation: ship the Cooperative Operation Profile feature for the current pre-launch/local QA milestone.
- Production deployment sign-off remains separate from this local QA report.

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

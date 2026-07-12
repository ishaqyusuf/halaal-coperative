# Cooperative Operation Profile Specification

## Product Decision

Halaalvest should introduce a **Cooperative Operation Profile**: a first-class tenant setup and settings surface that records how a cooperative operates before live workflows are used.

The profile is not a generic feature-toggle screen. It is an operational finance setup step that controls which services the cooperative runs, who may initiate each service, and which policy rules govern the service.

The primary setup question is:

> How does this cooperative operate?

The Operation Profile should shape Getting Started, admin navigation, member portal actions, mobile service tiles, payment receipt categories, reports, and server-side action guards.

## Terminology

- **Operation Profile**: tenant-level operational setup covering enabled services, access modes, and related setup choices.
- **Collection Source**: product-facing name for the existing `DeductionSource` concept. Examples: ministry payroll, employer payroll, bank transfer group, cash/manual group, cooperative office, self-employed/manual.
- **Foodstuff Purchase**: the consistent product name for the monthly committee-led foodstuff purchase workflow. Avoid mixing this with "Food Purchase" in UI copy.
- **Office-managed**: staff create or manage requests for members.
- **Members can request**: linked members may initiate the request from web/mobile.
- **View existing records only**: records remain visible and payable, but no new requests can be created.

## Service Access Modes

Each configurable service should have a per-service access mode:

| Mode | Product Label | Meaning |
| --- | --- | --- |
| `disabled` | Not used | The cooperative does not operate this service. New staff and member requests are blocked. Existing records remain inspectable if present. |
| `office_only` | Office-managed | Staff can create/manage requests for members. Members may see status/history but cannot initiate requests. |
| `member_self_service` | Members can request | Members can initiate requests from web/mobile; staff can still create/review/manage records. |
| `read_only` | View existing records only | No new requests from staff or members, but existing records, active obligations, statements, reports, and audit history remain visible. |

## First-Wave Catalog

| Area | Treatment |
| --- | --- |
| Members, KYC, roles, audit | Always on. |
| Monthly commitments/savings | Always on; collection method is configurable. |
| Shares | Always configured through existing share setup. |
| Support cases | On by default for member trust and audit evidence. |
| Payment receipts | Default `office_only`; can become `member_self_service`. |
| Procurement | Optional; default `disabled`. |
| Foodstuff Purchase | Optional; default `disabled`. |
| Collection sources | Optional; enabled when cooperative uses ministry/employer/payroll/manual source grouping. |
| Collection-source batch posting | Off until selected. |
| Emergency financing | Deferred unless treated as a loan product mode. |
| Project financing | Deferred for this effort because accounting semantics need separate confirmation. |

## Data Model

Use hybrid persistence:

- Keep money policy rules in `TenantPolicy`.
- Add a separate operation-profile/service-settings layer for service activation and access.
- Keep typed finance limits as typed columns, not flexible JSON.

Keep in `TenantPolicy`:

- share configuration mode and share limits
- financing policy
- procurement payback policy
- Foodstuff Purchase payback policy
- strict commitment rules
- active-financing overlap rules
- member signup access mode, unless later unified carefully

Add a service availability model, likely `TenantOperationProfile` plus `TenantServiceSetting`, or a simple typed service-settings table.

Suggested service setting fields:

- `tenantId`
- `serviceKey`: `payment_receipts`, `procurement`, `food_purchase`, `support_cases`, later maybe `project_financing` or `emergency_financing`
- `accessMode`: `disabled`, `office_only`, `member_self_service`, `read_only`
- `reviewedAt`
- `reviewedByUserId`
- timestamps

Typed new limits:

- `procurementMaximumActiveObligationsPerMember`, default `1`
- `foodPurchaseRequiresOpenCycle`, default `true`
- `foodPurchaseMaximumActiveObligationsPerMember`, default `1`

## Getting Started UX

Add **Operation Profile** immediately after the existing **Choose the setup mode** step and before detailed finance setup.

Recommended sequence:

1. Setup mode: Historical backfill or Brought forward.
2. Operation Profile: how the cooperative operates.
3. Detailed setup steps that adapt to the selected profile.

Operation Profile sections:

- Commitments and savings: always on; ask whether collection is manual/admin posting, member receipt upload, collection-source/payroll batch, or mixed.
- Shares: always configured; link into existing monthly history vs unit-based setup.
- Member payment receipts: `office_only` or `member_self_service`, with disabled only if the cooperative does not want receipt tracking yet.
- Procurement: disabled, office-managed, members can request, or read-only; reveal policy fields when enabled.
- Foodstuff Purchase: disabled, office-managed, members can request, or read-only; reveal policy fields when enabled.
- Collection sources: ask whether members pay through ministry/employer/payroll/manual source grouping.
- Support cases: default on; member access follows member account availability.

UX shape:

- Compact service rows.
- Short operational descriptions.
- Segmented access-mode control.
- "Configure" disclosure for sub-settings.
- Recommended defaults based on setup mode and existing data.
- No marketing copy.

## Settings UX

After Getting Started, admins should revisit this from:

**Settings -> Cooperative Profile -> Operation Profile**

This belongs under Cooperative Profile because it controls how the cooperative operates, not only finance policy. Finance policy details can still live under Finance Setup.

Only tenant admins and super admins should change service activation/access. Finance officers may continue changing finance policy where already allowed.

## Runtime Gating

Global rule:

> Service settings control new actions and default visibility, but they must never erase existing financial history, outstanding obligations, reports, statements, or audit evidence.

Dashboard navigation:

- Hide disabled services with no records.
- Still show services with active obligations, pending reviews, or historical records requiring governance.
- Member action links appear only for `member_self_service`.
- Member status/history links may appear for `office_only` or `read_only` when the member has records.

Admin routes:

- Return explicit disabled/read-only states, not 404.
- Hide and server-block create forms unless staff create is allowed.
- Allow inspection of existing records when records exist.

Member portal and mobile:

- Build service cards from operation profile plus member-specific records.
- `member_self_service`: CTA plus history.
- `office_only`: history/status plus "Contact the cooperative office to request this."
- `read_only`: history/outstanding obligations only.
- `disabled`: hidden unless history/outstanding obligations exist.

Payment receipts:

- Filter allocation categories by operation profile.
- Always keep commitment, special savings, and active loan repayment where applicable.
- Show procurement only if enabled/readable or the member has active unpaid procurement schedules.
- Show Foodstuff Purchase only if enabled/readable or the member has approved unpaid applications.
- Settlement of existing obligations must remain possible even when new requests are closed.

Reports:

- Hide unused service exports by default.
- Show exports when records exist, even if the service is disabled/read-only.

Server guards:

- Every create/submit action must check service mode.
- Staff create requires `office_only` or `member_self_service`.
- Member create requires `member_self_service`.
- `read_only` blocks new applications but allows viewing and settlement.
- Error messages should be operational, for example: "Procurement is office-managed for this cooperative."

Recommended shared helper:

- `getTenantOperationProfile`
- Derived booleans: `canStaffCreate`, `canMemberCreate`, `canViewExisting`, `canSettleExisting`, `shouldShowInStaffNav`, `shouldShowInMemberNav`

## Procurement Rules

Procurement remains a separate cooperative service, not a loan and not a generic charge.

Settings:

- `procurementAccessMode`, through service settings
- existing `procurementMaximumPaybackMonths`, default `12`
- existing `activeFinancingBlocksProcurement`, default `true`
- existing `procurementAllowsCommitmentReductionDuringPayback`, default `false`
- new `procurementMaximumActiveObligationsPerMember`, default `1`

Use **maximum active procurement obligations per member** instead of "maximum procurement per cycle."

Counting rule:

- Count procurement as active only when it has become real cooperative exposure: `purchased` or `active`, and not fully paid.
- Do not count `submitted`, `under_review`, `rejected`, `cancelled`, or `completed`.
- For v1, `approved` but not purchased is pending review evidence, not an active obligation.

Validation:

- Requested cost must be positive.
- Requested repayment months must be positive and within payback cap.
- If active-financing blocking is enabled, block members with active financing.
- If active unpaid procurement count reaches the active obligation cap, block new requests.
- Staff create requires `office_only` or `member_self_service`.
- Member create requires `member_self_service`.

Evidence:

- Defer procurement guarantors.
- Defer full vendor management and invoice upload.
- Keep `vendorName` optional at request time.
- Require staff purchase activation before repayment schedules begin.
- Strongly recommend purchase reference or purchase note when marking purchased.

## Foodstuff Purchase Rules

Foodstuff Purchase is a separate monthly committee-led service with cycles and member applications.

Settings:

- `foodPurchaseAccessMode`, through service settings
- `foodPurchaseRequiresOpenCycle`, default `true`
- existing `foodPurchaseMaximumPaybackMonths`, default `1`
- existing `foodPurchaseAllowsCommitmentReductionDuringPayback`, default `false`
- new `foodPurchaseMaximumActiveObligationsPerMember`, default `1`

Counting rule:

- Count an active Foodstuff Purchase obligation when an application is `approved` and the approved amount is not fully paid.
- Do not count `submitted`, `under_review`, `rejected`, or `cancelled`.
- Closed cycles do not erase approved unpaid obligations.

Validation:

- New applications require service mode `office_only` or `member_self_service` for staff, and `member_self_service` for members.
- If open cycle is required, applications must target an open cycle.
- Requested amount must be positive.
- Requested payback months must be positive and within payback cap.
- Active unpaid obligations cannot exceed the active obligation cap.
- Receipt allocations to `food_purchase` must target an approved unpaid application.

Accounting caution:

- End-of-cycle accounting and profit evidence remain review evidence for now.
- Do not automatically distribute Foodstuff Purchase profit until a separate allocation rule is decided.
- Avoid hidden interest, penalty, or automatic profit assumptions.

## Collection Sources

Use **Collection Source** in UI and docs, backed by existing `DeductionSource`.

`MemberType` and Collection Source remain separate:

- `MemberType`: civil servant, individual, business.
- Collection Source: how commitment is collected.

Member creation/edit:

- Add Collection Source field.
- Allow "No source / Manual payer."
- If payroll/deduction sources are enabled, make the field visible and recommended but not globally required.
- Payroll/ministry/employer source assignment makes the member eligible for source-based batch posting.

Manual members:

- Use payment receipts when member self-service receipts are enabled.
- Otherwise staff post through office/admin flows.
- Do not include manual members in payroll batches by default.

Do not auto-post money because a member has a collection source.

## Collection Source Batch Posting

Use staged review-first posting.

Workflow:

1. Choose period.
2. Choose active Collection Source.
3. Preview eligible members, active contribution plans, expected commitments, scheduled servicing, and expected total.
4. Stage batch by creating or reusing monthly record rows.
5. Review and edit exceptions.
6. Add payroll/reference note.
7. Confirm posting for selected rows.
8. Keep skipped/exception rows staged or unpaid.

Exception handling:

- No active contribution plan: blocked.
- Commitment changed after staging: warning and refresh/override.
- Existing posted contribution for same period: prevent duplicate posting unless correction workflow is used.
- Partial payment: allowed with visible collection gap.
- Overpayment: follow allocation preference or require explicit split.

Implementation seam:

- Extend monthly records with source filtering/grouping instead of creating a competing batch model.
- Add batch metadata only if needed: collection source id, reference, staged/posted totals, created by, posted by.
- Keep monthly record member rows as posting unit.

## Pre-Launch Rollout

The product is not launched yet, so no complex existing-tenant migration is required.

Defaults:

- Demo and seed tenants can be updated to showcase selected services.
- Empty test tenants use conservative defaults.
- Getting Started requires Operation Profile review before live readiness.

Guardrail:

- Even pre-launch, disabling a service must not delete records or break dev/demo data.

## Audit And Permissions

- Tenant admins and super admins can change operation-profile activation/access.
- Require an audit reason when disabling, making read-only, or removing member self-service.
- Audit operation-profile changes with before/after values, actor, timestamp, and reason where applicable.
- Finance officers keep existing finance-policy permissions where already allowed.
- Service guards must be enforced server-side, not only in UI.

## Implementation Phases

1. Data model and read helper
   - Add service settings and typed caps.
   - Add `getTenantOperationProfile`.
   - Seed defaults.

2. Getting Started and settings UI
   - Add Operation Profile step.
   - Add Settings -> Cooperative Profile -> Operation Profile.

3. Runtime gating
   - Dashboard navigation.
   - Admin loaders and create actions.
   - Member portal and mobile cards/actions.
   - Payment receipt category filtering.

4. Procurement and Foodstuff Purchase caps
   - Active obligation cap checks.
   - Member/staff access-mode guards.
   - Clear operational errors.

5. Collection source batch posting
   - Extend monthly records by source.
   - Add staged batch review and posting flow.

6. Tests, docs, and QA
   - Update Brain docs.
   - Add unit/integration tests.
   - Manual QA across staff/member web and mobile.

## Test Matrix

- `disabled` hides unused services and blocks new creates.
- `office_only` allows staff create and blocks member create.
- `member_self_service` allows member create.
- `read_only` allows viewing/settlement and blocks creates.
- Existing unpaid procurement remains visible and payable after service is closed to new requests.
- Existing unpaid Foodstuff Purchase remains visible and payable after service is closed to new requests.
- Payment receipt categories filter by operation profile.
- Procurement active obligation cap blocks new requests.
- Foodstuff Purchase active obligation cap blocks new applications.
- Foodstuff Purchase requires open cycle when configured.
- Collection Source field is independent from `MemberType`.
- Collection-source batch posting stages before posting.
- Batch exceptions prevent duplicate or unsupported postings.
- Operation-profile changes create audit logs.

## Suggested File Areas

- `packages/db/prisma/models/tenant.prisma`
- `packages/db/prisma/models/member.prisma`
- `packages/db/src/queries/*`
- `packages/db/src/queries/monthly-records.ts`
- `packages/db/src/queries/procurement.ts`
- `packages/db/src/queries/food-purchase.ts`
- `packages/db/src/queries/payment-receipts.ts`
- `packages/db/src/queries/mobile.ts`
- `apps/dashboard/src/components/getting-started-page-view.tsx`
- `apps/dashboard/src/lib/navigation/registry.ts`
- `apps/dashboard/src/lib/*/load-*-page.ts`
- `apps/dashboard/src/components/payment-receipts-view.tsx`
- `apps/mobile/src/screens/*`
- `brain/features/core-cooperative-platform.md`
- `brain/product/halaal-cooperative-operating-model.md`

# Database Relationships

Review access (29 September): `MobileAppReviewGrant` has a unique `userId` relationship to `User` and a `tenantId` relationship to its synthetic QA `Tenant`; both cascade for fixture teardown. It has no relationship to `MobileAppAccessPurchase`, provider events, ledger entries or `TenantSubscription`. AuditLog records issuance/renewal and revocation with the current platform owner as actor.

Personal app-access purchases belong to exactly one `User` and retain a `Tenant` foreign key for purchase/audit provenance; provider chain identity is globally unique. Each purchase has many hashed verified-state events, unique by purchase and evidence hash. Tenant/user deletion cascades to purchase and events for classified QA purge, while normal privacy revocation preserves the user row and does not claim deletion of provider evidence. The access query filters by user and store environment across that user's cooperative memberships. A client purchase verification checks live membership in the selected tenant; tenant/role authorization for feature data remains separate. This query never joins or mutates `TenantSubscription` or member finance records.

Verified native-store entitlement updates compare the stored `TenantSubscription.lastProviderEventAt` with the provider verification time inside the Serializable transaction. Older evidence remains a no-op. If a different payload arrives with the same millisecond timestamp, persistence returns a retryable conflict without changing the subscription or creating another provider event; an exact duplicate at that timestamp is a no-op. A fresh provider requery can then establish a later order. No schema relation or migration changed.

## QA accelerator

- One `QaTesterCredential` may own many `QaClientAuthorization` records; revoking the credential revokes its active authorizations in the same database transaction.
- `createdByUserId` records the platform operator that issued a tester credential without granting that user relation any profile-access authority.
- `qaDomain` intentionally binds credentials and authorizations to `Tenant.qaSourceDomain`; eligible profiles are resolved at read time through active Tenant → User → Membership → optional Member relationships so current role, status, purge, and self-scope facts remain authoritative.

## Production-contract QA harness

- Each stable harness scenario owns one QA-classified `Tenant`, one
  `TenantPolicy`, one `TenantSubscription`, one `TenantOperationProfile`, and six
  `TenantServiceSetting` rows through existing tenant relationships.
- Each scenario owns four exact-domain `User` identities and their primary
  `Membership` role shells. The Starter/healthy Tenant Admin additionally owns a
  non-default Member membership and linked `Member` profile, while every ordinary
  Member role owns its own linked profile. The current deterministic matrix is
  therefore 36 users, 37 memberships, and 10 Member profiles. These shells contain
  no password hash and own no `MobileDeviceSession` until the existing QA
  accelerator creates an ordinary authorized session.
- Scenario state evidence is currently stored in provider-neutral subscription
  `sourceState` for harness traceability. It does not replace authoritative
  feature-owned records; those records must retain their normal tenant/member,
  workflow, ledger, approval, and idempotency relationships.
- The existing QA classification cascade and `QaPurgeRun` counts-only receipt
  remain the cleanup relationship. The harness does not add a second purge root.
- Ticket 30's scoped cleanup resolves the nine stable scenario tenants by their
  plan identity, rechecks each row's QA classification, source domain, slug,
  cooperative prefix, and `updatedAt`, then calls the existing
  `qaPurgeStartedAt` marker and QA-only tenant deletion. Related users, members,
  ledger entries, and audit rows continue to be removed only by the tenant
  aggregate's existing cascades. The rollback rehearsal retains no separate
  database record or relationship.
- Invitation proof links the production-created `User` and default
  `tenant_admin` Membership to the Starter/healthy QA tenant, with no password
  hash, and requires the normal `membership.provisioned` audit plus one
  `NotificationEmail` delivery audit. The proof inspector returns only bounded
  booleans/counts and routing/status; it does not expose either recipient,
  cooperative number, setup URL, provider id, or provider error.
- The Standard pending-review scenario owns one member-submitted
  `MemberPaymentReceipt` with one special-savings allocation and the normal audit
  record. The fixture uses the existing member/tenant relations and does not post
  contribution or ledger evidence before approval.
- The Enterprise published-profit scenario owns one stable
  `MemberShareLedgerEntry` basis, one `ShareBusiness` and linked
  `ShareBusinessProfitEntry`, one `ShareProfitAllocation`, and one linked
  `DividendPeriod`/`DividendAllocation`. Preparation refuses any period that
  contains another business; approval and publication retain their normal
  expected-state, idempotency, allocation-reconciliation, and audit relations.
- The Growth overdue scenario owns one `ContributionPlan` → `Contribution`, one
  `FinancingCycle`, one normal `LoanProduct`, one `LoanRequest` → `Loan`, two
  distinct approval actors, the disbursement ledger transaction, and three
  `RepaymentScheduleItem` rows. Collections refresh derives overdue state from
  the past due dates; reruns reuse the graph.
- The Enterprise stale scenario links one stable QA audit observation to the
  exact `TenantServiceSetting` whose outdated compare-and-set was rejected. The
  setting remains authoritative and unchanged.
- The `member-core-reads` live proof creates two ordinary
  `MobileDeviceSession` rows for the same exact-domain Member: one used by the
  native Android checkpoint and one used by the API proof adapter. Native and
  API sign-out revoke their respective rows, and tester-credential revocation
  invalidates any remaining derived authorization. The successful run verified
  both session rows revoked; no parallel session relationship was introduced.

## Purpose

This file explains important entity relationships and tenant boundaries.

## How To Use

- Update when cardinality or ownership rules change.
- Keep relationship notes tied to business meaning.

## Core Relationships

- A tenant has many members.
- A tenant has many charge definitions.
- A member belongs to one tenant.
- A member has many contributions.
- A member can have many loan requests.
- An approved loan has many repayment schedule items.
- Financial events may create one or more ledger entries.
- A tenant can have one cooperative-wide brought-forward snapshot; the snapshot has no member relation and does not create financial ledger entries.
- A member can have many special-savings withdrawals; each withdrawal belongs to one tenant and member and links one-to-one to its originating support case and balanced ledger transaction.
- A share business can span multiple tenant-wide dividend periods through dated profit entries. Manual profit entries link to the authoritative current writable period; historical backfill/import entries may explicitly link only to a same-tenant period containing their profit date.
- A tenant and user can own many mobile device sessions. Each session may reference the selected membership, and a revocation may reference its actor; membership deletion nulls that optional relation while session validation still fails closed against the signed membership claim.
- One active mobile device session owns at most one `MobilePushRegistration`; each registration also belongs to the same tenant and user. Session deletion cascades the endpoint, while registration and delivery queries independently require an unexpired, unrevoked session.
- A tenant/user pair may own one `MobileUserNotificationPreference` per channel/category. The stored preference is not delivery authority by itself; tenant channel policy, subscription availability, mandatory rules, intended role, and active endpoint state remain authoritative.
- A tenant has exactly one current `TenantSubscription`; that subscription belongs to one `SubscriptionPlan` and owns many add-ons, checkout intents, and invoices. Every child also carries tenant scope so cross-tenant relations can be rejected and indexed directly.
- A `SubscriptionPlan` may be shared by many tenant subscriptions. Provider events may be tenant-linked or retained without a tenant when the provider cannot yet be resolved; provider name plus provider event id is globally unique, while checkout idempotency is unique within a tenant.

## Current Scaffold State

- Prisma relations are now implemented in grouped schema files under `packages/db/prisma/models`.
- Tenant scoping is explicit across money-related records via `tenantId`.
- Reverse relations exist for contribution, charge, loan, repayment, ledger, dividend, offline sync, and audit entities.

## Tenant Rules

- Every money-related record should be traceable to a tenant.
- Cross-tenant references are forbidden.
- Indexes and unique constraints should include tenant context where appropriate.

## Open Questions

- Whether organizations should exist as a distinct entity under a tenant.
- Whether dividend periods should be tenant-wide, plan-specific, or both.
- TODO: decide how offline-created records are uniquely identified before sync.

# QA purge relationships

- QA classification belongs to the tenant isolation root and therefore covers the tenant aggregate through existing cascades.
- `QaPurgeRun` is deliberately non-tenant and has no tenant relation, allowing a counts-only receipt to survive tenant deletion.


### Privacy and legal evidence relationships
AccountPrivacyRequest belongs optionally to User, Tenant and a unique SupportCase; each relation uses SetNull to preserve request evidence without cascading into shared cooperative financial records. LegalAcceptance optionally references User and Tenant with SetNull. User/document/version/hash and user/request-idempotency uniqueness protect repeated writes. Verification operator UUID is evidence, not an erasure-cascading relation.

### Private evidence lifecycle
`DashboardEvidenceUpload` belongs to `Tenant` with `onDelete: Restrict`, so tenant deletion cannot cascade away metadata before private Blob removal. Its optional `User` uploader relation uses `onDelete: SetNull`. The QA purge worker removes provider objects first, then metadata, then the tenant. Production-contract QA cleanup rejects a tenant with remaining evidence rows as a provider-resource blocker.

The link type/UUID is an immutable application-enforced association to one of four business record tables, not a polymorphic database foreign key. It is claimed in the same transaction as the business-record save and checked again against the record ID, URL and tenant at read time.

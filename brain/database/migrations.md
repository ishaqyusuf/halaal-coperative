# Database Migrations

## Purpose
This file records migration history, rationale, and rollout notes.

## How To Use
- Add a new entry whenever a schema migration is introduced.
- Note data backfills, risky changes, and rollback considerations.

## Current Status
- Prisma has been selected and configured with `prisma.config.ts`.
- Multi-file schema loading is configured via `schema: "prisma"`.
- `packages/db/prisma.config.ts` now loads root and workspace `.env` files before resolving `env("DATABASE_URL")`, so Prisma migrate commands work consistently from both the db package and the repo root.
- The initial schema migration exists at `packages/db/prisma/migrations/20260413115737_init/`.
- Notification outbox persistence was added in `packages/db/prisma/migrations/20260414093000_add_notification_outbox/`.
- Tenant onboarding profile persistence was added in `packages/db/prisma/migrations/20260414133000_add_tenant_profile_fields/`.
- Member payment allocation preference was added in `packages/db/prisma/migrations/20260414212000_add_member_payment_allocation_preference/`.
- Member KYC foundations were added in `packages/db/prisma/migrations/20260414214500_add_member_kyc_foundations/`.
- Domain verification details, persisted collection follow-ups, and richer KYC review fields were added in `packages/db/prisma/migrations/20260414195500_domain_dns_and_collection_followups/`.
- Collection-case metadata and multi-document member KYC support were added in `packages/db/prisma/migrations/20260414233000_add_collection_case_and_member_documents/`.
- Persisted import batches and staged apply support were added in `packages/db/prisma/migrations/20260414235500_add_import_batches/`.
- Member signup gating and staff-issued signup links were added in `packages/db/prisma/migrations/20260415101500_add_member_signup_links_and_access_gate/`.

## History
- 2026-04-13: Generated `20260413115737_init` as the first full cooperative schema migration.
- 2026-04-14: Added `20260414093000_add_notification_outbox` with `notification_outbox` and `NotificationDeliveryStatus` so signup verification emails can be persisted before a tenant exists.
- 2026-04-14: Added `20260414133000_add_tenant_profile_fields` with `current_size`, `office_address`, and `start_date` on `tenants` so simplified public onboarding details are stored during workspace bootstrap.
- 2026-04-14: Added `20260414212000_add_member_payment_allocation_preference` with `PaymentAllocationPreference` and `members.payment_allocation_preference` so total payments can follow member-specific leftover allocation rules.
- 2026-04-14: Added `20260414214500_add_member_kyc_foundations` with `KycStatus`, `members.kyc_status`, `government_id_number`, and `kyc_document_url` as the initial member-compliance foundation.
- 2026-04-14: Added `20260414195500_domain_dns_and_collection_followups` with `tenant_domains.verification_details`, richer member KYC review fields, and a new `collection_follow_ups` table so domain verification, collections operations, and KYC review state can be persisted more explicitly.
- 2026-04-14: Added `20260414233000_add_collection_case_and_member_documents` with assignee/stage/resolution fields on `collection_follow_ups` and a new `member_documents` table so collections work can move toward case-management and KYC can support multiple reviewed documents per member.
- 2026-04-14: Added `20260414235500_add_import_batches` with `import_batches` and `import_batch_rows` so imports can be staged, reviewed, and applied later with durable history.
- 2026-04-15: Added `20260415101500_add_member_signup_links_and_access_gate` with `MemberSignupAccessMode`, `tenant_policies.member_signup_access_mode`, `member_signup_links`, and `member_onboarding_requests.signup_link_id` so member signup can stay in-office by default while staff issue controlled remote signup links.

## Migration Entry Template
- Date:
- Migration name:
- Summary:
- Affected tables:
- Backfill needed:
- Rollback considerations:

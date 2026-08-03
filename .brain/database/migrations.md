# Database Migrations

## Purpose
This file records migration history, rationale, and rollout notes.

## How To Use
- Add a new entry whenever a schema migration is introduced.
- Note data backfills, risky changes, and rollback considerations.

## Current Status
- Prisma has been selected and configured with `prisma.config.ts`.
- Multi-file schema loading is configured via `schema: "prisma"`.
- `packages/db/prisma.config.ts` is intentionally thin and reads the `DATABASE_URL` already selected by the root router. The router loads `.env` plus exactly one of `.env.local`, `.env.dev`, `.env.preview`, or `.env.production`; it does not scan package paths or legacy aliases.
- Local PostgreSQL is configured by `.env.local` at `127.0.0.1:55434/halaalvest` on the existing `halaalvest-postgres-data` volume. The shared toolkit derives Compose settings from that URL, so School Clerk may continue using `55432`. A validated custom-format backup of `amanah_cooperative` remains under ignored `.local/db-backups/`; on 2026-07-29, the preserved local database was renamed in place from `amanah_cooperative` to `halaalvest` so the retained volume matches the environment-authoritative connection contract.
- The initial schema migration exists at `packages/db/prisma/migrations/20260413115737_init/`.
- Notification outbox persistence was added in `packages/db/prisma/migrations/20260414093000_add_notification_outbox/`.
- Tenant onboarding profile persistence was added in `packages/db/prisma/migrations/20260414133000_add_tenant_profile_fields/`.
- Member payment allocation preference was added in `packages/db/prisma/migrations/20260414212000_add_member_payment_allocation_preference/`.
- Member KYC foundations were added in `packages/db/prisma/migrations/20260414214500_add_member_kyc_foundations/`.
- Domain verification details, persisted collection follow-ups, and richer KYC review fields were added in `packages/db/prisma/migrations/20260414195500_domain_dns_and_collection_followups/`.
- Collection-case metadata and multi-document member KYC support were added in `packages/db/prisma/migrations/20260414233000_add_collection_case_and_member_documents/`.
- Persisted import batches and staged apply support were added in `packages/db/prisma/migrations/20260414235500_add_import_batches/`.
- Member signup gating and staff-issued signup links were added in `packages/db/prisma/migrations/20260415101500_add_member_signup_links_and_access_gate/`.
- Tenant Operation Profile persistence was added in `packages/db/prisma/migrations/20260712120000_add_tenant_operation_profile/`.
- Collection Source contribution batch posting was added in `packages/db/prisma/migrations/20260712130000_add_collection_source_contribution_batches/`.
- 2026-07-15: `member_opening_balances` gained detailed brought-forward obligation columns for active financing, procurement, and Foodstuff Purchase current/last obligations. Local `bun run db:push --local` was applied after `bun run db:migrate` stopped on pre-existing local drift; a formal migration should be generated once that drift is resolved safely.
- 2026-07-23: Added `tenant_brought_forward_snapshots` for cooperative-wide brought-forward reconciliation totals. `bun db:migrate` was attempted but stopped on the same pre-existing local drift without resetting data; `bun db:push` then applied the additive table successfully.
- 2026-08-03: Extended the standardized database commands to local, hosted development, preview, and production. Each root action defaults to local and accepts only `--local`, `--dev`, `--preview`, or `--prod`. Non-production structure actions accept any valid local or hosted database URL except the production database identity; `db:sync` retains its stricter data-transfer destination rules.

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
- 2026-07-12: Added `20260712120000_add_tenant_operation_profile` with `TenantServiceAccessMode`, `TenantServiceKey`, `tenant_operation_profiles`, `tenant_service_settings`, Operation Profile review metadata, and procurement/Foodstuff Purchase active-obligation policy columns so cooperatives can configure how services operate without deleting historical records.
- 2026-07-12: Added `20260712130000_add_collection_source_contribution_batches` with collection-source batch and row statuses plus `collection_source_contribution_batches` / `collection_source_contribution_batch_rows` so payroll/ministry/employer/manual source collections can be staged, exception-reviewed, and posted into normal contributions with audit evidence.
- 2026-07-15: Added schema fields in `packages/db/prisma/models/backfill.prisma` for brought-forward active financing original amount/repayment plan/paid installments, procurement item/date/original amount/repayment plan/paid installments, and Foodstuff Purchase item/date/original amount/repayment plan/paid installments. Local `db:push --local` succeeded; `db:migrate` did not create a migration because Prisma detected unrelated drift in the local development database and requested a reset, which was intentionally not performed.
- 2026-07-23: Added the one-to-one `TenantBroughtForwardSnapshot` model with as-of date, full member count, savings totals, share-unit count, unit-price snapshot, derived share capital, and reconciliation notes. The local schema was synchronized with `bun db:push` after the required migrate attempt detected existing drift.
- 2026-07-23: Added `MemberSpecialSavingsWithdrawal` with tenant/member/processor ownership and one-to-one support-case and ledger-transaction links. The required `bun db:migrate` attempt again stopped on the existing local drift and requested a destructive reset, which was intentionally not performed; `bun db:push` synchronized the local QA schema successfully.
- 2026-07-28: Adopted the School Clerk-style `local-infra-kit` command and environment contract, initially targeting the conflicting shared port `55432`; backed up and validated the current database at `.local/db-backups/halaalvest-2026-07-28-pre-local-infra-rename.dump`.
- 2026-07-28: Replaced the shared-port assumption with an environment-authoritative contract. `.env.local` now owns `127.0.0.1:55434/halaalvest`, the toolkit parses that URL into transient Compose settings, and no central registry or generated URL is used. No Prisma schema, database, or volume was modified.
- 2026-07-29: Renamed the preserved local PostgreSQL database from `amanah_cooperative` to `halaalvest` in place after the running marketing page exposed the name mismatch. The existing `halaalvest-postgres-data` volume and its data were retained, and the pre-rename custom-format backup remains available under `.local/db-backups/`.

## Migration Entry Template
- Date:
- Migration name:
- Summary:
- Affected tables:
- Backfill needed:
- Rollback considerations:

## Prisma Migration Workflow Rules
- If repository root scripts `db:migrate` and `db:push` exist, run `bun db:migrate` and `bun db:push` after Prisma schema/database updates.
- Do not manually create migration files; use the repository scripts and Prisma workflow.
- Keep migration commands aligned with root `package.json` and `packages/db` scripts.
- Keep one shared root entrypoint per database action and only raw `packages/db` implementations. Do not restore mode-suffixed variants or a repository-local database router.
# QA hybrid routing cleanup

- Adds tenant QA-classification fields and the non-tenant `QaPurgeRun` receipt.
- Repository `db:migrate` and `db:push` remain required; the first local migration attempt was blocked when the configured Docker database was unavailable.

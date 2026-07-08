# Database Schema

## Purpose
This file tracks the evolving database design and current source of truth at a conceptual level.

## How To Use
- Update when tables, enums, or important columns change.
- Keep this synchronized with actual schema files once they exist.

## Proposed Core Entities
- `tenants`
- `tenant_domains`
- `members`
- `contribution_plans`
- `contributions`
- `charge_definitions`
- `financing_cycles`
- `loan_requests`
- `loans`
- `repayment_schedules`
- `repayments`
- `ledger_entries`
- `audit_logs`
- `notification_outbox`
- `member_signup_links`

## Current Scaffold State
- Prisma has been adopted for the database layer in `packages/db`.
- The schema is grouped by concern under `packages/db/prisma/`:
  - `schema.prisma` for datasource and generator.
  - `enums/` for domain enums.
  - `models/` for domain-grouped model files.
- Current model coverage includes tenants, tenant domains, users, memberships, members, member documents, import batches, import batch rows, deduction sources, contribution plans, contributions, charge definitions, charge applications, loan products, financing cycles, loan requests, loan approvals, loans, repayment schedules, repayments, collection follow-ups, ledger accounts, ledger transactions, ledger entries, dividend periods, dividend allocations, offline sync events, audit logs, and notification outbox entries.
- `tenant_policies` now also stores `member_signup_access_mode` so each cooperative can choose whether member signup stays in-office only or becomes public.
- `tenant_policies` now also stores monthly financing-cycle defaults: capacity basis, quick/normal allocation percentages, intake reservation mode, and whether disbursement requires deployable funds.
- `financing_cycles` stores tenant-scoped monthly snapshots for projected commitment capacity, received contribution amount, reserve buffer, quick/normal budgets, cycle status, and status timestamps/notes.
- `member_signup_links` now stores staff-issued member signup links with token-rotation version, expiry, optional signup cap, enable/disable state, notes, creator, and last-used timestamp.
- `member_onboarding_requests` now also stores an optional `signup_link_id` so remote signup analytics can be tied back to the issuing link.
- `tenants` now also stores onboarding profile metadata for new cooperative workspaces: `current_size`, `office_address`, `city`, `state`, `country`, and `start_date`; `region` remains for compatibility and is mirrored from `state` on new profile writes.
- `members` now also stores `payment_allocation_preference`, `kyc_status`, `government_id_number`, `kyc_document_type`, `kyc_document_url`, `kyc_document_uploaded_at`, and `kyc_review_notes`.
- `member_documents` now stores multiple supporting KYC documents per member, with per-document review status, notes, uploaded timestamps, and reviewed timestamps.
- `import_batches` and `import_batch_rows` now store persisted staged import data so operators can review, stage, and apply migration batches instead of relying only on direct paste-and-apply imports.
- `collection_follow_ups` now stores persisted collections notes, status, next-action dates, stage, priority, resolution state, promise-to-pay dates, assignee links, and actor/member/loan links instead of relying only on audit metadata.
- `audit_logs` is also being reused for tenant-scoped operational delivery tracking, including notification email outcomes after tenant bootstrap.
- `notification_outbox` stores durable email delivery attempts before and after tenant creation, with optional `tenantId`, delivery status, message id, attempts, source, and rendered email payload fields.
- `packages/db` now exposes repository-style query scaffolding for tenants, tenant domains, users, memberships, and runtime status through `src/queries/` and `src/runtime.ts`.
- Prisma client generation is now wired and `packages/db/src/prisma.ts` provides an optional adapter-backed runtime when `DATABASE_URL` is configured.
- Query functions currently fall back to seed-backed data when no database runtime is configured, but can read from Prisma when the environment is available.
- `tenant_domains` now also store `verification_details` so DNS checks can surface resolved records, lookup method, and failure reasons in the dashboard.

## Notes
- Separate request-stage loan records from approved/disbursed loan records if workflow complexity requires it.
- Model charges generically so a cooperative can configure names, amounts, and applicability.
- Model loan products so quick loan and normal loan differ by term and policy, not ad hoc logic.
- Model monthly financing cycles separately from loan products so projected commitment capacity and quick/normal allocation snapshots are auditable per period.
- Represent monthly levy as a charge or dedicated recurring fee rule, depending on reporting needs.
- Track member category and payment channel so direct deduction and indirect contribution flows remain explicit.
- Prefer append-only transaction tables over mutable running totals where possible.
- TODO: decide whether offline sync metadata belongs on each transactional table or in separate sync event tables.

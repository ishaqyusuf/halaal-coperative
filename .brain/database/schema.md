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
- Current model coverage includes tenants, tenant domains, tenant operation profiles, tenant service settings, users, memberships, members, member documents, import batches, import batch rows, member opening balances, deduction sources, collection-source contribution batches, collection-source contribution batch rows, contribution plans, contributions, member payment receipts, member payment receipt allocations, charge definitions, charge applications, loan products, financing cycles, loan requests, loan approvals, loan guarantor approvals, loans, procurement requests, project financing requests, food purchase cycles, food purchase applications, repayment schedules, repayments, collection follow-ups, support cases, support case messages, ledger accounts, ledger transactions, ledger entries, dividend periods, dividend allocations, member share applications, offline sync events, audit logs, and notification outbox entries.
- `tenant_policies` now also stores `member_signup_access_mode` so each cooperative can choose whether member signup stays in-office only or becomes public.
- `tenant_policies` now also stores monthly financing-cycle defaults and guardrails: capacity basis, quick/normal allocation percentages, intake reservation mode, whether disbursement requires deployable funds, whether special savings counts toward eligibility, strict commitment during active financing, active-financing emergency/quick blocking, active-financing procurement blocking, procurement maximum payback months, procurement commitment-reduction mode during payback, procurement maximum active obligations per member, Foodstuff Purchase maximum payback months, Foodstuff Purchase commitment-reduction mode during payback, Foodstuff Purchase open-cycle requirement, and Foodstuff Purchase maximum active obligations per member.
- `tenant_operation_profiles` stores one reviewed Operation Profile per tenant, including reviewed timestamp, reviewer, and updated timestamp.
- `tenant_service_settings` stores each configurable service key and access mode for a tenant. Service keys include payment receipts, procurement, Foodstuff Purchase, support cases, Collection Sources, and Collection Source batch posting. Access modes are `disabled`, `office_only`, `member_self_service`, and `read_only`.
- `tenant_policies` now also stores tenant share policy defaults: share configuration mode, share unit amount, compulsory share unit count, and maximum share unit count. The mode determines whether monthly dated share history or unit-based shareholding drives setup and member backfill; unit fields are active only in unit-based mode and are normalized to defaults while monthly history is selected.
- `member_share_applications` stores unit-based optional share requests with requested/approved units, price/value snapshots, pending/approved/rejected/cancelled status, review metadata, and tenant/member scope.
- `share_businesses`, `share_business_profit_entries`, `share_profit_allocations`, `dividend_periods`, and `dividend_allocations` store business-profit seasons, detailed member allocation calculations, and member-level published dividend period totals.
- `member_opening_balances` stores staged brought-forward opening positions for existing members, including separate commitment savings, special savings, share capital, optional share units, active financing outstanding with original amount/start date/repayment plan/paid-installment evidence, procurement outstanding with item/date/original amount/repayment plan evidence, Foodstuff Purchase outstanding with item/date/original amount/repayment plan evidence, optional linked applied loan/procurement/Foodstuff Purchase ids, source document references, pending/approved/applied/reversed/rejected/cancelled status, reviewer/apply/reversal notes and metadata, and tenant/member scope.
- `member_payment_receipts` and `member_payment_receipt_allocations` store staged transfer proofs before finance approval. Allocations preserve category, amount, target period, period intent, optional contribution-plan/loan/procurement-schedule/food-purchase-application/project-financing-request links, and posted contribution/repayment/share-ledger links after approval.
- `collection_source_contribution_batches` and `collection_source_contribution_batch_rows` store staged source/month commitment posting evidence before contributions are created. Batch rows link tenant, collection source, member, active plan, period, expected/paid amounts, row status, exception reason, and posted contribution when applicable.
- `support_cases` and `support_case_messages` store tenant-scoped customer-service and feature-request records with optional member and linked-record references, assignment, priority, money-impact flags, financial-adjustment approval status/reviewer/notes, resolution summaries, and message history.
- `financing_cycles` stores tenant-scoped monthly snapshots for projected commitment capacity, received contribution amount, reserve buffer, quick/normal budgets, cycle status, and status timestamps/notes.
- `loan_guarantor_approvals` stores guarantor approval requests for loan requests, including guarantor member, requester, response status, responder, timestamps, and evidence notes. Final loan approval is blocked until required guarantor rows are approved.
- `procurement_requests` stores member item-purchase requests with requested cost, repayment months, estimated monthly repayment, approved cost/months, payback-policy snapshot, commitment-reduction snapshot, review status, reviewer, purchase evidence, and audit-backed request/review/purchase timestamps.
- `procurement_repayment_schedule_items` stores the active monthly repayment schedule created when finance records the purchase/fulfillment of an approved procurement request, including amount, paid amount, due date, and pending/due/overdue/paid-style servicing status.
- `project_financing_requests` stores staged member business funding requests with requested amount, optional proposed structure, approved amount/structure, optional payback months, principal-only payback estimate when applicable, disbursement date/reference/notes/actor evidence, paid amount/date evidence for repayable facilities, review status, reviewer, and audit-backed request/review timestamps.
- `food_purchase_cycles` and `food_purchase_applications` store monthly committee fund releases, member Foodstuff Purchase applications, requested/approved payback months, committee approval decisions, payback-policy snapshot, commitment-reduction snapshot, approved amount, paid amount/date evidence from receipt allocations, and end-of-month accounting/profit evidence.
- `member_signup_links` now stores staff-issued member signup links with token-rotation version, expiry, optional signup cap, enable/disable state, notes, creator, and last-used timestamp.
- `member_onboarding_requests` now also stores an optional `signup_link_id` so remote signup analytics can be tied back to the issuing link.
- `tenants` now also stores onboarding profile metadata for new cooperative workspaces: `current_size`, `office_address`, `city`, `state`, `country`, and `start_date`; `region` remains for compatibility and is mirrored from `state` on new profile writes.
- `tenants` now also stores trust-readiness profile evidence: legal terms URL, privacy URL, data-processing URL, incident contact name/email, backup-retention note, recovery point objective, recovery time objective, and last review metadata.
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
- Keep guarantor approval evidence separate from staff loan approvals so member guarantor consent can be requested, recorded, audited, and checked before financing is approved.
- Keep financing risk policy in `tenant_policies` so tenant admins can configure special-savings eligibility, strict commitment during service, and active-financing overlap rules without hard-coded client behavior.
- Keep procurement requests separate from ordinary loans so item, vendor, approved cost, and repayment-plan review can be audited before a later procurement servicing ledger posts repayments.
- Keep project financing requests separate from loans, procurement, and business-profit records until the cooperative clarifies whether an approved request becomes a repayable facility, an investment partnership, or a profit-sharing arrangement. Approved requests can record disbursement evidence and repayable facilities can accept receipt-backed payment evidence, but approval must not post bank ledger entries, repayment schedules, profit allocations, or non-repayable member obligations yet.
- Keep food purchase separate from procurement, commitments, and ordinary savings. Monthly committee fund release, member applications, committee approvals, receipt-backed paid amount evidence, and accounting/profit evidence should be auditable before any future member obligation or profit distribution ledger is introduced.
- Keep tenant share policy separate from dated share history and share ledger entries so current/future member limits do not rewrite historical backfill inputs. Only use dated share history when the tenant policy selects the monthly share history model, and only create optional unit-based share ledger entries through approved share applications or other audited posting flows.
- Keep detailed share-profit allocation rows as the calculation audit trail. `dividend_allocations` should be rebuilt as member-level season totals from published linked profit entries, and the dividend period should become published only after all linked non-archived profit entries are published.
- Keep member opening balances as staged migration inputs until an explicit apply workflow posts them through auditable finance records. Review approval alone is governance evidence and must not silently create contributions, share ledger rows, repayments, procurement servicing, Foodstuff Purchase applications, or running-balance mutations. Applied opening financing outstanding links to a generated active loan, applied opening procurement outstanding links to a generated active procurement request, and applied opening Foodstuff Purchase outstanding links to an approved Foodstuff Purchase application so later receipt servicing and reversal rules can target the exact obligation.
- Keep support cases separate from finance posting tables. Support resolution can identify a needed financial correction, but the correction itself should happen through the appropriate audited finance workflow.
- Financial-adjustment approval on `support_cases` is review evidence only. It can block resolution until approved, but it must not post, reverse, waive, or adjust money directly.
- Use the `feature_request` support category for client feedback triage so product requests remain assignable, discussable, exportable, and audited without adding financial side effects.
- Keep member receipt submissions staged until finance review. Approval can post supported commitment, special-savings, loan-servicing, share, procurement schedule, food-purchase application, and repayable project-financing allocations through existing posting paths or product target rows; other not-yet-modeled categories must remain staged or be corrected until their product ledgers exist.
- Keep Operation Profile service settings separate from posted finance records. Service settings can block or hide new workflows, but existing obligations, settlement paths, reports, statements, and audit evidence must remain readable.
- Keep Collection Source batch posting staged-first. A source/month batch should be reviewed row-by-row before selected collected rows post ordinary contribution records, and duplicate source/month staging must be prevented.
- Represent monthly levy as a charge or dedicated recurring fee rule, depending on reporting needs.
- Track member category and payment channel so direct deduction and indirect contribution flows remain explicit.
- Prefer append-only transaction tables over mutable running totals where possible.
- TODO: decide whether offline sync metadata belongs on each transactional table or in separate sync event tables.

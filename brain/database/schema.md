# Database Schema

## Purpose
This file tracks the evolving database design and current source of truth at a conceptual level.

## How To Use
- Update when tables, enums, or important columns change.
- Keep this synchronized with actual schema files once they exist.

## Proposed Core Entities
- `tenants`
- `members`
- `contribution_plans`
- `contributions`
- `charge_definitions`
- `loan_requests`
- `loans`
- `repayment_schedules`
- `repayments`
- `ledger_entries`
- `audit_logs`

## Current Scaffold State
- Prisma has been adopted for the database layer in `packages/db`.
- The schema is grouped by concern under `packages/db/prisma/`:
  - `schema.prisma` for datasource and generator.
  - `enums/` for domain enums.
  - `models/` for domain-grouped model files.
- Current model coverage includes tenants, users, memberships, members, deduction sources, contribution plans, contributions, charge definitions, charge applications, loan products, loan requests, loan approvals, loans, repayment schedules, repayments, ledger accounts, ledger transactions, ledger entries, dividend periods, dividend allocations, offline sync events, and audit logs.
- `packages/db/src/index.ts` still exposes the temporary demo seed helpers used by the API scaffold until real Prisma queries replace them.

## Notes
- Separate request-stage loan records from approved/disbursed loan records if workflow complexity requires it.
- Model charges generically so a cooperative can configure names, amounts, and applicability.
- Model loan products so quick loan and normal loan differ by term and policy, not ad hoc logic.
- Represent monthly levy as a charge or dedicated recurring fee rule, depending on reporting needs.
- Track member category and payment channel so direct deduction and indirect contribution flows remain explicit.
- Prefer append-only transaction tables over mutable running totals where possible.
- TODO: decide whether offline sync metadata belongs on each transactional table or in separate sync event tables.

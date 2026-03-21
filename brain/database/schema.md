# Database Schema

## Purpose
This file tracks the evolving database design and current source of truth at a conceptual level.

## How To Use
- Update when tables, enums, or important columns change.
- Keep this synchronized with actual schema files once they exist.

## Proposed Core Entities
- `tenants`
- `organizations`
- `members`
- `member_profiles`
- `member_categories`
- `deduction_sources`
- `contribution_plans`
- `contributions`
- `charge_definitions`
- `charge_applications`
- `loan_products`
- `loan_requests`
- `loans`
- `repayment_schedules`
- `repayments`
- `ledger_accounts`
- `ledger_entries`
- `dividend_periods`
- `dividend_allocations`
- `offline_sync_events`
- `audit_logs`

## Notes
- Separate request-stage loan records from approved/disbursed loan records if workflow complexity requires it.
- Model charges generically so a cooperative can configure names, amounts, and applicability.
- Model loan products so quick loan and normal loan differ by term and policy, not ad hoc logic.
- Represent monthly levy as a charge or dedicated recurring fee rule, depending on reporting needs.
- Track member category and payment channel so direct deduction and indirect contribution flows remain explicit.
- Prefer append-only transaction tables over mutable running totals where possible.
- TODO: decide whether offline sync metadata belongs on each transactional table or in separate sync event tables.

# System Overview

## Purpose
This file tracks the system at a domain level: actors, capabilities, constraints, and boundaries.

## How To Use
- Update when the system gains a major capability or new actor.
- Keep this focused on domain understanding rather than implementation details.

## Actors
- Platform owner: manages the SaaS business and tenant lifecycle.
- Cooperative admin: manages members, contributions, loans, and reports for a tenant.
- Cooperative finance officer: reviews transactions, approvals, and reconciliations.
- Member: contributes, requests loans, repays, and reviews account progress.
- Office staff: operates in-branch or back-office workflows, especially where connectivity is unreliable.

## Domain Areas
- Tenant management.
- Member identity and profile.
- Member classification and payroll/direct payment model.
- Contribution collection and posting.
- Charges and fee rules.
- Loan eligibility, approval, and repayment.
- Ledger and account statements.
- Reporting and dividends.
- Offline data capture and sync reconciliation.

## Constraints
- Financial records must be auditable.
- Loan issuance depends on available pool, not only qualification rules.
- Loan products must remain interest-free.
- Cross-tenant data access must never happen.
- Offline-created financial events must sync without losing ordering or authorship.
- Configurable cooperative rules should not compromise core accounting integrity.

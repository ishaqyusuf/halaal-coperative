# System Overview

## Purpose
This file gives the fastest reliable summary of what the system is, who it serves, and what constraints shape implementation.

## How To Use
- Read this first before making product or engineering changes.
- Update it when the product model, system scope, or major constraints change.

## Product Summary
- Product name: Amanah cooperative society platform.
- Model: multi-tenant SaaS for cooperatives, staff thrift groups, and employee savings/credit societies.
- Financial posture: 100% halal cooperative model.
- Primary users: cooperative admins, finance officers, and cooperative members.
- Core workflows: member registration, monthly contribution tracking, loan requests, loan approval, repayment tracking, charges, transaction history, dividends, and office operations.

## Core Business Rules
- Members contribute a recurring monthly amount.
- Loan funds come from the primary cooperative account funded by member contributions.
- Members may become eligible to request loans based on contribution history and cooperative rules.
- A member is eligible to borrow up to 2x total savings, subject to available pool liquidity and approval.
- Loan eligibility must be separated from loan availability.
- Loan disbursement depends on available cooperative pool and admin approval.
- All loans are interest-free as part of the halal operating model.
- Quick loan: short-term repayment over 3 months.
- Normal loan: long-term repayment over 18 months.
- Charges are configurable and can be attached to defined transaction types.
- Monthly cooperative levy is a core recurring charge.
- Cooperatives may run businesses and distribute profit dividends to members.
- Members may belong to one of these onboarding categories: civil servant, individual, or business.
- Civil servant members may support direct monthly deduction from ministry payroll.
- Individual and business members may contribute through indirect payment flows.

## Key Risks
- Liquidity risk if many members request loans at once.
- Financial integrity risk if balances are derived inconsistently.
- Trust risk if transaction history is editable or unclear.
- Regulatory risk if the product handles or stores funds in a way that triggers licensing obligations.
- Operational risk if permissions and approval workflows are weak.
- Sync conflict risk when offline transactions are created and later synchronized.

## MVP Direction
- Multi-tenant cooperative management.
- Member and admin roles.
- Contribution ledger.
- Loan request and approval workflow.
- Quick loan and normal loan workflows.
- Repayment schedule and outstanding balance tracking.
- Configurable charges.
- Monthly cooperative levy support.
- Dividend tracking and member visibility.
- Member dashboard and admin dashboard.
- Full transaction history.
- Offline mode with online synchronization.
- Office software capabilities for cooperative staff operations.

## Out Of Scope For First Release
- Bank integrations and automated disbursement.
- General accounting suite.
- Advanced funding marketplace.
- TODO: confirm whether first release includes dividend calculation or only dividend record publishing.

# Core Cooperative Platform

## Purpose
This file documents the primary business feature set for the Amanah cooperative SaaS.

## How To Use
- Update when core member, contribution, loan, charge, dividend, or office workflows change.
- Keep this aligned with implemented business rules.

## Goal
- Provide a halal, multi-tenant cooperative operations platform for managing member savings, interest-free loans, charges, dividends, and office workflows.

## Users
- Tenant admin.
- Finance officer.
- Office staff.
- Member.

## Key Flows
- Register a cooperative and configure its operating rules.
- Onboard members as civil servant, individual, or business.
- Record contributions through direct deduction or indirect payment flow.
- Apply configured charges such as cooperative levy.
- Let eligible members request quick or normal loans.
- Approve loans based on policy and available contribution pool liquidity.
- Track repayments, balances, transactions, and dividends.
- Provide dashboards and account history for members and staff.

## Business Rules
- Loan funds come from the cooperative contribution pool.
- Loans are interest-free.
- Member borrowing cap is up to 2x total savings, subject to liquidity and approval.
- Quick loan term is 3 months.
- Normal loan term is 18 months.
- Cooperatives may distribute business profit as dividends to members.

## Data Model Impact
- Members need category and payment channel attributes.
- Loan products need configurable terms and eligibility policies.
- Charges need reusable definitions and applications.
- Dividend periods and allocations need tenant-scoped records.
- Financial events should remain ledger-compatible and auditable.

## Permissions
- Members can view their own account progress and activity.
- Staff permissions must be scoped by tenant role.
- Loan approvals, dividend publication, and charge configuration are privileged actions.

## Edge Cases
- Eligible member cannot borrow because pool funds are insufficient.
- Offline-created contribution or repayment records sync after a delay.
- Direct deduction remittance arrives later than expected.
- Dividend distribution rules vary by tenant policy.

## TODO
- Confirm the first release scope for dividend calculation versus dividend statement publication.
- Confirm whether office software includes teller-style cash operations, reporting only, or full back-office workflows.

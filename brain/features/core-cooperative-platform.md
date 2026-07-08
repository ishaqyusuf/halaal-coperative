# Core Cooperative Platform

## Purpose
This file documents the primary business feature set for the Amanah cooperative SaaS.

## How To Use
- Update when core member, contribution, loan, charge, dividend, or office workflows change.
- Keep this aligned with implemented business rules.

## Goal
- Provide a multi-tenant cooperative operations platform for managing member savings, interest-free financing, charges, dividends, and office workflows.

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
- Let eligible members request quick or normal financing.
- Configure monthly financing cycles that snapshot projected member commitments and split available financing capacity between quick and normal financing.
- Configure live financing settings from the finance loan settings workspace, including allocation percentages, term caps, eligibility multiple, reserve buffer, product active state, dual approval, and deployable-funds safeguard.
- Automatically post configured loan-fee charges when a loan application is created.
- Approve financing based on policy and available contribution pool liquidity.
- Track repayments, balances, transactions, and dividends.
- Provide dashboards and account history for members and staff.

## Business Rules
- Financing funds come from the cooperative contribution pool.
- Financing is interest-free.
- Member financing cap is up to 2x total savings, subject to liquidity and approval.
- Quick financing term is 3 months.
- Normal financing term is 18 months.
- Monthly financing capacity can be modeled from projected active member commitments, with defaults of 30% reserved for quick financing and 70% for normal financing.
- Opened monthly financing cycles preserve capacity, reserve, and allocation snapshots so later policy changes do not rewrite historical cycle decisions.
- Loan request intake requires an open current monthly financing cycle and blocks requests that exceed the remaining quick or normal allocation.
- Submitted, under-review, and approved requests reserve monthly intake capacity; rejected, cancelled, and expired requests release that capacity.
- Disbursement uses actual deployable funds as the final safety check and can block an approved loan when collected funds are insufficient.
- Tenant admins and finance officers can update live financing policy and product settings through audited settings actions.
- The finance loan settings workspace must distinguish projected commitment capacity from actual received collections and deployable-funds safety.
- Cooperatives may distribute business profit as dividends to members.
- Cooperatives may continue creating and operating business pools after initial migration; only historical migration inputs and published allocation history should lock.
- Business profit should be attributed to configured profit-sharing periods, such as annual, semi-annual, quarterly, or ad-hoc seasons.
- Historical business profit seasons must be reviewed before member migration consumes them; reviewed season deductions need an auditable reason and should reduce distributable profit before member allocation.

## Data Model Impact
- Members need category and payment channel attributes.
- Financing products need configurable terms and eligibility policies.
- Monthly financing cycles need tenant-scoped snapshots for projected commitment capacity, received contribution amount, reserve buffer, quick/normal allocation percentages, quick/normal budget amounts, and cycle status.
- Charges need reusable definitions and applications.
- Loan-fee charge definitions use `ChargePurpose.loan_fee`, are one-time loan-application charges, and post explicit `ChargeApplication` rows linked to `LoanRequest`.
- Dividend periods and allocations need tenant-scoped records.
- Business and profit records need a clear distinction between historical migration records, live operating records, draft allocation periods, and published allocations.
- Dividend periods can carry reviewed season deduction metadata during initial migration so profit distribution remains auditable before publication.
- Financial events should remain ledger-compatible and auditable.

## Permissions
- Members can view their own account progress and activity.
- Staff permissions must be scoped by tenant role.
- Financing settings, cycle controls, approvals, dividend publication, and charge configuration are privileged actions.

## Edge Cases
- Eligible member cannot receive financing because pool funds are insufficient.
- Offline-created contribution or repayment records sync after a delay.
- Direct deduction remittance arrives later than expected.
- Dividend distribution rules vary by tenant policy.

## TODO
- Confirm the first release scope for dividend calculation versus dividend statement publication.
- Confirm whether office software includes teller-style cash operations, reporting only, or full back-office workflows.

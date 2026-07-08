# Member Commitments And Payment Allocation

## Summary
- Members do not share one fixed monthly contribution amount.
- Each member can have a separate monthly commitment plan.
- A monthly payment can be split across savings and loan servicing.
- Members can voluntarily overpay into savings, loan servicing, or both.

## Goal
- Model cooperative payments in a way that matches real member behavior instead of assuming a single fixed monthly contribution for everyone.

## Core Rules
- A member commitment is defined per member through `ContributionPlan`.
- The active monthly commitment can change over time and should be tracked historically.
- When requesting a loan, the member chooses a repayment duration in months.
- New loan requests are accepted only when the current monthly financing cycle is open and the selected quick or normal allocation has enough remaining intake capacity.
- The system calculates an estimated monthly servicing amount from `requestedAmount / requestedTermMonths`.
- Any configured loan-fee charge is posted as a separate charge application when the loan request is created; it is not added to principal or monthly servicing.
- The member may add a recurring extra monthly savings amount alongside the scheduled loan servicing amount.
- Extra monthly savings remains part of the member savings balance and does not reduce the loan principal.
- Any later payment can still overpay beyond the scheduled figures, with extra allocation directed to savings or loan payoff.

## Data Model
- `ContributionPlan.amount`: member-specific monthly commitment.
- `ContributionPlan.isActive` and `ContributionPlan.endsAt`: allow an active commitment to be updated or closed without losing history.
- `Contribution.committedAmount`: savings amount tied to the member’s planned commitment for that payment.
- `Contribution.extraSavingsAmount`: voluntary savings paid above the commitment amount.
- `Member.paymentAllocationPreference`: default rule for how any leftover amount from a total payment should be allocated when the operator does not split it fully.
- `LoanRequest.requestedTermMonths`: member-selected repayment duration.
- `LoanRequest.estimatedMonthlyServicing`: calculated monthly servicing estimate.
- `LoanRequest.extraMonthlySavingsAmount`: recurring extra monthly savings the member wants to pay alongside servicing.
- `Loan.termMonths`: approved repayment duration copied from the request.
- `Loan.estimatedMonthlyServicing`: approved monthly servicing estimate copied from the request.
- `Loan.extraMonthlySavingsAmount`: approved recurring extra monthly savings copied from the request.
- Loan-fee `ChargeApplication` rows link to `LoanRequest.loanRequestId`, including loan requests materialized from legacy migration backfill.

## Workflow
- Staff can set or replace a member’s monthly commitment plan from `/contributions`.
- Staff can also update an active commitment amount or close a plan with an explicit end date.
- Staff can save a member-level payment allocation preset: `manual_split`, `savings_first`, or `loan_first`.
- Staff can record one member payment that includes:
  - commitment savings
  - extra savings
  - scheduled loan servicing
  - extra loan payment
- Overdue repayment handling can now store explicit follow-up records with status, notes, and optional next-action dates for collections work.
- If a `totalAmount` is entered above the explicit split:
  - `manual_split` rejects the payment until the remainder is allocated explicitly.
  - `savings_first` sends the remainder to extra savings.
  - `loan_first` sends the remainder to extra loan payoff when a loan is selected, otherwise it falls back to savings.
- Loan repayments are allocated across the earliest unpaid schedule items first.
- Approval does not guarantee disbursement; disbursement can still be blocked when actual deployable funds are below the approved principal.
- Savings allocations increase `Member.totalSavingsSnapshot`.
- Loan allocations reduce `Loan.outstandingPrincipal`.
- Collections follow-up records are stored separately from repayments so collections operations can be reported without mutating the repayment posting ledger.

## UI Surfaces
- `apps/dashboard/app/contributions/page.tsx`
- `apps/dashboard/app/loans/page.tsx`
- `apps/dashboard/app/repayments/page.tsx`
- `/contributions` now includes a current-month staged contribution section sourced from generated monthly-record member rows.
- `/monthly-records` labels pending monthly-record member rows as staged for operators.

## Notes
- The current UI keeps allocation entry operator-driven rather than fully automated by member self-service flows, but it now supports operator-entered total payments plus member presets for the leftover amount.
- Tenant-site publishing is intentionally outside this feature scope for now.
- Staged monthly rows remain non-posted until a staff action applies them. They appear on the contributions screen only when the date filter is set to the current month.

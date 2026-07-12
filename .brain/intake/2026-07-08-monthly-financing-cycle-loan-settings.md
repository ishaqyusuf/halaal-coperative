# Brain Intake: Monthly Financing Cycle Loan Settings

## Status
Complete

## Created Date
2026-07-08

## Last Updated
2026-07-08

## Raw Input
The cooperative's current loan process uses the projected total monthly commitments from active members as the maximum monthly amount that can be given out as loans. Admins manually track issued loan forms and stop issuing forms when the monthly quota is reached. A percentage of the monthly capacity is reserved for quick loans, for example 30%, while the remainder is used for normal loans. Quick loans have a short repayment period, commonly 3 months. The request is to standardize this into a configurable loan settings system without adding interest-bearing behavior.

## Generated Plans
- [x] Loan Policy And Monthly Financing Cycle Model - `brain/plans/2026-07-08-feature-loan-policy-and-monthly-financing-cycle-model.md` - Status: Done
- [x] Financing Settings Workspace - `brain/plans/2026-07-08-feature-financing-settings-workspace.md` - Status: Done
- [x] Loan Intake Capacity Enforcement And Dashboard Visibility - `brain/plans/2026-07-08-feature-loan-intake-capacity-enforcement-and-dashboard-visibility.md` - Status: Done

## Recommended Execution Order
1. Loan Policy And Monthly Financing Cycle Model - establishes the durable policy, cycle records, and calculations that later UI and enforcement rely on.
2. Financing Settings Workspace - gives tenant admins and finance officers a safe settings surface to configure the policy and review current-month capacity.
3. Loan Intake Capacity Enforcement And Dashboard Visibility - applies the configured quotas to request intake, disbursement safety, and exception-led reporting.

## Agent Recommendations
- Loan Policy And Monthly Financing Cycle Model: open-code - schema/query/policy work with clear finance invariants and DB tests.
- Financing Settings Workspace: open-code - dashboard settings, forms, tRPC actions, and audit-backed saves inside existing Midday-style structure.
- Loan Intake Capacity Enforcement And Dashboard Visibility: open-code - request/disbursement guards, loan page summaries, dashboard metrics, and focused tests.

## Merged Items
- Monthly financing capacity, quick/normal allocation percentages, loan-form quota closure, and quick-loan term configuration were merged into this intake because they are one tenant financing-policy workflow.
- Request intake control and disbursement safety are split into a later enforcement plan because they depend on the durable monthly-cycle model and settings UI.

## Duplicate Or Existing Items
- This overlaps with `brain/plans/2026-06-30-feature-simple-member-create-and-single-member-backfill-workflow.md`, Phase 7: Loan Rule Settings. That existing plan covers general tenant loan policy, loan products, eligibility multiples, repayment terms, reserve buffer, dual approval, request-time eligibility preview, and audit safety.
- This intake narrows the loan-policy work to monthly financing cycles, projected-commitment capacity, quick/normal budget allocation, strict intake quota closure, and deployable-funds disbursement checks.
- This extends `brain/features/core-cooperative-platform.md` and `brain/features/member-commitments-and-payment-allocation.md`; it is not a duplicate of those feature docs.

## Needs Clarification
- None for intake. Use the defaults captured in the generated plans unless the product owner changes them before approval.

## Skipped Items
- No implementation handoffs or queue items were created. Use `brain-batch-handoff` after approval.

## Approval Notes
- None.

## Handoff Notes
- Use `brain-batch-handoff` to convert approved plans into handoffs and queue items.

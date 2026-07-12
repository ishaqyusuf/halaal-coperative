# Financing Policy Guards

## Purpose
- Let each cooperative configure risk rules for financing eligibility and repayment-period commitment behavior.
- Preserve the client's requested distinction between strict and flexible commitment handling while a member is serving financing.
- Extend that strict/flexible commitment idea per product, so loan, procurement, and Foodstuff Purchase settings do not accidentally share one global repayment rule.

## Implemented
- `tenant_policies.special_savings_counts_for_eligibility` controls whether special/extra savings contributes to loan-request eligibility snapshots.
- `tenant_policies.strict_commitment_during_financing` controls whether an active commitment can be reduced while a member has approved, disbursed, or active financing.
- `tenant_policies.active_financing_blocks_emergency` controls whether quick/emergency financing is blocked for members already serving financing.
- `tenant_policies.active_financing_blocks_procurement` controls whether procurement requests are blocked for members already serving financing.
- `tenant_policies.procurement_maximum_payback_months` caps requested and approved procurement repayment months.
- `tenant_policies.procurement_allows_commitment_reduction_during_payback` controls whether active procurement payback allows commitment reductions.
- `tenant_policies.food_purchase_maximum_payback_months` caps requested and approved Foodstuff Purchase payback months.
- `tenant_policies.food_purchase_allows_commitment_reduction_during_payback` controls whether unpaid approved Foodstuff Purchase applications allow commitment reductions.
- The finance loan settings form exposes these policy toggles/caps, and changes are audited through the existing tenant-policy update action.
- Loan products have an optional tenant-unique `code` so quick/emergency and normal financing can carry cooperative-facing identifiers in settings, CSV imports, loan request options, and exports.

## Enforcement
- Loan request submission uses all savings when special savings counts for eligibility.
- Loan request submission uses posted commitment portions only when special savings is excluded.
- Quick financing requests are blocked when active-financing emergency blocking is enabled and the member already has approved, disbursed, or active financing.
- Contribution plan updates and replacements cannot reduce an active commitment during active financing when strict mode is enabled.
- Procurement request submission and approval reject repayment months above the tenant procurement cap.
- Foodstuff Purchase application submission and approval reject payback months above the tenant Foodstuff Purchase cap.
- Contribution plan updates and replacements cannot reduce an active commitment during active procurement payback when the approved procurement request snapshot disallows commitment reduction.
- Contribution plan updates and replacements cannot reduce an active commitment while an approved Foodstuff Purchase application remains unpaid when the application snapshot disallows commitment reduction.

## Boundaries
- Guarantor approval is still a separate future financing gate.
- Exact client short-code taxonomy remains an open policy question; the implemented scope stores and displays identifiers without hard-coding meanings beyond the existing quick/emergency and normal product lanes.

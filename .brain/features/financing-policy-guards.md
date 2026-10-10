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
- Loan request amounts and repayment postings must be positive finite values with at most two decimal places; loan terms must be positive whole months.
- Loan request capacity is rechecked inside a retry-bounded Serializable transaction so concurrent requests cannot overbook the monthly financing pool.
- Request review accepts only legal state transitions, materializes an approved loan once, and cannot resurrect rejected, cancelled, or expired requests.
- Approved-loan disbursement uses an atomic approved-only claim, rechecks deployable funds inside the Serializable transaction, and rejects repeat disbursement.
- Repayment schedule references must belong to the selected tenant loan before posting.
- Mobile financing quote and request routes are session-scoped feature boundaries. The quote reports product term limits, eligibility, current monthly-cycle allocation, principal-only servicing, effective submission charges, active-financing overlap, migration readiness, and deployable-funds warnings from server queries.
- The native quote and final request review label the monthly amount as **estimated principal**, explicitly exclude the separately listed charges, and state that a request is not approval. Final repayment dates and total payable require the cooperative's agreement; the client does not invent a total from charge collection modes.
- The native quote labels a blocker-free submission as **Can submit request** and its savings-derived amount as **Eligibility limit**; neither label implies approval, immediate liquidity or disbursement.
- The mobile quote and final review now show each charge's calculated monetary amount and whether it is deducted from savings at submission or paid separately; request detail shows assessed charge status. Percentage charge previews use the calculated amount rather than the percentage setting, and currency formatting retains cents.
- The mobile quote is not an authorization token. Request submission reruns the existing operational, live-write, eligibility, cycle, overlap, charge, and Serializable capacity checks before creating server-confirmed request evidence. It also compares the reviewed charge fingerprint with a fresh charge quote inside that transaction; changed terms require a new preview before any request or charge write.
- After a failed mobile submission, the review closes, the member's draft stays intact, and the app fetches a fresh server quote before enabling another review. The failure is shown inside the request form, including when a charge change caused the rejection.

## Loans workspace contract

- `/loans` is a single flat workspace with URL-owned `Requests` and `Portfolio` tabs. The route prefetches and mounts only the active bounded query; search, view-specific status, and supported view-specific sort values are URL state, and polling is not part of the contract.
- Switching loan views preserves the search term but clears the previous view's incompatible status and sort. Request-capacity metrics are request context only and are not duplicated above the portfolio.
- Member-role reads are always forced to the linked member profile for both list and URL-selected detail queries. Staff and guarantor email addresses are not exposed by list/detail DTOs.
- Below `md`, capacity/stat cards and desktop tables are replaced by a compact toolbar, bottom-sheet filters/actions, flat divided Items, and Item-only loading skeletons. Loan workflows use full-screen mobile presentation with safe-area padding.
- Request, review, guarantor, and disbursement mutations invalidate the request/portfolio query families and any affected request/loan detail before closing their URL-owned workflow.
- Loan list and detail DTOs recursively normalize Prisma Decimal values before React Server Component hydration.
- Financial review/disbursement remains individual and audited; the page intentionally provides no bulk financial action.
- The dashboard re-audit keeps the approved search-first Requests/Portfolio hierarchy shared with Repayments, but tab changes now settle sort and perform a non-shallow route update so the route-prefetched dataset, capacity context, URL, and selected tab cannot drift.
- Mobile filter status and sort choices use flat divided shadcn radio groups and wait for URL settlement before the drawer closes. Desktop continues to use the anchored dropdown and never mounts the mobile bottom sheet.
- Mobile now exposes the financing-cycle intake reason beside the disabled request action, and the action references that explanation accessibly. Request and Portfolio empty states distinguish a genuinely empty workspace from a filtered no-match result.
- Authenticated Portless QA verified Requests/Portfolio navigation, filter apply/clear, desktop dropdown behavior, the blocked full-screen request workflow, and no page-level horizontal overflow at 360, 767, 768, and 1440 pixels. The live tenant has no request/portfolio rows, so populated table wheel handoff remains covered by the existing table implementation and focused contract tests rather than fabricated financial records.

## Mobile staff financing operations

- The `/financing-operations` staff route is a thin feature-owned mobile boundary with active `Needs review`, `Disburse`, and `All activity` lanes. The server owns tenant filtering, ordering, counts, cycle health, deployable funds, evidence, blockers, and allowed actions.
- Opening a cycle captures immutable capacity, reserve, and quick/normal allocation evidence. Pausing/resuming retains that snapshot; closed cycles are terminal; every command requires expected state.
- Final approval reruns product, term, eligibility-snapshot, active-obligation, guarantor, dual-approval, and capacity gates. Approval reserves capacity but never promises disbursement.
- Disbursement claims an approved loan once and performs a fresh deployable-funds check in the transaction before creating ledger, repayment-schedule, audit, and idempotent command evidence.
- `view_admin_work_queue` controls staff visibility. `review_financing` separately controls cycle management, request review, and disbursement. Operations-only staff remain read-only and members cannot enter the workspace.
- Offline or stale mobile state remains read-only. Search may stay on the browse surface; cycle/review/disbursement inputs, confirmations, and success receipts use shared keyboard-safe floating sheets.
- ADR-029 records the immutable-cycle and governed-disbursement decision. Native/design/test evidence is indexed at `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-21/review-2026-08-30/README.md`.

## Boundaries

- Guarantor approval is enforced as a separate financing gate and documented in `financing-guarantor-approval.md`.
- Exact client short-code taxonomy remains an open policy question; the implemented scope stores and displays identifiers without hard-coding meanings beyond the existing quick/emergency and normal product lanes.

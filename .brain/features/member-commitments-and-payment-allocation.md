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
- Tenant policy controls whether extra/special savings counts toward financing eligibility. When disabled, loan-request eligibility uses posted commitment portions only.
- Tenant policy controls strict commitment during active financing. When strict mode is enabled, staff cannot reduce the member's active monthly commitment while the member has approved, disbursed, or active financing.
- Tenant policy can block quick/emergency financing while the member has approved, disbursed, or active financing.
- Tenant policy can block procurement requests while the member has approved, disbursed, or active financing.
- Product-specific policy lets procurement and Foodstuff Purchase each decide whether commitments can be reduced during their payback periods or must remain fixed until the active obligation is closed.
- Loan requests can require selected guarantor member approvals. Staff can record guarantor-approved or guarantor-rejected evidence, and final approval is blocked until every selected guarantor has approved.
- Loan request review decisions emit a registered member notification event and send an audited direct email to the borrower member when the member profile has an email address.
- Member or staff-submitted transfer proofs are staged as payment receipts before approval. The receipt allocation total must equal the receipt amount.
- Member receipt self-service is Operation Profile gated. Members only see submit actions when `payment_receipts` is `member_self_service`; staff can still capture office receipts when the service allows staff creation.
- Member type and Collection Source are separate profile concepts: member type describes the member category, while Collection Source links the member to an active tenant-scoped ministry, employer, payroll, transfer, cash, manual, or other source when the Operation Profile enables collection-source assignment.
- Collection Source batch posting is separate from manual payment entry. When the Operation Profile enables `collection_source_batch_posting`, finance staff can stage one source/month batch, review member rows, mark collected rows, record exceptions, and post selected rows into normal contribution records.
- Receipt allocations carry category and period intent, so a payment can be marked as current-period, future-period, or back/defaulted-period before posting.
- Approved receipt allocations for commitment, special savings, scheduled loan servicing, and extra loan payment post through the existing contribution and repayment ledgers.
- Workspace admins can export special-savings contribution rows from `/reports/special-savings-export`, keeping voluntary extra savings review separate from ordinary commitment rows.
- Approved receipt allocations for shares post to member share capital through the share ledger and keep a posted ledger reference on the receipt allocation.
- Approved receipt allocations for procurement post against a selected active procurement repayment schedule item and update its paid amount/status.
- Approved receipt allocations for Foodstuff Purchase post against a selected approved application and update its paid amount/date evidence without distributing profit.
- Approved receipt allocations for repayable project financing post against selected approved/active repayable facilities and update paid/outstanding evidence.
- Receipt categories without live ledgers or target rows, such as other, must stay staged or be corrected instead of being silently posted into savings.
- Foodstuff Purchase is a monthly committee operation rather than only a payment category: member applications and committee approvals live in the food-purchase workflow, while payment receipts settle approved application amounts until final obligation/profit posting semantics are confirmed.

## Data Model

- `ContributionPlan.amount`: member-specific monthly commitment.
- `ContributionPlan.isActive` and `ContributionPlan.endsAt`: allow an active commitment to be updated or closed without losing history.
- `Contribution.committedAmount`: savings amount tied to the member’s planned commitment for that payment.
- `Contribution.extraSavingsAmount`: voluntary savings paid above the commitment amount.
- `Member.paymentAllocationPreference`: default rule for how any leftover amount from a total payment should be allocated when the operator does not split it fully.
- `Member.deductionSourceId`: optional tenant-scoped Collection Source assignment used for payroll/ministry/employer/manual grouping; it can be empty for manual, transfer, self-employed, or otherwise ungrouped payers.
- `MemberPaymentReceipt`: staged proof of payment with member, paid date, reference, proof URL/name, status, reviewer, and notes.
- `MemberPaymentReceiptAllocation`: allocation rows with category, amount, target period, period intent, optional contribution plan/loan/procurement schedule links, and posted contribution/repayment/share links after approval.
- `LoanRequest.requestedTermMonths`: member-selected repayment duration.
- `LoanRequest.estimatedMonthlyServicing`: calculated monthly servicing estimate.
- `LoanRequest.extraMonthlySavingsAmount`: recurring extra monthly savings the member wants to pay alongside servicing.
- `LoanGuarantorApproval`: tenant-scoped guarantor approval evidence linked to a loan request and guarantor member, with pending/approved/rejected status and response notes.
- `ProcurementRequest`: tenant-scoped item-purchase request with requested/approved cost, requested/approved repayment months, estimated monthly repayment, status, reviewer, and review notes.
- `ProjectFinancingRequest`: tenant-scoped member business funding request with requested/approved amount, proposed/approved structure, optional payback months, principal-only payback estimate for repayable facilities, status, reviewer, and review notes.
- `FoodPurchaseCycle` and `FoodPurchaseApplication`: tenant-scoped monthly Foodstuff Purchase committee fund release, member applications, requested/approved payback months, committee approval evidence, policy snapshot, and month-end accounting/profit evidence.
- Procurement and Foodstuff Purchase tenant policies store maximum payback months and commitment reduction mode during active payback.
- `Loan.termMonths`: approved repayment duration copied from the request.
- `Loan.estimatedMonthlyServicing`: approved monthly servicing estimate copied from the request.
- `Loan.extraMonthlySavingsAmount`: approved recurring extra monthly savings copied from the request.
- Loan-fee `ChargeApplication` rows link to `LoanRequest.loanRequestId`, including loan requests materialized from legacy migration backfill.

## Workflow

- Staff can set or replace a member’s monthly commitment plan from `/contributions`.
- Staff can also update an active commitment amount or close a plan with an explicit end date.
- Commitment plan reductions are blocked during active financing when strict commitment mode is enabled; disabling strict mode allows flexible repayment arrangements.
- Staff can save a member-level payment allocation preset: `manual_split`, `savings_first`, or `loan_first`.
- Staff can assign or clear a member Collection Source during member creation or baseline editing when the tenant Operation Profile enables collection sources; source assignment is tenant-scoped and included in member profile audit metadata.
- Finance staff can stage monthly commitment batches by Collection Source. Staging creates one tenant/source/period batch and one review row per non-exited assigned member, with blockers for members that are not active or do not have a period-effective monthly commitment plan.
- Finance staff can mark batch rows collected, adjust paid amounts below or above the expected commitment, or leave exception/skipped rows unpaid with a reason. Posting selected collected rows creates ordinary contribution records through the shared member-payment workflow, links the row to the posted contribution, and leaves exception/skipped rows unposted.
- Staff can record one member payment that includes:
  - commitment savings
  - extra savings
  - scheduled loan servicing
  - extra loan payment
- Staff can stage a receipt from `/payment-receipts` with proof details and one or more allocation rows.
- Members with linked member profiles can stage their own receipts from `/payment-receipts` only when payment receipt self-service is enabled, and can track submitted, under-review, correction-requested, approved, or rejected history when records exist.
- Staff can select guarantors on loan request submission; selected guarantors receive an approval request email when they have an email address, and finance staff can record the response in `/loans`.
- Finance review of a loan request keeps staff role notifications and also sends a borrower-facing status email when borrower email contact is available.
- Staff can stage procurement item requests from `/procurement`; finance staff can approve or reject the item cost and repayment plan, record purchase activation, and then post procurement repayment receipts against selected schedule rows.
- Staff can stage and review project financing requests before a later accounting workflow decides whether the approved request becomes a repayable facility, investment partnership, or profit-sharing arrangement.
- Staff can record monthly Foodstuff Purchase fund releases, member purchase applications, committee approval decisions, and end-of-month accounting/profit evidence before any later Foodstuff Purchase ledger posts member obligations or profit distributions.
- Finance officers can mark receipts under review, request correction, reject, or approve. Approval posts supported allocations through existing member-payment, share, and procurement-schedule posting, while unsupported product categories remain blocked until their ledgers exist.
- Allocation changes during review require an adjustment reason so admin-corrected payment splits remain auditable.
- Overdue repayment handling can now store explicit follow-up records with status, notes, and optional next-action dates for collections work.
- If a `totalAmount` is entered above the explicit split:
  - `manual_split` rejects the payment until the remainder is allocated explicitly.
  - `savings_first` sends the remainder to extra savings.
  - `loan_first` sends the remainder to extra loan payoff when a loan is selected, otherwise it falls back to savings.
- Loan repayments are allocated across the earliest unpaid schedule items first.
- Direct repayment posting serializes the outstanding-balance claim, allocation, loan decrement, repayment evidence, ledger entry, and audit record in one retry-bounded transaction; an arbitrary client-selected installment cannot redirect the authoritative allocation.
- Approval does not guarantee disbursement; disbursement can still be blocked when actual deployable funds are below the approved principal.
- Savings allocations increase `Member.totalSavingsSnapshot`.
- Loan allocations reduce `Loan.outstandingPrincipal`.
- When a repayment clears the remaining outstanding principal, the loan is marked completed and any remaining unpaid schedule rows are waived so future servicing does not continue.
- Collections follow-up records are stored separately from repayments so collections operations can be reported without mutating the repayment posting ledger.

## UI Surfaces

- `apps/dashboard/app/contributions/page.tsx`
- `apps/dashboard/app/payment-receipts/page.tsx`
- `apps/dashboard/app/loans/page.tsx`
- `apps/dashboard/app/repayments/page.tsx`
- `/repayments` is a finance-only, URL-owned Collections/Schedule/History workspace. It mounts one bounded query at a time, uses exact selected-record details, hides summary metrics on small screens, and replaces the desktop table with flat divided mobile items plus bottom-sheet filters and full-screen workflows.
- `/reports/special-savings-export` exports rows where `Contribution.extraSavingsAmount` is above zero.
- `/contributions` is a URL-owned Ledger/Commitments/Collections workspace. Only the active view mounts its data surface; the ledger uses one server-prefetched bounded query, while commitment and collection actions remain focused, audited workflows.
- The dashboard review keeps Ledger/Commitments/Collections in one flat, labelled tab panel, settles URL state before switching the visible server-owned lane, and keeps desktop filters anchored while mobile uses a full-screen workflow plus a flat shadcn filter drawer.
- Filtered empty states no longer duplicate the toolbar's clear action. Mobile sort choices are one divided radio group instead of bordered option cards, and filter apply/clear waits for URL state before dismissing the drawer.
- Contribution Quick Fill uses the current UTC accounting date and month, generates a fresh reference, and derives its total from the available allocation targets. When no active loan exists, scheduled and extra loan fields remain empty and disabled rather than preparing an invalid loan allocation.
- Authenticated Portless QA exercised ledger filters, Ledger/Commitments tab ownership, the full-screen payment and commitment forms through valid populated drafts, and responsive boundaries at 360, 767, 768, and 1440 pixels. No payment or commitment was submitted during the review because both create financial/member obligations.
- The Collections view appears only when the Operation Profile enables Collection Source batch posting for staff. Current-month staged due records remain owned by `/monthly-records` instead of being duplicated beside the posted contribution ledger.
- Contribution and repayment date filters share the GND Sales Orders preset-and-range control and canonical `dateRange` URL tuple. Each workspace resolves the tuple to its existing contribution-date or repayment-due-date query boundaries.
- Staff and member navigation hides disabled, unused Operation Profile service paths while preserving routes that have existing records or pending work.
- Mobile member home and More surfaces use Operation Profile service visibility for receipts, procurement, Foodstuff Purchase, and support tiles/sections.
- `/monthly-records` labels pending monthly-record member rows as staged for operators.

## Notes

- Receipt allocation entry is available to both staff and linked members, while finance approval remains staff-controlled.
- Tenant-site publishing is intentionally outside this feature scope for now.
- Staged monthly rows remain non-posted until a staff action applies them and are reviewed from `/monthly-records`; `/contributions` shows posted ledger evidence only.
- Collection Source batch rows remain non-posted until finance staff mark selected rows collected and post them. The tenant/source/period uniqueness guard prevents duplicate source batches for the same month.
- Payment receipts remain non-posted until finance approval. Approved receipt rows link back to posted contribution/repayment/share records where applicable, and procurement allocations target the schedule row they service.

## Mobile staff operations

- 2026-09-07 source-only refinement: the workspace/payment B/B designs and six
  additional five-option decisions use flat member/history rows, feature-owned
  identity/choice primitives, explicit review labels and role-gated commands.
  Workspace summary totals are server-owned; cursor loading retains existing
  rows on failure and ignores stale requests. Draft storage includes the target
  member/row. Collection period is a month calendar, not separate typed values.
  Tests and native acceptance for this refinement are deferred by the user;
  historical Ticket 19 evidence below is not new validation.

- Ticket 19 adds the feature-owned `/contributions` mobile staff workspace with mutually exclusive Ledger, Commitments, and Collections lanes. Only the active lane loads; exact member and batch details are independent server reads.
- `view_contribution_operations` permits every signed staff role to inspect the tenant ledger, commitments, and Collection Source batches. `manage_member_contributions` permits staff commitment, allocation-preference, and individual-payment work. `manage_collection_source_batches` is restricted to finance roles.
- Long commitment, payment, and batch forms use same-window full-screen keyboard-safe sheets. Compact row corrections, confirmations, reviews, and success evidence use the shared content-aware floating bottom sheet. Browse rows and data-entry forms never share one screen surface.
- Reads are tenant-scoped and may use visibly stale cache. Every write is disabled offline or on stale data, requires deliberate review, and sends server-owned expected-state plus a tenant-scoped UUID command receipt.
- Commands use payload fingerprints so an identical retry returns the canonical result while reuse of a command id with different intent fails closed. Posting remains transactional, ledger-compatible, Operation Profile gated, audited, and server-authoritative.
- Development fixtures and Quick Fill remain build/runtime guarded. Errors use sanitized Sentry source `mobile.contribution_operations`.
- Pixel 3a API 34 development-client evidence covers populated Light/Dark lanes, full-screen and compact forms, both single-line and multiline keyboard avoidance, confirmations, success, QA-only batch staging, and a QA-only collected-row update. No local financial posting was executed. The manifest is `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-19/review-2026-08-30/README.md`.

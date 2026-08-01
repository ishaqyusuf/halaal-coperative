# Member Payment Receipts

## Purpose
- Track member-submitted or staff-entered proof of payment before balances change.
- Preserve the member's intended split across commitment, special savings, loan servicing, shares, procurement, food purchase, or other categories.
- Support current-period, future-period, and back/defaulted-period payment intent.

## Implemented
- `member_payment_receipts` stores tenant/member scope, paid date, total amount, payment reference, proof document metadata, review status, reviewer, notes, and audit trail.
- `member_payment_receipt_allocations` stores allocation category, amount, target period, period intent, optional contribution-plan/loan/procurement-schedule/food-purchase-application links, and posted contribution/repayment/share-ledger links.
- `/payment-receipts` lets staff stage receipts and finance officers review, approve, reject, or request correction.
- Members with linked member profiles can submit their own receipts, split allocations, and track review status from `/payment-receipts`.
- Staff and member receipt forms derive product-specific allocation categories from the tenant Operation Profile plus the member's existing payable obligations.
- Procurement allocations appear only when procurement is enabled/readable or the member has active unpaid procurement repayment schedules.
- Foodstuff Purchase allocations appear only when Foodstuff Purchase is enabled/readable or the member has approved unpaid Foodstuff Purchase applications.
- Receipt review decisions emit a registered member notification event and send an audited direct email to the linked member when the member has an email address.
- Staff and members can open receipt-linked support cases from receipt rows so payment mistakes stay connected to the reviewed receipt record.
- Workspace admins can export payment receipts from `/reports/payment-receipts-export`, including member proof metadata, review status, allocation categories, period intent, and posting links.
- Receipt submission checks duplicate non-rejected payment references and duplicate non-rejected proof document URLs.
- Approval posts supported commitment, special-savings, scheduled loan-servicing, and extra loan-payment allocations through the existing member-payment ledger path.
- Approval posts supported share allocations into member share capital with a `payment_receipt` share-ledger source and stores the posted share ledger entry on the receipt allocation.
- Approval posts procurement allocations to a selected active procurement repayment schedule item, updates paid amount/status, and completes the procurement request when no payable schedule rows remain.
- Approval posts food-purchase allocations to a selected approved food purchase application, updates paid amount evidence, and marks the application paid when the approved amount is fully settled.
- Approval posts project-financing allocations to a selected approved/active repayable-facility request, updates paid amount evidence, moves partial repayments to active, and marks fully repaid requests completed.
- Review-side allocation changes require an adjustment reason.
- Finance review uses a centered, accessible decision dialog with a fixed header and action footer, one scrollable body, receipt evidence and member context, allocation reconciliation, category-specific target controls, standard currency inputs, and decision-specific validation before posting.
- Overview action queue includes pending receipt reviews.

## Boundaries
- Receipt approval does not directly post generic other allocations yet. That category remains staged/blocked until its dedicated ledger or posting semantics exist.
- Food-purchase receipt posting updates approved application payment evidence only; it does not distribute food-purchase profit or post a separate accounting ledger.
- Project-financing receipt posting is limited to repayable-facility approvals; investment partnership and profit-sharing structures remain blocked until their accounting rules are defined.
- Procurement receipt posting updates the procurement repayment schedule only; procurement cash/bank disbursement ledger entries and procurement-specific accounting entries remain future work.
- Member self-service receipt submission derives the member profile from the authenticated user; members cannot select or view other members' receipt records.
- Receipt status emails depend on the member profile having an email address; WhatsApp, mobile push, and persisted in-app delivery remain future channels.
- Receipt allocations settle existing product obligations only; selecting procurement or Foodstuff Purchase requires an existing payable schedule/application and does not create a new service obligation.
- Bank integration and automatic reconciliation remain out of scope.

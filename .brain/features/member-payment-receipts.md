# Member Payment Receipts

## Purpose

- Track member-submitted or staff-entered proof of payment before balances change.
- Preserve the member's intended split across commitment, special savings, loan servicing, shares, procurement, food purchase, or other categories.
- Support current-period, future-period, and back/defaulted-period payment intent.

## Implemented

- Native UI source update on 2026-09-07: paid date and allocation target month
  open shared floating calendars instead of editable date strings. The owner
  form yields to the calendar/review overlay; receipt reconciliation and the
  server create/review contract are unchanged. Private native uploads remain
  Ticket 18, not an implemented capability of the proof-link input. Testing
  and Android acceptance of this change are deferred by user instruction.

- `member_payment_receipts` stores tenant/member scope, paid date, total amount, payment reference, proof document metadata, review status, reviewer, notes, and audit trail.
- `member_payment_receipt_allocations` stores allocation category, amount, target period, period intent, optional contribution-plan/loan/procurement-schedule/food-purchase-application links, and posted contribution/repayment/share-ledger links.
- `/payment-receipts` lets staff stage receipts and finance officers review, approve, reject, or request correction.
- Members with linked member profiles can submit their own receipts, split allocations, and track review status from `/payment-receipts`.
- Receipt lists use one authenticated, URL-filtered Suspense infinite-query contract for both the server prefetch and client table/list. URL-selected review and support workflows resolve their receipt through the scoped detail query rather than a stale route snapshot; mutations invalidate the list/detail cache instead of polling.
- Below `md`, the registry hides analytics and desktop table controls, uses a flat divided shadcn Item list, 44px search/filter/create controls, a bottom-sheet status/sort selector, mobile list skeletons, and full-screen create/review/support workflows. Desktop retains the virtualized, configurable table.
- The completed backward-flow UI re-audit keeps the desktop registry as one flat divider-led surface: metrics are a single border-y strip, search stays at the top left, column configuration and staging actions stay at the right, and the duplicate member staging card is removed. Mobile keeps an icon staging action and a flat divided filter drawer rather than nested bordered options.
- Staff and member stage forms treat receipt amount as the source total, show Receipt / Allocated / Remaining reconciliation, block submission until allocations balance, and render only the product target that applies to each selected category. Allocation rows are flat divided sections rather than nested cards.
- Every successful stage, review, support, member-stage, and member-support mutation awaits removal of the URL-owned workflow state before refreshing server data, preventing a completed sheet from reopening against stale search params.
- Staff and member receipt forms derive product-specific allocation categories from the tenant Operation Profile plus the member's existing payable obligations.
- Procurement allocations appear only when procurement is enabled/readable or the member has active unpaid procurement repayment schedules.
- Foodstuff Purchase allocations appear only when Foodstuff Purchase is enabled/readable or the member has approved unpaid Foodstuff Purchase applications.
- Receipt review decisions emit a registered member notification event and send an audited direct email to the linked member when the member has an email address.
- Staff and members can open receipt-linked support cases from receipt rows so payment mistakes stay connected to the reviewed receipt record.
- Workspace admins can export payment receipts from `/reports/payment-receipts-export`, including member proof metadata, review status, allocation categories, period intent, and posting links.
- Receipt submission checks duplicate non-rejected payment references and duplicate non-rejected proof document URLs.
- Receipt creation and approval enforce the tenant finance start date and exact category-to-target shapes. Approval runs in a bounded-retry serializable transaction with an atomic status claim so concurrent approvals cannot post one receipt twice and competing settlements re-check remaining target balances.
- Approval posts supported commitment, special-savings, scheduled loan-servicing, and extra loan-payment allocations through the existing member-payment ledger path.
- Approval posts supported share allocations into member share capital with a `payment_receipt` share-ledger source and stores the posted share ledger entry on the receipt allocation.
- Approval posts procurement allocations to a selected active procurement repayment schedule item, updates paid amount/status, and completes the procurement request when no payable schedule rows remain.
- Approval posts food-purchase allocations to a selected approved food purchase application, updates paid amount evidence, and marks the application paid when the approved amount is fully settled.
- Approval posts project-financing allocations to a selected approved/active repayable-facility request, updates paid amount evidence, moves partial repayments to active, and marks fully repaid requests completed.
- Review-side allocation changes require an adjustment reason.
- Finance review uses a centered, accessible decision dialog with a fixed header and action footer, one scrollable body, receipt evidence and member context, allocation reconciliation, category-specific target controls, standard currency inputs, and decision-specific validation before posting.
- Overview action queue includes pending receipt reviews.
- Infinite pagination uses an opaque ordering-aware keyset cursor containing the selected sort tuple and deterministic tie breakers; it does not reuse an ID cursor under non-ID ordering.
- The native member Receipts route now uses feature-owned models, API adapters, screens, and dedicated `mobile-member-receipts` DB queries. Its bounded cursor list returns Operation Profile capabilities plus server-shaped posting categories and payable targets; the form preserves drafts, period intent, allocation reconciliation, review confirmation, correction/status evidence, and canonical create responses while stale/offline state blocks submission.
- The native receipt summary uses unavailable placeholders until a server response exists. If the initial read fails, the history shows an unavailable state with retry rather than claiming zero pending, corrected, or approved receipts or an empty history.
- The Expo UI uses the shared NativeWind semantic-token primitives, flat divided rows, a keyboard-aware form, development-only Quick Fill data, and receipt-linked support creation. Populated Pixel 3a API 34 light-mode evidence and its manifest are retained under `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-05/`.

## Boundaries

- Dashboard payment-proof uploads have a 10 MiB direct private Blob transport behind a disabled production switch. Private GET now requires a linked receipt and allows staff or that receipt's member; live validation, separate Frankfurt stores, approved retention/deletion and cross-invocation retrieval remain. Local development retains the 10 MiB allowance. See [private upload storage readiness](../runbooks/private-upload-storage-readiness.md).
- Receipt approval does not directly post generic other allocations yet. That category remains staged/blocked until its dedicated ledger or posting semantics exist.
- Food-purchase receipt posting updates approved application payment evidence only; it does not distribute food-purchase profit or post a separate accounting ledger.
- Project-financing receipt posting is limited to repayable-facility approvals; investment partnership and profit-sharing structures remain blocked until their accounting rules are defined.
- Procurement receipt posting updates the procurement repayment schedule only; procurement cash/bank disbursement ledger entries and procurement-specific accounting entries remain future work.
- Member self-service receipt submission derives the member profile from the authenticated user; members cannot select or view other members' receipt records.
- Receipt status emails depend on the member profile having an email address; WhatsApp, mobile push, and persisted in-app delivery remain future channels.
- Receipt allocations settle existing product obligations only; selecting procurement or Foodstuff Purchase requires an existing payable schedule/application and does not create a new service obligation.
- Bank integration and automatic reconciliation remain out of scope.

The dashboard receipt save now claims a private proof upload for that receipt in the same transaction, and private reads require the exact receipt ID, URL, tenant and member/staff authorization. Live-store validation and approved retention/deletion remain open.

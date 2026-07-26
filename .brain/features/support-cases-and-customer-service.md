# Feature: Support Cases And Customer Service

## Goal
- Track member issues, payment mistakes, account questions, feature requests, and resolution evidence inside the cooperative workspace.
- Preserve a clear boundary between support resolution and financial posting.

## Current Behavior
- Staff can create tenant-scoped support cases from `/support`.
- Members with linked member profiles can open and view their own support cases from `/support`.
- A support case can optionally link to a member and a record reference such as contribution, repayment, financing, share application, receipt, procurement, or another record type.
- Staff and members can open receipt-linked support cases directly from `/payment-receipts`; member receipt links are validated against the authenticated member profile.
- Members can open profile or document update requests through the `account_update` support category. The member dashboard provides a prefilled request path from the profile status card.
- Support case creation can store an optional attachment URL on the initial message so members or staff can reference supporting documents while the case is reviewed.
- Cases store category, priority, assignee, status, money-impact flag, financial-adjustment-needed flag, resolution summary, and message history.
- Feature requests are captured as a dedicated support category so client feedback can be triaged, assigned, discussed, exported, and audited without creating a financial posting workflow.
- Money-impact cases that require a financial adjustment keep an explicit finance approval status: not required, pending, approved, or rejected.
- Finance reviewers can record approval/rejection notes for a required financial adjustment, with reviewer and timestamp evidence.
- Support cases that require a financial adjustment cannot be resolved or closed until the adjustment approval status is approved.
- After approval, finance can post a linked special-savings refund from the case update sheet. The form requires amount, payment date, and payment reference; the dedicated withdrawal workflow verifies available special savings, posts the balanced savings-to-bank ledger adjustment, records processor/audit evidence, decrements the member savings snapshot, and resolves the case atomically.
- A special-savings case can be settled only once. The resolved case shows the posted amount, payment date, and reference.
- Staff replies, member replies, case creation, and status updates create audit entries.
- Case creation audit metadata includes the initial attachment URL when one is provided.
- Support case creation, member replies, staff replies, and status updates emit registered notification events with delivery audit records. Member-created cases and replies notify staff roles; staff-created cases, staff replies, and status updates notify the linked member when the member has an email address.
- Support summaries include open feature-request counts, so product feedback has a visible queue on staff and member support dashboards instead of being hidden inside the generic case total.
- Open support cases appear in the dashboard action queue.
- Workspace admins can export support cases from `/reports/support-export`, including linked records, money-impact flags, financial-adjustment approval evidence, assignment, resolution evidence, message counts, and date filters.

## Finance Safety Rules
- Support cases do not mutate savings, share capital, repayments, charges, financing, procurement, or ledger records.
- When a case requires a money correction, staff should mark it as needing a finance adjustment and complete the actual correction through an audited finance workflow.
- Financial-adjustment approval on a support case is governance evidence only; it does not post, reverse, waive, or adjust money by itself.
- The special-savings refund form launches a separate finance posting workflow after approval; opening, approving, or otherwise editing the support case does not move money.
- Rejected or pending financial-adjustment reviews keep the case open or in progress until staff remove the adjustment requirement or resolve the issue through a different audited workflow.
- Resolved or closed support cases need a resolution summary so decisions remain reviewable.

## Future Work
- Add additional product-specific correction workflows for charges, repayments, shares, and other support resolutions.
- Add WhatsApp, push/mobile, and in-app support delivery channels when those notification channels are selected for a pilot.

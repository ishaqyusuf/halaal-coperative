# Feature: Support Cases And Customer Service

## Goal

- Track member issues, payment mistakes, account questions, feature requests, and resolution evidence inside the cooperative workspace.
- Preserve a clear boundary between support resolution and financial posting.

## Current Behavior

- Staff can create tenant-scoped support cases from `/support`.
- Members with linked member profiles can open and view their own support cases from `/support`.
- New staff/member cases are allowed only when the Operation Profile `support_cases` service mode permits that actor. Existing case history remains readable when creation is disabled or read-only, and dashboard plus mobile mutations enforce the same gate.
- A support case can optionally link to a member and a record reference such as contribution, repayment, financing, share application, receipt, procurement, or another record type.
- Staff and members can open receipt-linked support cases directly from `/payment-receipts`; member receipt links are validated against the authenticated member profile.
- Members can open profile or document update requests through the `account_update` support category. The member dashboard provides a prefilled request path from the profile status card.
- Support case creation can store an optional attachment URL on the initial message so members or staff can reference supporting documents while the case is reviewed.
- New support attachment links accept HTTPS URLs without embedded credentials or local/literal-IP hosts, or exact `/api/uploads/{uuid}` private paths. Dashboard, mobile and database writes share the same rule; the dashboard hides unsafe links in historical messages and while a new URL is being entered. External HTTPS content and ownership are not verified.
- Cases store category, priority, assignee, status, money-impact flag, financial-adjustment-needed flag, resolution summary, and message history.
- Feature requests are captured as a dedicated support category so client feedback can be triaged, assigned, discussed, exported, and audited without creating a financial posting workflow.
- Money-impact cases that require a financial adjustment keep an explicit finance approval status: not required, pending, approved, or rejected.
- Finance reviewers can record approval/rejection notes for a required financial adjustment, with reviewer and timestamp evidence.
- Support cases that require a financial adjustment cannot be resolved or closed until the adjustment approval status is approved.
- After approval, finance can post a linked special-savings refund from the case update sheet. The form requires amount, payment date, and payment reference; the dedicated withdrawal workflow verifies available special savings, posts the balanced savings-to-bank ledger adjustment, records processor/audit evidence, decrements the member savings snapshot, and resolves the case atomically.
- A special-savings case can be settled only once. The resolved case shows the posted amount, payment date, and reference.
- Closed cases are terminal and cannot be reopened. A case with a completed special-savings withdrawal cannot be moved back to an active status or reviewed again for a different finance outcome.
- Special-savings settlement runs inside a retry-bounded Serializable transaction. The transaction rechecks the completed-case gate, available balance, prior case withdrawal, and tenant payment-reference uniqueness before writing any money or case state.
- Staff replies, member replies, case creation, and status updates create audit entries.
- Case creation audit metadata includes the initial attachment URL when one is provided.
- Support case creation, member replies, staff replies, and status updates emit registered notification events with delivery audit records. Member-created cases and replies notify staff roles; staff-created cases, staff replies, and status updates notify the linked member when the member has an email address.
- Support summaries include open feature-request counts, so product feedback has a visible queue on staff and member support dashboards instead of being hidden inside the generic case total.
- Open support cases appear in the dashboard action queue.
- Workspace admins can export support cases from `/reports/support-export`, including linked records, money-impact flags, financial-adjustment approval evidence, assignment, resolution evidence, message counts, and date filters.
- `/support` has one server-prefetched, Suspense-owned infinite query for staff and member queues. Its opaque cursor carries the active ordering tuple, member sessions discard staff-only filters, and mutations invalidate the exact list plus selected-case query rather than polling.
- On screens below `md`, summary analytics and the desktop table are hidden. A flat divided Item queue, mobile Item skeleton, bottom-sheet filters, touch-sized actions, and full-screen create/update/reply/review workflows provide the mobile experience without document-level horizontal scrolling.
- The completed backward-flow UI re-audit keeps the desktop queue on one flat divider-led surface: summary values share one border-y strip, search remains at the top left, configuration and case creation stay at the right, and each row exposes one compact actions menu instead of several bordered buttons. Mobile filter choices use divided lists, and the empty state no longer duplicates the header create action.
- Staff/member case creation, status updates, refund settlement, finance review, and replies await removal of the URL-owned workflow state before refreshing list/detail data, preventing completed sheets from reopening with stale query parameters.
- Selected-case workflows show the full conversation, authorship and timestamps, linked/member context, finance-review state, completed-withdrawal evidence, and resolution summary so decisions do not depend on the table row alone.
- The native member Support route now uses feature-owned models, API adapters, screens, and dedicated `mobile-member-support` DB queries. The list is cursor-paginated, opening Reply hydrates the exact member-scoped detail, and the flat history exposes complete conversation context, linked records, money-impact governance, finance-review notes, resolution evidence, and terminal closed-case behavior.
- The native support summary uses unavailable placeholders until a server response exists. A failed initial read shows an unavailable case history and retry rather than zero counts or a false empty queue.
- Mobile creation and replies preserve drafts, block stale/offline commands, show confirmation/success evidence, expose the Feature request category, and obey the returned Operation Profile capability while existing cases remain readable. Pixel 3a API 34 Quick Fill, keyboard, confirmation, creation, reply, and corrected-author evidence are retained in the Ticket 05 screenshot manifest.

## Finance Safety Rules

- Support cases do not mutate savings, share capital, repayments, charges, financing, procurement, or ledger records.
- When a case requires a money correction, staff should mark it as needing a finance adjustment and complete the actual correction through an audited finance workflow.
- Financial-adjustment approval on a support case is governance evidence only; it does not post, reverse, waive, or adjust money by itself.
- The special-savings refund form launches a separate finance posting workflow after approval; opening, approving, or otherwise editing the support case does not move money.
- Rejected or pending financial-adjustment reviews keep the case open or in progress until staff remove the adjustment requirement or resolve the issue through a different audited workflow.
- Resolved or closed support cases need a resolution summary so decisions remain reviewable.

## Future Work

- Dashboard support attachments now have a 10 MiB direct-to-private-Blob code path. Private GET checks the saved support-message link and allows staff or the case's member/opener. Live uploads remain disabled until the separate Frankfurt stores, immutable entity association, approved retention/deletion and real cross-invocation QA are complete. See [private upload storage readiness](../runbooks/private-upload-storage-readiness.md).
- Add additional product-specific correction workflows for charges, repayments, shares, and other support resolutions.
- Add WhatsApp, push/mobile, and in-app support delivery channels when those notification channels are selected for a pilot.

Support case creation and replies now claim a private attachment for the exact saved support-message ID in the message transaction; private reads require that claim, matching URL and current case/member authorization. Live-store validation and approved retention/deletion remain open.

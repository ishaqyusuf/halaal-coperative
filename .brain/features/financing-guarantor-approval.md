# Financing Guarantor Approval

## Purpose
- Preserve client-required guarantor consent before a financing request can become an approved loan.
- Keep guarantor evidence separate from staff approval history so governance can distinguish member consent from finance review.

## Implemented Behavior
- Staff can select up to two guarantor members while submitting a loan request from `/loans`.
- Selected guarantors create pending `LoanGuarantorApproval` rows linked to the loan request.
- If a guarantor member has an email address, the system sends a direct guarantor approval request email using the tenant notification service with an action link to the member `/guarantor-approvals` page.
- Finance staff can record guarantor-approved or guarantor-rejected evidence with notes from the loan request table.
- Linked member guarantors can review their own guarantor requests from `/guarantor-approvals` and approve or reject pending requests without seeing tenant-wide loan queues.
- Final loan approval is blocked while any selected guarantor row is pending or rejected.
- Once a guarantor response is recorded, staff and member flows cannot overwrite that evidence; corrections require a separately designed, audited workflow.
- Guarantor response changes create audit log entries with actor, affected guarantor approval, loan request, status, and notes.
- Loan request review sends the borrower a direct status notification when the member has an email address.
- Mobile guarantor approval now has dedicated DB, API, feature-adapter, model, and screen ownership. The API never accepts a guarantor member id from the device; it resolves the member from the signed tenant/user session.
- Mobile responses require explicit confirmation, and rejection requires a response reason before the pending-only audited command is called. Offline or stale reads preserve the response draft but block the command.
- The Expo screen uses a review sheet for deliberate consent. Editable approval rows remain in the route-level keyboard-aware scroll surface so the focused response and both decisions remain visible above the Android keyboard.

## Data Model
- `LoanGuarantorApprovalStatus`: `pending`, `approved`, `rejected`.
- `LoanGuarantorApproval`: tenant, loan request, guarantor member, requester, responder, status, requested/responded timestamps, and response notes.

## Boundaries
- This slice records staff-entered guarantor evidence, member self-service guarantor responses, and direct email requests that route signed-in member guarantors to their approval page when email is available.
- It does not yet implement signed external approval links, WhatsApp approval, or automatic rejection/escalation timers.

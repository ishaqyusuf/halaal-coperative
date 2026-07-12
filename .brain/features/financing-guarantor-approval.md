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
- Guarantor response changes create audit log entries with actor, affected guarantor approval, loan request, status, and notes.

## Data Model
- `LoanGuarantorApprovalStatus`: `pending`, `approved`, `rejected`.
- `LoanGuarantorApproval`: tenant, loan request, guarantor member, requester, responder, status, requested/responded timestamps, and response notes.

## Boundaries
- This slice records staff-entered guarantor evidence, member self-service guarantor responses, and direct email requests that route signed-in member guarantors to their approval page when email is available.
- It does not yet implement signed external approval links, WhatsApp approval, or automatic rejection/escalation timers.

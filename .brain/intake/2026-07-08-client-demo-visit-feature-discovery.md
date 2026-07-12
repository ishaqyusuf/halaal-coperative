# Brain Intake: Client Demo Visit Feature Discovery

## Status
Proposed

## Created Date
2026-07-08

## Last Updated
2026-07-08

## Source
- Post-demo client discovery conversation after cooperative organization meeting.
- Companion report: `outputs/client-demo-visit-report.md`.

## Raw Input Summary
The potential client shared their current cooperative operating model, pain points, and desired features after the demo. Their main concern is that the platform must support their specific share, loan, payment, onboarding, staff, audit, and member self-service workflows without forcing them through a long historical-entry process.

## Client Pain Points
- Current onboarding and historical data entry feel too vigorous for an existing cooperative with active books.
- Their cooperative uses a purchasable share model, not only generic savings.
- Loan operations need richer tenant-level policy settings.
- Payments are currently manual: members bring receipts and staff record them in books.
- Members need a portal to view profile, status, shares, savings, loan status, procurement, special savings, receipts, and statements.
- Staff roles need to control what each staff member can view, perform, approve, reverse, export, or configure.
- Every important action must appear in an activity report with actor, authorizer, date, and affected record.
- They need confidence that records can be backed up or exported.

## Requested Capabilities

### Share Management
- Configure share cost, for example NGN 10,000 per share.
- Configure compulsory minimum share count for every member.
- Configure maximum share count, for example 20 shares.
- Enforce compulsory share ownership when enabled.
- Allow members to apply for additional shares up to the configured maximum.
- Track share purchases, share balance, and share approval status.
- Keep share capital distinct from ordinary savings, special savings, loan repayments, procurement repayments, and project financing.

### Loan And Financing Settings
- Configure payback windows and repayment duration options.
- Configure maximum loan amount as a multiple of member commitment.
- Configure whether a member currently servicing a loan can apply for emergency loan.
- Configure whether a member currently servicing a loan can access procurement.
- Configure strict commitment policy during loan service.
- Preserve flexible commitment behavior when strict policy is disabled.
- Support recurring loan repayment plus member commitment during loan service.
- Preserve loan request, approval, disbursement, repayment, and policy history.

### Strict Commitment During Loan Service
- When enabled, a member who takes a loan cannot reduce their existing monthly commitment while servicing the loan.
- Loan repayment is added on top of the existing commitment.
- When disabled, a member can use a flexible commitment amount during loan service.

### Guarantor Approval
- Capture guarantor details during loan request.
- Notify guarantor by email when approval is required.
- Allow guarantor to approve or reject before the loan proceeds.
- Block loan progression until required guarantor approvals are complete.
- Store guarantor approval evidence, timestamp, and status.

### Procurement Financing
- Model procurement as a separate financing product.
- Member requests an item such as a refrigerator or phone.
- Cooperative purchases the item for the member.
- Member repays the cooperative monthly.
- Track item description, estimated cost, approved cost, repayment plan, status, and approval history.
- Support policy setting for whether a member with active loan can access procurement.

### Special Savings
- Treat payment above monthly commitment as special savings when allocated that way.
- Track special savings separately from normal commitment savings.
- Show special savings in member profile and reports.
- Support payment allocation into special savings from member-submitted receipts or admin posting.

### Project Financing
- Support cooperative investment into member businesses or projects.
- Member submits project/business financing request.
- Cooperative reviews the request, approved amount, repayment/return terms, supporting documents, and status.
- Track project financing separately from loans and procurement.
- Clarify whether this is a repayable facility, investment partnership, or profit-sharing arrangement before implementation.

### Member Portal
- Member login.
- Profile and status.
- Share balance and share application status.
- Loan/financing status.
- Procurement status.
- Special savings balance.
- Payment history.
- Receipt upload and approval status.
- Statements or account summary.

### Member Payment Submission And Receipt Upload
- Member submits payment from their profile after paying externally.
- Member uploads bank receipt/payment proof.
- Member selects one or more payment categories.
- Member enters amount per category.
- Supported categories should include loan repayment, monthly commitment, special savings, procurement repayment, and share purchase.
- Admin reviews the submitted receipt.
- Admin approves, rejects, or requests correction.
- Approved payments update the relevant balances and schedules.
- Submitted payments must remain staged until admin approval.

### Brought-Forward Onboarding
- Add a brought-forward option for existing cooperatives.
- Brought forward means entering the current position from the books instead of entering every historical transaction.
- Capture current savings/commitment balance.
- Capture current share count or share value.
- Capture active loan balance where applicable.
- Capture active procurement balance where applicable.
- Capture special savings balance where applicable.
- Capture only ongoing businesses/project financing where previous profit has already been shared.
- Support brought-forward setup inside Getting Started.
- Brought-forward records must create auditable opening balances and opening obligations, not pretend to be full historical transaction rows.

### Admin, HRM, Roles, And Permissions
- Super admin can create staff users.
- Staff users have assigned roles.
- Roles define module and action access.
- Sensitive actions require proper authorization.
- Staff permissions should cover member management, payment review, loan approval, procurement approval, share approval, project financing approval, reports/export, settings, and staff management.

### Activity Report And Audit Trail
- Log every important system action.
- Required fields: action performed, actor, authorizer where applicable, date/time, related member/record, previous and new values for sensitive changes, and approval/review status.
- Audit logging is required for finance trust, investigation, governance, and reporting.

### Backup And Record Export
- Provide reliable platform-level data backup.
- Provide admin exports for important records.
- Backup/export should cover members, shares, contributions, loans, procurement, project financing, special savings, approvals, and audit logs.
- Restore and recovery policy still needs definition.

## Major Configuration Requirements

| Area | Required Configuration |
| --- | --- |
| Shares | Share cost, compulsory share count, maximum share count, additional share application rules |
| Loan/financing | Payback windows, maximum loan multiple, emergency loan eligibility, active-loan restrictions |
| Commitment | Strict commitment during loan service on/off, flexible commitment option |
| Procurement | Active-loan access policy, repayment terms, approval rules |
| Payments | Allowed payment categories, receipt upload requirement, admin approval requirement |
| Onboarding | Full historical backfill vs brought-forward opening balances |
| Roles | Staff permissions by module and action |
| Audit | Required logging for actor, authorizer, date, action, and affected record |

## Suggested Priority Grouping

### Priority A: Core Fit For This Client
- Share configuration and member share tracking.
- Brought-forward onboarding.
- Loan policy settings.
- Member payment submission with receipt upload.
- Admin payment review and approval.
- Member portal account summary.
- Staff roles and permissions.
- Activity report and audit trail.

### Priority B: Expanded Cooperative Operations
- Guarantor approval workflow.
- Procurement financing.
- Special savings.
- Backup/export improvements.
- Improved loan commitment policy controls.

### Priority C: Advanced Financing Modules
- Project financing.
- Business/project return tracking.
- Advanced member statements.
- More detailed reporting and analytics.

## Open Questions

### Shares
- Can compulsory share count ever be more than one?
- Can maximum share count differ by member category?
- Can members sell, transfer, or withdraw shares?
- Are share purchases approved manually or automatic after payment approval?
- Do shares affect profit/dividend sharing?

### Loans And Emergency Loans
- How many guarantors are required per loan?
- Can guarantors be members only, or external people too?
- What happens if a guarantor rejects?
- Are emergency loans a separate product with separate limits and terms?
- Should existing active loans block all new loans, or only emergency loans?

### Procurement
- Does the cooperative buy from approved vendors?
- Does procurement require invoice upload?
- Can procurement have guarantors?
- Can procurement repayment overlap with loan repayment?
- What happens if procurement repayment defaults?

### Special Savings
- Can members withdraw special savings anytime?
- Does special savings count toward loan eligibility?
- Does special savings participate in profit distribution?

### Project Financing
- Is project financing a repayable facility, investment partnership, or profit-sharing arrangement?
- How are returns calculated and approved?
- What documents are required before approval?
- Can a member have active loan, procurement, and project financing at the same time?

### Brought Forward
- What exact fields should be captured as opening balances?
- Who authorizes the brought-forward record?
- Should supporting documents be uploaded for brought-forward entries?
- Can brought-forward entries be edited after approval?

### Payments
- What receipt file formats are allowed?
- Should duplicate receipt detection be required?
- Should members receive email or WhatsApp notification after approval or rejection?
- Can admin split or correct the member's submitted allocation during review?

## Product Guardrails
- Keep shares, savings, special savings, loan principal, procurement repayment, and project financing separate.
- Member-uploaded receipts must not update balances before admin approval.
- Brought-forward balances must not silently rewrite historical records.
- Project financing must not be treated as ordinary loan logic until the cooperative's policy is clarified.
- Audit logging must cover approvals, reversals, role changes, opening balances, disbursements, payment approvals, and sensitive settings changes.
- Every finance action must remain tenant-scoped and role-controlled.

## Duplicate Or Existing Items
- Related to `brain/features/onboarding-finance-setup-and-member-backfill.md`, but this intake adds brought-forward opening balances as a faster alternative to detailed historical backfill.
- Related to `brain/features/member-commitments-and-payment-allocation.md`, but this intake extends payment allocation into member self-service receipt uploads, procurement, special savings, and share purchases.
- Related to `brain/intake/2026-07-08-monthly-financing-cycle-loan-settings.md`, but this intake adds client-specific loan policy toggles, guarantor approval, emergency-loan blocking, and procurement blocking.
- Related to `brain/product/admin-dashboard-kpi-framework.md` through activity reporting, approval queues, audit exceptions, and finance action visibility.

## Generated Plans
- None yet. User requested report first, then implementation planning in a later step.

## Recommended Execution Order
1. Convert Priority A into a phased implementation plan.
2. Validate open questions with the client before implementing project financing and share withdrawal/transfer behavior.
3. Design the brought-forward data model before changing member onboarding or migration UI.
4. Design receipt-staged payment approval before member portal payment submission.

## Handoff Notes
- The implementation plan should define phases, data model changes, admin/member workflows, settings, permissions, audit rules, brought-forward strategy, tests, and demo milestones.
- The likely MVP should prioritize share configuration, brought-forward onboarding, loan policy settings, receipt-based member payment submission, admin approval, member account visibility, roles, and activity reporting.

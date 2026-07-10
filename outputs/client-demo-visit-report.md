# Client Demo Visit Report

Date: 2026-07-08

Project: Halaalvest Cooperative Operations Platform

## 1. Executive Summary

The demo visit surfaced a strong product fit, but the potential client operates with several policies that are more specific than the current generic cooperative workflow. Their biggest needs are configurable share ownership, richer loan/financing rules, procurement financing, special savings, project financing, lighter onboarding through brought-forward balances, member self-service payments, staff role management, audit/activity reporting, and reliable backup/export of records.

The client is not only asking for more screens. They need the platform to support their cooperative policy model in a configurable way, so that future cooperatives with different rules can also be onboarded without custom code.

## 2. Main Client Pain Points

- The current onboarding and historical data entry process feels too long for a cooperative that already has active books.
- Their share model is based on purchasable shares, not only generic savings.
- Loan operations require more tenant-level policy settings and approval rules.
- Payments are currently handled manually through receipts and book entry.
- Members need their own portal to view profile, status, shares, savings, loans, procurement, and payment history.
- Admins need reliable audit trails showing who performed an action, who authorized it, and when it happened.
- Staff access must be controlled through roles and permissions.
- The cooperative needs backup/export confidence for all important records.

## 3. Requested Product Capabilities

### 3.1 Share Management

The client uses a share-based ownership system. Each share has a configurable cost, for example NGN 10,000 per share.

Required capabilities:

- Configure share cost per cooperative.
- Configure compulsory minimum share count for every member.
- Configure maximum share count, for example up to 20 shares.
- Enforce compulsory one-share ownership for each member if enabled.
- Allow members to apply for additional shares up to the configured maximum.
- Track share purchases, share balance, and share-related approvals.

Important implication:

Share capital should be tracked separately from ordinary savings, special savings, loan repayments, procurement repayments, and business/project financing.

### 3.2 Loan And Financing Settings

The client needs loan settings that can reflect their real operating rules.

Required capabilities:

- Configure payback windows and repayment duration options.
- Configure maximum loan amount as a multiple of member commitment.
- Configure whether a member currently servicing a loan can apply for emergency loan.
- Configure whether a member currently servicing a loan can access procurement.
- Configure strict commitment policy during loan service.
- Keep flexible commitment policy available when strict policy is disabled.
- Support recurring loan repayment plus member commitment during the loan period.
- Preserve loan approval, disbursement, repayment, and policy history.

Strict commitment policy:

When enabled, a member who takes a loan cannot reduce their previous monthly commitment while servicing the loan. Their loan repayment is added on top of the existing commitment. When disabled, the member may use a flexible commitment amount during the loan service period.

### 3.3 Guarantor Approval Workflow

The client expects guarantors to actively approve loan requests before the loan can proceed.

Required capabilities:

- Capture guarantor details on a loan request.
- Notify guarantor by email when approval is required.
- Allow guarantor to approve or reject the guarantee request.
- Block the loan from progressing until required guarantor approvals are complete.
- Store guarantor approval evidence, timestamp, and status.

Important implication:

Guarantor approval should be treated as part of the loan governance workflow, not just a notification.

### 3.4 Procurement Financing

The client has a procurement workflow where a member requests an item, the cooperative buys it, and the member repays the cooperative monthly.

Example:

A member wants a refrigerator or phone. The cooperative purchases it for the member, then the member repays the cooperative over time.

Required capabilities:

- Member procurement request.
- Item description, estimated cost, approved cost, and repayment plan.
- Admin review and approval.
- Optional policy check against active loans or other obligations.
- Procurement repayment schedule.
- Procurement status tracking from request to completion.

Important implication:

Procurement should be modeled as its own financing product, separate from normal loan and emergency loan, even if repayment behaves similarly.

### 3.5 Special Savings

Special savings means money paid above the member's monthly commitment.

Required capabilities:

- Detect or allocate excess payment above monthly commitment.
- Allow members or admins to assign extra amount to special savings.
- Track special savings balance separately from normal commitment savings.
- Show special savings in member profile and reports.

Important implication:

Payment allocation must support multiple destinations in one payment: commitment, loan repayment, special savings, procurement repayment, and possibly shares.

### 3.6 Project Financing

The client wants cooperative investment into member businesses.

Required capabilities:

- Member submits project or business financing request.
- Cooperative reviews the business/project request.
- Define approved amount, repayment terms, and expected return or repayment structure.
- Track disbursement, repayment, status, and supporting documents.
- Report active project financing separately from loans and procurement.

Important implication:

Project financing should be treated carefully because it may involve business returns, investment participation, or profit treatment. It should remain auditable and separate from interest-based loan logic.

### 3.7 Member Portal And Profile

Members need to log in and see their own information.

Required capabilities:

- Member login.
- Member profile and status.
- Share balance and share application status.
- Loan/financing status.
- Procurement status.
- Special savings balance.
- Payment history.
- Uploaded receipts and approval status.
- Statements or account summary.

### 3.8 Member Payment Submission With Receipt Upload

The client currently expects members to pay externally, bring receipts, and staff record payments manually. The proposed system should digitize this workflow.

Required capabilities:

- Member submits payment from their profile.
- Member uploads bank receipt or payment proof.
- Member selects one or more payment categories.
- Member enters amount per selected category.
- Admin reviews the submitted receipt.
- Admin approves, rejects, or requests correction.
- Approved payments update the relevant balances and schedules.

Example payment categories:

- Loan repayment.
- Monthly commitment.
- Special savings.
- Procurement repayment.
- Share purchase.

Important implication:

Submitted payments should be staged until admin approval. They should not immediately affect live balances before review.

### 3.9 Brought-Forward Onboarding

The client considers full historical entry too vigorous. They want a brought-forward option.

Definition:

Brought forward means entering the current position from the cooperative's books instead of entering every historical transaction.

Required capabilities:

- Create a member with current book position.
- Enter current savings/commitment balance.
- Enter current share count or share value.
- Enter active loan balance, if any.
- Enter active procurement balance, if any.
- Enter special savings balance, if any.
- Enter only ongoing businesses or project financing where historical profit has already been shared.
- Use brought-forward data in Getting Started setup.

Important implication:

Brought-forward onboarding should create auditable opening balances and opening obligations. It should not pretend those balances were generated from detailed transaction history.

### 3.10 Admin, HRM, Roles And Permissions

The client needs a staff management system.

Required capabilities:

- Super admin can create staff users.
- Staff users have assigned roles.
- Roles define what staff can view, create, approve, edit, reverse, export, or configure.
- Sensitive actions require proper authorization.
- Activity reports show actor, authorizer, action, and date.

Example role areas:

- Member management.
- Contribution/payment review.
- Loan approval.
- Procurement approval.
- Share approval.
- Project financing approval.
- Reports/export.
- System settings.
- Staff management.

### 3.11 Activity Report And Audit Trail

Every important system action should be logged.

Required audit fields:

- Action performed.
- Person who performed the action.
- Person who authorized the action, where applicable.
- Date and time.
- Related member or record.
- Previous value and new value for sensitive changes, where applicable.
- Status of approval or review.

Important implication:

Audit logging is not optional for finance workflows. It is needed for trust, investigation, governance, and reporting.

### 3.12 Backup And Record Export

The client requested backup of all records.

Required capabilities:

- Reliable platform-level data backup.
- Exportable records for admins.
- Backup/export coverage for members, shares, contributions, loans, procurement, project financing, special savings, approvals, and audit logs.
- Clear restore or recovery policy to be defined later.

## 4. Major Configuration Requirements

| Area | Required Configuration |
| --- | --- |
| Shares | Share cost, compulsory share count, maximum share count, additional share application rules |
| Loan/financing | Payback windows, maximum loan multiple, emergency loan eligibility, active-loan restrictions |
| Commitment | Strict commitment during loan service on/off, flexible commitment option |
| Procurement | Whether active loan members can access procurement, repayment terms, approval rules |
| Payments | Allowed payment categories, receipt upload requirement, admin approval requirement |
| Onboarding | Full historical backfill vs brought-forward opening balances |
| Roles | Staff permissions by module and action |
| Audit | Required logging for actor, authorizer, date, action, and affected record |

## 5. Product Interpretation

The client needs three major product improvements:

1. More tenant-configurable cooperative policies.
2. More member-facing self-service.
3. A lighter onboarding path for existing cooperatives.

This suggests the product should support both:

- Detailed historical migration for cooperatives that want full transaction history.
- Brought-forward opening balances for cooperatives that want to start from current books.

Both paths must remain auditable.

## 6. Suggested Priority Grouping For Future Planning

This is not the implementation plan yet, but the requests can be grouped for planning.

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

## 7. Open Questions For Follow-Up

### Shares

- Can the compulsory share count ever be more than one?
- Can the maximum share count differ by member category?
- Can members sell, transfer, or withdraw shares?
- Are share purchases approved manually or automatic after payment approval?
- Do shares affect profit/dividend sharing?

### Loans And Emergency Loans

- How many guarantors are required per loan?
- Can guarantors be members only, or can they be external people?
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
- Does special savings earn or participate in any profit distribution?

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

## 8. Risks And Product Guardrails

- Do not mix shares, savings, special savings, loan principal, procurement repayment, and project financing into one unclear balance.
- Do not allow member-uploaded receipts to update balances before admin approval.
- Do not allow brought-forward balances to silently rewrite historical records.
- Do not treat project financing as ordinary loan logic until the cooperative's policy is clarified.
- Do not weaken audit logging around approvals, reversals, role changes, opening balances, disbursements, or payment approvals.
- Keep all finance actions tenant-scoped and role-controlled.

## 9. Recommended Next Step

The next step is to convert this report into an implementation plan.

The implementation plan should define:

- Feature phases.
- Data model changes.
- Admin and member workflows.
- Required settings.
- Audit and permission rules.
- Migration/brought-forward strategy.
- Testing scope.
- Delivery estimate and demo milestones.

The strongest immediate direction is to prioritize a client-fit MVP around share configuration, brought-forward onboarding, loan policy settings, receipt-based member payment submission, admin approval, member portal visibility, and activity reporting.

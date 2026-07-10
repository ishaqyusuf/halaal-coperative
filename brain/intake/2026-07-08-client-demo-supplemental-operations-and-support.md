# Brain Intake: Client Demo Supplemental Operations And Support

## Status
Proposed

## Created Date
2026-07-08

## Last Updated
2026-07-08

## Source
- Supplemental post-demo notes after the main client discovery report.
- Keep separate from `brain/intake/2026-07-08-client-demo-visit-feature-discovery.md`.
- Future notes extracted from the July 8 screen recordings should be appended here or used to create child plans from this intake, not merged into the first discovery record.
- Dedicated recording-derived notes are now captured in `brain/intake/2026-07-08-client-demo-recording-derived-notes.md`.

## Raw Input Summary
After the first client discovery report, additional meeting themes were identified around data safety, legal assurances, error monitoring, feature request handling, customer service communication, future/back payment handling, and food purchase commitments.

## Requested Capabilities And Concerns

### Data Safety, Security, And System Stability
- The client raised concerns about data safety, security, and the risk of system crashing.
- We assured them the platform will include legal and operational safeguards for both parties.
- Terms and conditions, legal documentation, and other contractual details should clearly explain data handling, responsibilities, limitations, support expectations, and recovery posture.

Important product implication:

Security and reliability should be communicated as both a technical concern and a contractual/operational assurance. The product should avoid vague promises and define what is covered by platform controls, backups, terms, support, and escalation process.

### Legal And Terms Assurance
- A legal team should review the terms and conditions.
- Customer-facing terms should protect both the cooperative and the platform.
- Terms should clarify usage rules, data responsibility, service availability, issue reporting, acceptable use, support expectations, and any limitation of liability.
- Legal documentation should not be treated as a purely technical feature, but it affects onboarding confidence and enterprise readiness.

### Bug, Error, And Feature Request Handling
- The platform should use Sentry or equivalent monitoring for detailed error reports.
- Error reports should help the team diagnose issues without depending only on user screenshots or vague complaints.
- There should be a feature request platform or workflow where cooperatives can submit, track, and prioritize requested improvements.

Important product implication:

Error monitoring and feature requests are part of operational trust. They should feed into support workflows, product triage, and release planning.

### Customer Service And Member Issue Resolution
- Members should be able to communicate with cooperative admins to resolve issues.
- Common issues include payment mistakes, wrong allocation, incorrect receipt, account concerns, and other member service requests.
- All communication and resolution records should be documented clearly.
- Resolution activities should appear in the activity/audit section.

Important product implication:

Customer service should be modeled as a case/ticket workflow tied to member records, payments, receipts, and admin actions. It should not be only an informal message box.

### Future Payment And Back Payment
- Members should be able to pay ahead for future months.
- Members should also be able to fill up or pay for a defaulted/missed month.
- The system should distinguish normal current-month payment, future payment, and back/defaulted-month payment.
- Admin review should make sure payment allocation lands on the intended month(s).

Important product implication:

The payment allocation system needs period-aware allocation, not only category-aware allocation. A payment may target one or more categories and one or more months.

### Food Purchase Commitment
- The client mentioned a food purchase commitment workflow.
- This appears to be a recurring or specific commitment related to food purchases under the cooperative.
- It may behave like a dedicated contribution/commitment category, a procurement category, or a special savings/obligation type.

Needs clarification:

- Is food purchase commitment a monthly contribution category?
- Is it a procurement-style purchase repaid over time?
- Is it a savings pool reserved for food purchase?
- Does it require admin approval or member opt-in?
- Can members pay ahead or backfill missed food commitment months?

## Configuration Requirements

| Area | Required Configuration |
| --- | --- |
| Security/legal | Terms acceptance, legal policy references, support and recovery commitments |
| Monitoring | Sentry/error reporting setup, severity handling, notification routing |
| Feature requests | Request categories, status, priority, tenant visibility, internal triage |
| Customer service | Case categories, member/admin messages, status, assignment, resolution logs |
| Payments | Current-month, future-month, and back/defaulted-month allocation |
| Food commitment | Category behavior, repayment/commitment rules, approval requirement |

## Suggested Priority Grouping

### Priority A: Trust And Operations Readiness
- Legal/terms readiness checklist.
- Error monitoring with Sentry.
- Basic feature request intake workflow.
- Activity/audit coverage for support and payment resolution.

### Priority B: Member Support Workflow
- Member-to-admin support cases.
- Payment mistake dispute/resolution workflow.
- Case status, assignment, comments, and resolution activity log.

### Priority C: Advanced Payment Allocation
- Future-month payment allocation.
- Back/defaulted-month payment allocation.
- Food purchase commitment modeling.

## Open Questions

### Data Safety And Legal
- What legal documents must be ready before pilot launch?
- Who owns uploaded receipt files and member documents?
- What backup and restore promise should be made contractually?
- What service availability level should be promised during beta?

### Error Monitoring And Requests
- Should Sentry be internal-only, or should admins see incident status?
- What severity levels require immediate action?
- Should feature requests be visible only to our team, or can cooperative admins track them?
- Should each cooperative have its own feature request list?

### Customer Service
- Should members message only admins, or can staff departments be assigned cases?
- Should support cases allow attachments such as receipts or documents?
- Should support cases be linked directly to payments, loans, procurement, shares, or member records?
- Should members receive notification when a case is updated or resolved?

### Future And Back Payments
- Can a member pay multiple future months in one receipt?
- Can a member allocate one receipt across current, future, and defaulted months?
- How should overpayment be handled if future months already have payment?
- Can admins change member-selected month allocation during review?

### Food Purchase Commitment
- Is food purchase commitment a separate product, contribution category, or procurement workflow?
- Is it compulsory or optional?
- Does it have a fixed monthly amount?
- Does it affect loan eligibility or member account standing?

## Product Guardrails
- Do not promise legal protection, uptime, or recovery guarantees that are not backed by actual policy and infrastructure.
- Do not expose raw Sentry details or sensitive stack traces to cooperative users.
- Do not let support-case resolution silently mutate financial records without approval and audit logs.
- Do not let future/back payments post without clear target period allocation.
- Keep customer service records tenant-scoped and member-scoped.
- Keep food purchase commitments separate from general savings until the financial behavior is clarified.

## Duplicate Or Existing Items
- Related to `brain/intake/2026-07-08-client-demo-visit-feature-discovery.md`, but intentionally separated as a supplemental operations/support intake.
- Related to `brain/product/admin-dashboard-kpi-framework.md` through action queues, audit exceptions, support cases, and failed/error follow-up visibility.
- Related to `brain/features/member-commitments-and-payment-allocation.md` through future/back payment allocation, but this intake adds period targeting and support-case resolution.

## Generated Plans
- None yet. This intake should be converted into implementation plans after the core client-fit MVP is scoped.

## Recommended Execution Order
1. Define legal/terms readiness and security/reliability messaging for beta.
2. Add Sentry/error monitoring and internal incident triage if not already complete.
3. Design support cases tied to members and financial records.
4. Extend payment allocation to support current, future, and defaulted months.
5. Clarify and model food purchase commitment.

## Handoff Notes
- Keep recording-derived supplemental notes separate from the first discovery record.
- When converting to implementation, separate trust/ops work from finance allocation work so legal/support tooling does not block core money workflows.

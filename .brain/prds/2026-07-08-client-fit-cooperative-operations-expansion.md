# PRD: Client-Fit Cooperative Operations Expansion

## Problem Statement

Existing cooperatives already have active books, member balances, shares, loans, procurement obligations, receipts, staff workflows, and audit expectations. The current platform demo showed strong foundations, but the potential client cannot adopt it safely unless it supports their actual operating model without forcing staff to re-enter every historical transaction one by one.

From the client's perspective, the platform must reduce manual book work, preserve trust in member balances, support configurable share and financing policies, let members submit receipts and view their own status, give admins strong review/approval controls, and provide evidence that data, staff actions, support resolutions, and financial corrections are secure, auditable, and recoverable.

The biggest adoption blocker is onboarding and operational fit. If the cooperative must recreate all historical data before going live, the system feels too heavy. If the system allows balances, receipts, shares, loans, procurement, support issues, or staff actions to change without approval and audit evidence, it will not meet the cooperative's governance expectations.

## Solution

Build a client-fit cooperative operations expansion that adds configurable share capital, brought-forward onboarding, richer financing policies, member receipt submission, admin approval queues, support cases, period-aware payment allocation, procurement/emergency financing, special savings, staff roles, activity reporting, export/backup confidence, and clear legal/security/reliability posture.

The product should support two onboarding paths:

1. Full historical setup and backfill for cooperatives that want detailed reconstruction.
2. Brought-forward opening balances for existing cooperatives that want to enter current book positions and start operating quickly.

The product should keep money flows explainable and separated: share capital, monthly commitment savings, special savings, financing principal, repayments, procurement obligations, project financing, food purchase commitments, charges, and business-profit/dividend allocations must not collapse into one generic balance.

The product should also move daily operations into controlled workflows: member submissions are staged until admin approval, sensitive staff actions are role-controlled, approved financial records are corrected through adjustment/reversal paths rather than silent edits, and all important actions are visible in an activity report with actor, authorizer, date, and affected record.

## User Stories

1. As a tenant admin, I want to configure the cost of one share unit, so that the cooperative's share policy matches our book.
2. As a tenant admin, I want to configure compulsory minimum share units, so that every member can be required to hold at least one share.
3. As a tenant admin, I want to configure maximum share units, so that members cannot exceed the cooperative's share cap.
4. As a tenant admin, I want compulsory and optional shares to be separated, so that we can explain each member's required and voluntary share position.
5. As a member, I want to apply for additional shares, so that I can increase my cooperative shareholding within the allowed limit.
6. As a finance officer, I want to review additional share applications, so that share purchases are approved before they affect share capital.
7. As a finance officer, I want share capital to remain separate from savings and repayments, so that reports and dividend calculations are trustworthy.
8. As a tenant admin, I want share policy changes to be audited, so that staff can see who changed the policy and when.
9. As a member, I want to see my share count, share value, and pending share applications, so that I understand my share position.
10. As a tenant admin, I want to record business profit with dates, so that yearly dividend distribution is based on actual cooperative business results.
11. As a finance officer, I want profit entries grouped into reviewed dividend seasons, so that allocations are controlled before publication.
12. As a tenant admin, I want yearly dividend distribution support, so that member profit allocation can follow the cooperative's annual process.
13. As a finance officer, I want dividend allocations to be auditable, so that members can understand how their profit share was calculated.
14. As a tenant admin, I want brought-forward onboarding, so that we can start with current book balances instead of entering every historical transaction.
15. As a finance officer, I want to enter brought-forward savings balances, so that member current positions can be captured quickly.
16. As a finance officer, I want to enter brought-forward share units or share value, so that member share capital is correct at go-live.
17. As a finance officer, I want to enter brought-forward active financing balances, so that outstanding obligations continue after go-live.
18. As a finance officer, I want to enter brought-forward procurement balances, so that ongoing item purchases continue to be tracked.
19. As a finance officer, I want to enter brought-forward special savings balances, so that member non-commitment savings are preserved.
20. As a finance officer, I want to enter only ongoing business/profit items during brought-forward setup, so that closed historical profit seasons do not need to be recreated.
21. As a tenant admin, I want brought-forward records reviewed before posting, so that opening balances are authorized.
22. As a tenant admin, I want supporting documents attached to opening balances, so that we can justify migrated positions later.
23. As an auditor, I want brought-forward balances to be marked as opening balances, so that they are not confused with ordinary transaction history.
24. As a finance officer, I want the Getting Started flow to offer full backfill or brought-forward setup, so that onboarding matches the cooperative's readiness.
25. As a tenant admin, I want to configure financing payback windows, so that loans follow cooperative policy.
26. As a tenant admin, I want to configure maximum financing amount as a multiple of member commitment or savings, so that eligibility follows our rules.
27. As a tenant admin, I want to decide whether active financing blocks emergency financing, so that risk policy is configurable.
28. As a tenant admin, I want to decide whether active financing blocks procurement, so that procurement access matches cooperative policy.
29. As a tenant admin, I want strict commitment mode during financing service, so that members cannot reduce their existing commitment while repaying.
30. As a tenant admin, I want flexible commitment mode when strict commitment is disabled, so that the cooperative can support different repayment arrangements.
31. As a member, I want to request financing within the allowed term and amount limits, so that I do not submit requests that violate policy.
32. As a finance officer, I want the financing form to be guided by tenant settings, so that staff cannot approve out-of-policy requests accidentally.
33. As a finance officer, I want early repayment or offset to clear outstanding balances, so that a member who pays ahead can finish servicing earlier.
34. As a finance officer, I want scheduled servicing to stop when a financing balance is fully cleared, so that the member is not overcharged.
35. As a tenant admin, I want guarantor approval on financing requests, so that a request cannot proceed until required guarantors approve.
36. As a guarantor, I want to receive an approval request by email, so that I can approve or reject a member's financing request.
37. As a finance officer, I want guarantor approval evidence saved, so that financing decisions are traceable.
38. As a member, I want to request procurement for an item, so that the cooperative can purchase it and I can repay monthly.
39. As a finance officer, I want procurement to be separate from ordinary financing, so that item purchases, costs, and repayment plans are clear.
40. As a tenant admin, I want procurement policy to define whether active financing blocks procurement, so that product access follows risk policy.
41. As a member, I want emergency financing to be separate from normal financing, so that urgent requests can follow their own rules.
42. As a tenant admin, I want emergency and procurement products to have configurable codes or identifiers, so that reports and forms use recognizable categories.
43. As a tenant admin, I want to define charge or product short codes, so that cooperative categories can be tracked consistently.
44. As a finance officer, I want unclear short-code rules confirmed before implementation, so that the system does not encode the wrong client policy.
45. As a member, I want to submit a payment receipt from my profile, so that I do not need to bring paper receipts to the office.
46. As a member, I want to upload proof of bank transfer, so that admins can verify my payment.
47. As a member, I want to split one payment across categories, so that one transfer can cover commitment, loan, special savings, procurement, shares, or other obligations.
48. As a member, I want to enter the amount for each selected payment category, so that the allocation matches my intention.
49. As a member, I want to pay ahead for future months, so that I can pre-fund upcoming commitments.
50. As a member, I want to pay a missed/defaulted month, so that I can clear arrears.
51. As a member, I want to select the period my payment applies to, so that admins know whether it is current, future, or back payment.
52. As a finance officer, I want submitted receipts to remain staged until approval, so that unverified payments do not affect balances.
53. As a finance officer, I want to approve, reject, or request correction on a receipt, so that payment records are accurate.
54. As a finance officer, I want to adjust a member's selected allocation during review with an audit reason, so that mistakes can be corrected transparently.
55. As a member, I want to see receipt approval status, so that I know whether my payment has been accepted.
56. As a finance officer, I want duplicate receipt checks, so that the same payment proof is not posted twice.
57. As a finance officer, I want overpayment above fixed monthly commitment to go to special savings when configured or approved, so that extra funds are not mixed with ordinary commitment.
58. As a member, I want to see special savings separately, so that I know which balance is extra savings.
59. As a tenant admin, I want to configure whether special savings affects financing eligibility, so that policy is clear.
60. As a tenant admin, I want food purchase commitment modeled as its own configurable category after clarification, so that food-related obligations can be tracked properly.
61. As a finance officer, I want food purchase commitment payments to support future and back periods if applicable, so that food obligations work like real monthly commitments.
62. As a member, I want a portal dashboard showing profile, status, savings, shares, special savings, financing, procurement, payments, and statements, so that I can self-serve.
63. As a member, I want to submit profile or document updates for approval, so that my records can be corrected without staff retyping everything.
64. As a member, I want to see my active obligations and outstanding balances, so that I can plan payments.
65. As a member, I want notifications when receipts, financing requests, share requests, or support cases change status, so that I stay informed.
66. As a tenant admin, I want to create staff users, so that cooperative work can be delegated.
67. As a tenant admin, I want to assign staff roles, so that each staff member only has the access they need.
68. As a tenant admin, I want role permissions per module and action, so that member management, payment review, financing approval, procurement approval, share approval, settings, reports, and staff management are controlled.
69. As a tenant admin, I want super admin access separate from ordinary admin access, so that sensitive actions remain governed.
70. As an operations officer, I want member access to be limited to their own profile and records, so that members cannot see or change cooperative-wide data.
71. As a finance officer, I want approved records to be locked from casual edits, so that posted financial history remains trustworthy.
72. As a finance officer, I want corrections to use adjustment or reversal workflows, so that financial mistakes are fixed without hiding the original action.
73. As a tenant admin, I want an activity report for every important action, so that I can investigate who did what.
74. As an auditor, I want activity records to include actor, authorizer, date, affected record, and before/after values for sensitive changes, so that governance evidence is complete.
75. As a tenant admin, I want the activity report to include support resolutions, so that customer service decisions are traceable.
76. As a member, I want to open a support case, so that I can report payment mistakes or account issues.
77. As a cooperative admin, I want to respond to member support cases, so that issues are resolved inside the system.
78. As a cooperative admin, I want support cases linked to payments, receipts, shares, financing, procurement, or member records, so that context is easy to find.
79. As a cooperative admin, I want support case resolution actions to require approval when they affect money, so that service staff cannot silently change balances.
80. As a tenant admin, I want support records retained, so that disputes can be reviewed later.
81. As a tenant admin, I want exportable reports for members, shares, contributions, financing, procurement, special savings, support, and audit logs, so that we can maintain offline confidence.
82. As a tenant admin, I want backup and restore posture documented, so that the cooperative understands what happens if something goes wrong.
83. As a tenant admin, I want legal terms and conditions before pilot launch, so that both parties understand responsibilities and limitations.
84. As a platform operator, I want Sentry or equivalent error monitoring, so that code errors are reported with enough detail to debug quickly.
85. As a platform operator, I want feature requests captured and triaged, so that client feedback turns into trackable product work.
86. As a tenant admin, I want realistic reliability messaging, so that security and uptime expectations are clear instead of vague.
87. As a platform operator, I want sensitive infrastructure and error details hidden from cooperative users, so that security posture is not weakened.
88. As a tenant admin, I want hosted subdomain support and a path toward personalized cooperative domains, so that the cooperative can present a professional member-facing portal.
89. As a future member user, I want WhatsApp, email, mobile app, and AI-assisted notifications to be possible later, so that the platform can grow without redesigning core workflows.
90. As a product owner, I want unclear client-specific items captured as open questions, so that implementation does not hard-code uncertain policies.

## Implementation Decisions

- Treat this as an umbrella PRD for client-fit cooperative operations, not a single small feature. Implementation should be phased, but the issue should preserve the full client context.
- Preserve the Halaal/interest-free finance model. No interest-bearing logic, compounding penalties, hidden fees, or guaranteed disbursement behavior should be introduced.
- Keep money domains separate: share capital, monthly commitment savings, special savings, financing principal, repayments, procurement obligations, project financing, food purchase commitments, charges, and profit/dividend allocations.
- Add tenant-configurable share policy covering unit cost, compulsory minimum units, maximum units, member additional-share requests, approval state, and audit trail.
- Model share purchases as staged or approved events. Member requests and payment-backed share purchases should not update share capital until reviewed.
- Extend onboarding with a brought-forward path alongside detailed historical backfill. Brought-forward records should create opening balances and opening obligations, not fake historical transactions.
- Keep brought-forward entries visibly staged/reviewed before posting. Approval should capture actor, authorizer, source note, supporting document references, and affected balances.
- Reuse the existing migration/backfill lifecycle concepts: staged/imported/generated records are separate from posted/live records, and live records are protected after migration finalization.
- Extend financing policy settings rather than hard-coding client rules. Tenant policy should cover payback window, maximum amount multiple, strict commitment during service, active-loan emergency eligibility, active-loan procurement eligibility, product activation, and term caps.
- Separate tenant financing settings from individual financing forms. Forms should validate against current tenant policy and product configuration.
- Add early settlement/offset behavior for financing repayments. When incoming repayment clears outstanding balance, remaining scheduled servicing should stop or be marked satisfied through an auditable state transition.
- Add guarantor approval as a gated workflow on financing requests. Requests that require guarantors should not proceed to final approval or disbursement until required guarantor approvals are recorded.
- Model procurement as a distinct financing product with item details, requested cost, approved cost, repayment plan, status, and policy gating.
- Model emergency financing as a distinct product or product mode with its own eligibility and active-obligation constraints.
- Defer detailed project financing implementation until product semantics are confirmed. It may be a repayable facility, investment partnership, or profit-sharing arrangement, and those require different accounting behavior.
- Add member receipt submission as a staged payment workflow. Uploaded proof, payment categories, amounts, target periods, member notes, and review status should be saved before approval.
- Extend payment allocation to be both category-aware and period-aware. One receipt may target multiple categories and one or more periods, including current month, future months, and back/defaulted months.
- Approved receipt allocations should post through existing contribution, repayment, charge, share, special-savings, and procurement paths where possible, rather than bypassing ledgers.
- Support automatic or admin-reviewed excess allocation to special savings when a member pays more than fixed monthly commitment.
- Keep special savings separate on member profile, statements, reports, and eligibility calculations.
- Add a customer service case workflow tied to tenant, member, issue category, linked records, messages, attachments, status, assignee, resolution, and audit/activity entries.
- Any customer service resolution that changes money should create a controlled correction, reversal, waiver, or adjustment request rather than directly mutating posted financial records.
- Expand activity reporting into a unified audit/activity feed that covers settings changes, approvals, receipt review, support resolutions, role changes, brought-forward entries, financing events, procurement events, share actions, exports, and sensitive corrections.
- Use role permissions as the main guardrail for admin, finance officer, operations officer, support staff, and member access. Member access should be self-scoped.
- Use typed API routers for reads and actions. Keep route files thin, with server-side loaders shaping page data and focused components rendering returned DTOs.
- Keep Prisma schema grouped by business domain and use migrations for new finance/support/audit structures.
- Keep database query helpers tenant-scoped and role-aware. No query should rely on client-supplied tenant/user claims without server context validation.
- Extend overview/dashboard read models so action queues include pending receipt approvals, share requests, guarantor approvals, procurement approvals, support cases, failed imports, setup warnings, and audit exceptions.
- Add report/export capabilities for member list, share positions, payment allocations, financing/procurement status, support cases, and audit/activity records.
- Add operational trust posture outside core finance: legal/terms readiness checklist, Sentry or equivalent monitoring, feature request intake, backup/export messaging, incident-response expectations, and realistic service availability language.
- Treat hosted subdomain and personalized cooperative domain as product packaging/future feature support, not a blocker for the core money workflows.
- Treat WhatsApp notifications, AI integration, and mobile app as future expansion unless required for pilot acceptance. Core workflows should still emit notification events that these channels can consume later.

## Testing Decisions

- Tests should focus on externally observable behavior: what records are created, which actions are blocked, which balances change, which audit/activity rows appear, and which workflow states are visible. Avoid tests that assert private helper structure or component internals.
- The primary testing seam should be the database query/action layer for finance, onboarding, support, permissions, and audit behavior. This is the highest stable seam that can verify tenant scoping, role checks, state transitions, and posted financial effects.
- Domain/package tests should cover deterministic finance math, allocation rules, brought-forward calculations, special savings excess handling, share policy limits, and early settlement logic.
- API/router tests should cover action contracts where request validation, permissions, and query helpers meet. They should verify rejected states and successful mutations from the caller's perspective.
- Dashboard route-loader and page-level tests should cover whether admins see the correct queues, warnings, statuses, and member summaries after backend state changes.
- Member-facing workflow tests should cover staged receipt submission, status visibility, support case creation, share application submission, and self-scoped access.
- Audit/activity tests should verify that sensitive actions create durable records with actor, authorizer where applicable, affected record, action type, timestamp, and before/after metadata for sensitive changes.
- Migration/onboarding tests should verify that brought-forward setup remains distinct from detailed backfill, cannot silently overwrite posted history, and respects finalization/live-operation locks.
- Payment allocation tests should cover current-month, future-month, back/defaulted-month, multi-category receipt splits, duplicate receipt detection, rejection/correction, and admin-adjusted allocations.
- Financing tests should cover policy caps, payback windows, active-loan emergency blocking, active-loan procurement blocking, strict commitment enforcement, flexible commitment mode, guarantor gating, disbursement blocking, early settlement, and overpayment behavior.
- Procurement tests should cover item request, approval, repayment schedule creation, overlap with active financing where policy allows, and default/overdue reporting.
- Support-case tests should cover linked records, attachments metadata, status transitions, assignment, resolution, and money-affecting resolution requiring an auditable adjustment path.
- Reports/export tests should verify tenant scope, role scope, expected columns, and that exported data matches posted/staged status.
- Monitoring and feature-request tooling should be smoke-tested by configuration and safe error capture behavior; do not expose raw stack traces to tenant users.
- Prior art to follow includes existing tests for backfill generator behavior, migration lifecycle guards, tenant finance settings, contribution posting guards, member onboarding approval, financing cycle policy, loan request/disbursement/repayment guards, audit query helpers, and dashboard loader patterns.

## Out of Scope

- Direct bank payment integration or automatic bank reconciliation.
- Legal drafting itself; the product should support legal/terms readiness, but lawyers must produce final legal text.
- Formal uptime SLA commitments beyond documented beta/reliability messaging.
- Full mobile app delivery.
- WhatsApp notification delivery implementation unless later selected for the pilot phase.
- AI assistant integration.
- Complete project financing accounting until the cooperative clarifies whether it is repayable financing, investment partnership, or profit-sharing.
- Share sale, transfer, withdrawal, or secondary market behavior until the cooperative confirms those rules.
- Full custom cooperative domain automation, although the product should preserve a path toward subdomain/custom-domain support.
- Offline sync conflict-resolution redesign for money events.
- Vendor management for procurement unless specifically requested later.
- Sharia review workflow beyond preserving the existing interest-free/Halaal finance guardrails.

## Further Notes

- This PRD synthesizes the first generated client discovery, supplemental operations/support notes, and recording-derived notes from the July 8 demo visit.
- The client-specific examples include one compulsory share unit, NGN 10,000 per share unit, maximum 20 share units, yearly dividend distribution, member receipt upload, admin approval, special savings for excess payment, and support for future/back payments.
- The recording transcript had mixed English/Yoruba audio and noisy repeated sections. Treat transcript-derived details as supporting evidence and confirm ambiguous items before build.
- Open questions to confirm before implementation include: exact charge/product short-code rule, meaning of the 200/500 values mentioned in the prelude recording, whether members can directly request additional shares, whether food purchase commitment is a contribution category or procurement-like obligation, and whether project financing is repayable or profit-sharing.
- Assumed testing seams for this PRD are: deterministic domain/package rules, database query/action helpers, typed API/router contracts, dashboard route loaders, and member/admin workflow surfaces. This follows the current repository architecture and keeps most behavior checks close to durable business state.

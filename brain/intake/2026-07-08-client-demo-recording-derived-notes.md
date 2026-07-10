# Brain Intake: Client Demo Recording-Derived Notes

## Status
Proposed

## Created Date
2026-07-08

## Last Updated
2026-07-08

## Source
- Screen recordings from the July 8 cooperative demo visit in `~/Desktop/Recordings`.
- Extracted audio and generated transcript artifacts in `outputs/client-demo-recordings/`.
- This record is intentionally separate from `brain/intake/2026-07-08-client-demo-visit-feature-discovery.md`.
- Related supplemental operations/support intake: `brain/intake/2026-07-08-client-demo-supplemental-operations-and-support.md`.

## Source Artifacts

| Artifact | Path |
| --- | --- |
| Main audio | `outputs/client-demo-recordings/2026-07-08-demo-main-16k.wav` |
| Main transcript | `outputs/client-demo-recordings/2026-07-08-demo-main-transcript.txt` |
| Main timestamped transcript | `outputs/client-demo-recordings/2026-07-08-demo-main-transcript.srt` |
| Main transcript JSON | `outputs/client-demo-recordings/2026-07-08-demo-main-transcript.json` |
| Prelude audio | `outputs/client-demo-recordings/2026-07-08-demo-prelude-16k.wav` |
| Prelude transcript | `outputs/client-demo-recordings/2026-07-08-demo-prelude-transcript.txt` |
| Prelude timestamped transcript | `outputs/client-demo-recordings/2026-07-08-demo-prelude-transcript.srt` |
| Prelude transcript JSON | `outputs/client-demo-recordings/2026-07-08-demo-prelude-transcript.json` |

## Transcript Quality Notes
- The conversation is mixed English and Yoruba; Whisper auto-detected Yoruba and translated to English.
- The first 30 to 31 minutes of the main recording contain the clearest product information.
- From roughly 31 minutes onward, the transcript contains obvious repetition artifacts, especially repeated "We have a lot of savings" and "You have to pay for the month of May" lines.
- Treat the transcript as supporting evidence, not a perfect verbatim record. Confirm ambiguous items before implementation.

## Recording-Derived Findings

### Share Capital Configuration
- Around `00:01:14-00:02:38` in the main recording, the client confirmed a unit-share structure.
- One share unit is compulsory for every member.
- One share unit costs NGN 10,000.
- The maximum holding is 20 share units.
- The remaining 19 units beyond the compulsory first unit are optional.

Product implication:

The platform needs tenant-configurable share policy fields for unit cost, compulsory minimum units, maximum units, and member requests for additional units. Share capital should remain separate from savings, commitments, and financing balances.

### Business Profit And Dividend Distribution
- Around `00:05:05-00:07:25`, the client confirmed they run business activity with cooperative/share funds and distribute profit as dividend.
- Dividend distribution is yearly.
- Business profit should be recorded with dates as profit comes in.
- The system should use the business/profit history to generate accurate member dividend allocations.

Product implication:

Profit allocation must be tied to actual recorded business results, reviewed seasons, and auditable distribution logic. This should stay aligned with the Halaal operating model and avoid interest-like assumptions.

### Setup, Backfill, And Brought-Forward Start
- Around `00:08:03-00:11:39`, the recording returns to setup/backfill.
- Full cooperative setup is expected once, but existing-member historical entry is heavy.
- The transcript confirms member backfill fields such as monthly amount and historical changes over time.
- The same discussion reinforces the need for a brought-forward option where the cooperative can enter current balances/status without reconstructing every historical row.
- Members should eventually access the system and submit required information for approval.

Product implication:

Onboarding should support both detailed historical backfill and simplified brought-forward opening balances. Brought-forward records must be visibly staged/reviewed and must not silently rewrite posted history.

### Legal, Security, Reliability, And Reports
- Around `00:14:35`, legal-team readiness was discussed as part of client assurance.
- Around `00:15:20-00:16:00`, the transcript captures a discussion about database access, passwords, and the reality that privileged platform/database access needs governance and trust controls.
- Around `00:16:29-00:17:00`, the client asked about system crashing and also raised print/report availability.
- Around `00:17:24-00:17:44`, the proposed answer mentions a system that notifies the team immediately when site errors occur.
- Around `00:18:58-00:19:08`, Vercel hosting and Cloudflare protection were mentioned as part of infrastructure posture.

Product implication:

The platform needs clear legal/terms language, role governance, backup/export/report capability, error monitoring, incident response, and realistic reliability messaging. Avoid promising perfect security or uptime; define operational safeguards.

### Roles, Member Access, Analytics, And Activity Records
- Around `00:20:32-00:21:23`, the recording confirms role-based access, with admins/staff/member roles and member access limited to member profile capabilities.
- Around `00:21:32-00:21:54`, the transcript mentions an analytics/activity system to see changes, who approved them, and when.
- Around `00:22:44`, the discussion indicates uploaded or submitted data can be corrected before approval, but should not be changed after approval without a controlled process.
- Around `00:24:46-00:25:00`, an activity board was described as the permanent record of what happened in the system.

Product implication:

Staff actions, approvals, financial corrections, and support resolutions should produce append-only audit/activity records. Role permissions should decide who can create, approve, reverse, view, or only inspect each action.

### Customer Service And Payment Mistakes
- Around `00:23:36-00:25:56`, the transcript captures a customer service workflow for member issues.
- Payment mistakes from external bank transfers cannot be solved directly by the platform without admin review.
- Members should be able to contact cooperative admins through a customer-service section.
- Admin resolution should be documented and connected to the activity log.

Product implication:

Customer service should be a case/ticket workflow linked to members, receipts, payments, allocations, and admin decisions. Resolutions that affect money should require approval and auditable adjustment/reversal records.

### Loan Settings, Loan Forms, And Early Offset
- Around `00:27:05-00:29:00`, loan settings were described as general tenant rules controlling maximum payback period and maximum amount a member can receive.
- Loan settings apply to all members, while each loan form selects values within the configured maximums.
- Around `00:29:44-00:30:13`, the transcript discusses incoming loan offset/payment and automatically recognizing when a member has fully paid the outstanding balance.

Product implication:

Loan/financing product settings should be separate from individual financing applications. Incoming payments should be able to reduce outstanding balance, detect full settlement, and stop remaining scheduled servicing when the balance is cleared.

### Special Savings From Overpayment
- Around `00:30:40-00:31:02`, the client clarified that excess above fixed monthly savings/commitment should go to special savings.
- Example discussed: if fixed monthly savings is NGN 50,000 and the member sends more, the excess should be allocated to special savings.

Product implication:

Payment allocation should support a fixed expected commitment plus automatic or admin-reviewed excess allocation into special savings. This should remain transparent on member statements.

### Future And Back Payment
- Around `00:40:44` onward, the transcript becomes a low-confidence repeated phrase about paying for the month of May.
- Combined with the direct post-meeting summary, this supports the need for future-month payments and back/defaulted-month payments, but the raw transcript section should not be treated as detailed evidence.

Product implication:

Payment allocation needs period targeting: current month, future month(s), and defaulted/back month(s). Admin review should confirm the intended category and period before posting.

### Emergency, Procurement, And Charge/Product Codes
- In the prelude recording around `00:00:11-00:00:20`, emergency and procurement were discussed as items to add or distinguish.
- Around `00:00:22-00:00:58`, numbers such as 200 and 500 were mentioned, but the meaning is unclear from the transcript.
- Around `00:01:03-00:01:31`, the transcript mentions a charge code or short code, likely a 3-character alphanumeric code.

Product implication:

Emergency financing, procurement financing, and charge/product categories likely need configurable identifiers. The meaning of the 200/500 values and the exact charge-code rule need confirmation before implementation.

## Priority Additions From Recording Review

### Priority A: Must Capture In Implementation Plan
- Share unit policy: unit cost, compulsory units, maximum units, optional extra-share requests.
- Brought-forward onboarding mode for member balances and ongoing cooperative positions.
- Period-aware payment allocation for current, future, and back/defaulted months.
- Customer service cases linked to payments, receipts, members, and activity records.
- Role-based access with immutable audit/activity trail.
- Legal/terms, reports/export, monitoring, and incident-response readiness.

### Priority B: Needs Product Design Detail
- Automatic excess allocation to special savings.
- Early financing settlement/offset behavior.
- Procurement and emergency financing as distinct configurable products.
- Charge/product short-code configuration.
- Yearly business-profit/dividend workflow with dated profit records.

### Priority C: Clarify Before Build
- Exact meaning of the 200/500 values in the prelude.
- Whether charge codes are mandatory, unique per tenant, and exactly 3 alphanumeric characters.
- Whether members can request additional shares directly or only admins can add them.
- Whether future/back payments can cover multiple months and multiple categories in one receipt.
- Whether food purchase commitment is a procurement product, contribution category, or separate savings obligation.

## Product Guardrails
- Keep share capital, savings, special savings, financing principal, procurement obligations, food commitments, and profit allocations separate.
- Do not mutate approved/posting financial records directly; use correction, reversal, or adjustment workflows with authorization.
- Do not expose raw error traces, database details, or infrastructure internals to cooperative members.
- Do not promise legal protection, perfect security, or crash-free operation without documented terms and operational controls.
- Keep transcript-derived assumptions marked as unconfirmed until verified with the client.

## Recommended Next Step
Use this record as evidence input for the implementation plan. The plan should group work into:

1. Core finance policy and brought-forward onboarding.
2. Member portal payments, receipts, future/back allocation, and support cases.
3. Roles, audit/activity, monitoring, reports/export, and legal readiness.
4. Procurement, emergency financing, food commitment, special savings, and advanced product configuration.

# Cooperative mobile access delivery tickets

Decision date: 12 November 2026

Scope: Halaalvest pre-launch source. This replaces the [7 November proposal](2026-11-07-web-managed-mobile-access.md).

The cooperative authorizes mobile access and is Halaalvest’s billing customer. A member requests a term on the web or through their cooperative office. The web workflow records acceptance of the disclosed fee. Approval immediately enables mobile access for that cooperative. The member’s charge is assessed through the cooperative charge ledger when due. Halaalvest bills the cooperative for the terms due that month, including charges members have yet to settle. The app provides sign-in and a short direction to contact the cooperative. It has no access checkout or subscription management.

The initial source rate is ₦1,000 for a rolling 12-month member term. This uses the annual amount proposed in the discussion. Renewal requires a fresh request and approval. The due day is the last calendar day of the approval month in Africa/Lagos. Active staff at an enrolled cooperative can use the mobile workspace without a member charge. The cooperative opts in before it incurs obligations. Disabling enrollment pauses new terms and staff access. Existing approved member terms keep their own end dates. These are launch defaults, so a different rate, staff treatment, or currency requires a new version of the terms before use.

## Phase 1 — Access authority and web requests

### CMA-01 — Persist and enforce cooperative access terms

**Dependencies** — None.

**Changes** — Add a cooperative opt-in and a separate tenant/member-scoped term with the accepted terms version, rate, currency, review state and dates. Resolve access from current membership and the applicable approved term. Keep role, member readiness, session, account recovery and privacy checks. Add server-side audit events for enrollment and review decisions.

**Acceptance**

- The active member’s identity and workspace come from the session. A request cannot target a different member or choose its own rate, start date or term.
- A retry or concurrent request cannot open two pending or overlapping terms. A repeated approval cannot create a second fee or reset the term dates.
- Rejection creates no billable term. Revocation stops access without erasing a fee already authorized. Reinstatement within the same term preserves the original fee and dates.
- Mobile and server agree after workspace switch, suspension, revocation, expiry and account deletion. Member access is cooperative-specific. A different role does not silently inherit the member’s access.

### CMA-02 — Give members and staff the web workflow

**Dependencies** — CMA-01 API contract.

**Changes** — Add member request and status pages and a cooperative admin queue. Show the rate and due rule before the member confirms. Show the cooperative its billing obligation before enabling enrollment. Reuse cooperative-number account provisioning and recovery. A member who needs help can use the cooperative office for account setup and assisted submission through the member’s own account.

**Acceptance**

- A member can find the request, see the applicable term and charge, explicitly accept it, and see whether the request is pending, approved, declined, revoked or expired.
- An authorized admin can find pending requests, see who requested them, approve or decline, and revoke or reinstate with a recorded reason. Staff without the relevant role cannot change access.
- An approved member can sign in with their existing cooperative number and password before a charge is posted. Confirmation shows the member’s name and access dates without labelling the fee as paid.

## Phase 2 — Member charges and cooperative invoices

### CMA-03 — Assess the ordinary member charge at month-end

**Dependencies** — CMA-01 term and due date.

**Changes** — Use a distinct mobile access charge definition and the existing separate-payment charge workflow. Link the assessment to the approved term. Preserve separation from member savings, share capital, levies and financing repayments. Record any blocked or deferred assessments for finance follow-up.

**Acceptance**

- A term approved on 12 November becomes due on 30 November in Lagos. It grants access from approval. The system creates a single charge dated for the due period.
- Charge generation is safe to rerun and is independent of the member’s balance and payment status. It does not debit savings or post a fictional payment.
- Paid, waived and reversed assessments keep their normal cooperative charge records. Halaalvest’s invoice remains the cooperative’s responsibility, with any vendor-side adjustment treated as a separate decision.

### CMA-04 — Close and settle the cooperative invoice

**Dependencies** — CMA-01 due terms. CMA-03 adds assessment references independently.

**Changes** — Run month close after Lagos midnight, based on the period just ended. Snapshot billable terms into one invoice per cooperative and month. Surface the invoice and charge references to authorized web users. Record bank settlement against the invoice after platform verification and keep the reference and audit evidence. Provide a web route for platform receivables and settlement.

**Acceptance**

- A month with 40 new annual terms and 10 renewals at ₦1,000 has a ₦50,000 invoice before any separately approved tax treatment. An existing term with no new fee due contributes nothing. A zero-item month creates no invoice.
- A late or uncollected member payment does not change the invoice. A remittance is recorded once against the right cooperative invoice. Ordinary cooperative staff cannot mark Halaalvest’s receivable paid.
- Late retries preserve the original period and amounts and never regenerate an issued invoice. Shared-database QA cooperatives are excluded from billing. Settlement evidence and member-side charge status are separately traceable. Vendor credits, refunds and partial cooperative remittances are handled as explicit operator exceptions until supported by the agreed billing terms.

## Phase 3 — Native cutover and published material

### CMA-05 — Remove mobile checkout and use the cooperative decision

**Dependencies** — CMA-01 native snapshot. Can proceed alongside CMA-02 through CMA-04.

**Changes** — Keep cooperative-number sign-in and existing routing. Replace the native purchase gate with the cooperative snapshot. Remove IAP packages and plugin configuration, purchase/restore controls, billing navigation and obsolete store-offer QA entry points. Update the release source check to require the cooperative authority and billing files.

**Acceptance**

- A signed-in member without access sees “Contact your cooperative to request mobile access.” A pending member can refresh. An approved member enters the role shell immediately on a successful check.
- A tenant/identity switch never reuses another workspace’s access. Revocation and expiry block protected routes and APIs. Sign-out, recovery, privacy and support remain reachable.
- The native source has no app-access offers, purchase links, store checkout, renewal settings or IAP dependency. Normal statements keep accurate cooperative financial records.

### CMA-06 — Align marketing, policies and store review

**Dependencies** — CMA-01 and CMA-04 commercial behavior.

**Changes** — Update the homepage variants and pricing page, billing policy, terms, privacy and account-deletion copy. Keep policy changes as drafts until the normal publication process. Prepare review notes and demo account instructions for Apple and Google.

**Review notes draft**

> Halaalvest is cooperative management software. Members use a cooperative-issued account. Each cooperative authorizes its own members to use the mobile app. Access starts on approval and remains independent of collection. The cooperative may post its disclosed charge to the member account through its ordinary charge process. Halaalvest invoices and receives payment from the cooperative. The mobile app contains no purchasing or external purchase links. The reviewer account supplied with this submission has already been authorized by its demo cooperative.

Google describes sign-in access to a paid service under its consumption-only guidance. Apple’s enterprise exception names employees and students, and ordinary cooperative members are not explicitly covered. The commercial terms and native build should be reviewed together before iOS distribution. [Google Play payments guidance](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en) · [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/#payments)

## Phase 4 — Release and operator handoff

### CMA-07 — Apply schema and prepare a release candidate

**Dependencies** — CMA-01 through CMA-06.

**Changes** — Apply repository database commands to the local target and commit generated migration history. Before a future hosted release, apply the matching schema before enabling the new API/jobs, deploy the scheduled task, regenerate native resources, and enroll a synthetic cooperative and reviewer account through the web workflow.

**Acceptance**

- The release owner can reproduce enrollment, request, approval and access with one demo cooperative. Access remains active with an outstanding charge. A month close reconciles terms, member charges and invoice total, including safe repeat execution.
- Independently check first access, term expiry, revocation, cross-tenant denial, overdue cooperative invoice, month boundaries and permissions in a later QA pass before relying on the behavior in production. Tests and typechecks are explicitly skipped for the implementation turn at the owner’s request.
- Public legal approval, release builds, App Review/Play review and rollout are separate release work. This plan grants no deployment or store-console authority.

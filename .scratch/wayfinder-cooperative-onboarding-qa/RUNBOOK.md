# Minna Trust Website QA Runbook

This is the ordered browser script for the website-first QA pass. Stop and log a bug in `QA-REPORT.md` whenever a money-impacting step fails.

## 0. Preflight

1. Start local app: `bun run dev --local --filter dashboard marketing`.
2. Open `http://halaalvest.localhost` and the target dashboard host.
3. Confirm the dashboard host is `http://minna-trust-civil-servants-multipurpose.halaalvest-dash.localhost`.
4. Record whether this run uses the existing tenant or a fresh tenant.
5. Confirm the tenant name is Minna Trust Civil Servants Multipurpose Cooperative.

Expected result: local dashboard loads without production indicators, and the current user is a tenant admin or equivalent workspace admin.

## 1. Cooperative Setup

1. Open `/getting-started`.
2. Confirm setup mode uses brought-forward opening positions.
3. Complete Operation Profile:
   - Commitments: mixed automatic/manual collection.
   - Payment receipts: members can submit receipts.
   - Procurement: member self-service, max active unpaid obligation per member = 1.
   - Foodstuff Purchase: member self-service, max active unpaid obligation per member = 1, open cycle required.
4. Open finance/share setup and configure unit-based shares:
   - Share unit amount: NGN 10,000.
   - Compulsory units: 1.
   - Maximum units: 19.
5. Open loan/finance policy settings:
   - Ensure normal financing can support 24 months.
   - Confirm whether strict commitment during active financing is enabled or disabled.
   - If reduced commitments during active financing are not allowed by policy, treat the admin member's NGN 20,000 commitment as brought-forward historical evidence, not a new live reduction.

Expected result: saved settings match `CANONICAL-DATA.md`; disabled services do not appear as member self-service links.

Stop condition: if `/members`, `/payment-receipts`, `/loans`, `/procurement`, `/food-purchase`, `/notifications`, or `/reports/audit` redirect back to `/getting-started`, the tenant is still migration-gated and the setup gates must be completed before member/service QA can continue.

## 2. Admin Member Brought-Forward Position

1. Open `/members` and find the current admin member.
2. Open the member backfill route in brought-forward mode.
3. Create opening position:
   - Opening date: 2026-07-01.
   - Commitment savings balance: 830000.
   - Special savings balance: 200000.
   - Share units: 1.
   - Share capital balance: 10000.
   - Active financing opened at: 2026-01-01.
   - Active financing outstanding: 1266666.67.
   - Procurement outstanding: 500000.
   - Foodstuff Purchase outstanding: 25000.
   - Notes: `QA brought-forward opening position from July 2026 scenario.`
4. Review and approve the opening position.
5. Apply the opening position.
6. Verify evidence on the member page, relevant finance pages, and activity report.

Expected result: member balances show NGN 830,000 commitment savings, NGN 200,000 special savings, one share unit/NGN 10,000 share capital, active brought-forward loan outstanding about NGN 1,266,666.67, active procurement outstanding NGN 500,000, and Foodstuff Purchase outstanding NGN 25,000.

## 3. Second Member Onboarding

1. Create or invite Aisha Bello using `CANONICAL-DATA.md`.
2. Preferred path: create a staff-issued signup link from `/member-signup-links`, use it in the member signup route, verify/approve from `/membership-approvals`, and set password.
3. Fallback path: create Aisha from `/members`, then use the available local password setup/reset/onboarding path.
4. Apply Aisha's opening position:
   - Opening date: 2026-07-01.
   - Commitment savings: 150000.
   - Special savings: 25000.
   - Share units: 2.
   - Share capital: 20000.
   - Active financing/procurement/Foodstuff outstanding: 0.
5. Log in as Aisha.
6. Verify member dashboard at `/` shows only Aisha's profile, balances, obligations, shares, quick links, and recent activity.

Expected result: Aisha can authenticate as a member and cannot see tenant-wide staff data.

## 4. Member Self-Service Submissions

1. As Aisha, open `/payment-receipts` and submit `QA-AISHA-JULY-001`.
2. Open `/project-financing` and submit the NGN 200,000, 6-month financing request. If a separate member loan request route is later added, retest that route explicitly.
3. Open `/procurement` and submit MacBook Pro M1, NGN 1,500,000, 2 months.
4. Open `/food-purchase`. If no July 2026 open cycle exists, sign back in as admin and create the July 2026 cycle, then return as Aisha and submit the NGN 60,000 Foodstuff Purchase request over 2 months.

Expected result: each submission is visible to Aisha with submitted or under-review status and is visible to staff review queues.

## 5. Admin Reviews And Notifications

1. As admin/finance, open `/payment-receipts` and approve Aisha's receipt.
2. Open `/project-financing`, review Aisha's financing request, and approve if policy/cycle requirements are met. If a separate loan request flow exists in the target build, review that route separately.
3. Open `/procurement`, approve MacBook Pro M1 at NGN 1,500,000 over 2 months, with note: `Approved. Please step into the office for final activities.`
4. Record procurement purchase evidence if the workflow requires activation before repayment schedule creation.
5. Open `/food-purchase`, approve Aisha's application at NGN 60,000 over 2 months.
6. Open `/notifications` and verify receipt/financing/procurement/Foodstuff status delivery evidence where generated.

Expected result: statuses transition correctly; procurement approval produces member-facing notification evidence with the approved office-step note or equivalent review note.

## 6. Activity And Audit

1. Open `/reports/audit`.
2. Search/filter for setup, opening balance, member onboarding, receipt, financing, procurement, and Foodstuff events.
3. Confirm each event shows:
   - Actor or system attribution.
   - Entity type/id.
   - Timestamp.
   - Useful metadata summary.
4. Export audit CSV only if the page does not show enough row detail.

Expected result: the activity report tells who did what, when, and against which entity.

## 7. Stop/Fix/Retry Protocol

- Stop immediately if tenant identity, role, or local environment is ambiguous.
- Stop before applying opening balances if any amount, date, or active obligation field is missing.
- Stop after the first money-posting failure and record exact reproduction details.
- Retry only after fixing the bug or deliberately resetting the local tenant.
- Do not continue later dependent steps after a failed setup, brought-forward apply, receipt approval, procurement approval, Foodstuff approval, notification, or audit step.

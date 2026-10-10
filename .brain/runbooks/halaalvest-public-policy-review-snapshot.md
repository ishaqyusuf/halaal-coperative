# HalaalVest public policy review snapshot

Source revision: `2026-10-07-draft-6`. Generated from `packages/domain/src/modules/public-policies.ts`.

This is a review draft, not a published policy, owner/legal approval, approval hash, or evidence of a working deletion process. Every source-content SHA-256 below covers the exact JSON policy object, including deletion interactive and email copy. It deliberately excludes publication dates and approval metadata. Compare this packet with source before sign-off; run `bun scripts/public-policy-review-packet.ts --check` to detect drift.

Publication requires a separate authorised review reference, approval and effective dates, an `approvedSnapshotHash` for the final source and metadata, deployment, and live route verification. Do not turn this review fingerprint into an approval hash.

| Page | Source status | Source-content SHA-256 | Decision to resolve before approval |
| --- | --- | --- | --- |
| `/terms` | draft `2026-10-07-draft-6` | `73a3a65abd355531c73e00f7ede51190be26f641ddd4e2926f57c79a42439819` | Approve eligibility and minimum age, content rights, governing law, disputes, service commitments, suspension, termination, liability and export terms. |
| `/privacy` | draft `2026-10-07-draft-6` | `485b7a672dac02b17d15a5e6ff71ef2f5a7c259cbb7041439b5cd308be3ac895` | Confirm controller/processor roles, legal bases, monitored contact, enabled processors and locations, transfers, retention by category, backup expiry and request/complaint process for each launch country. |
| `/support` | draft `2026-10-07-draft-6` | `40aa6c7849548639860ed663c9683eeff584196bcde86acac4ddb036259d13a1` | Confirm the published contact is monitored, name the escalation owner and response targets, and verify account-recovery and cooperative handoff steps. |
| `/delete-account` | draft `2026-10-07-draft-6` | `55b91d02b17638aa0773185e254f5e29c1d9ac543c8c6c061d011188fc9fbc23` | Approve identity and scope checks, administration handover, eligible-record erasure, restricted retention, processor and backup outcomes, processing timeline and completion contact. Current access revocation is not complete erasure. |
| `/billing-policy` | draft `2026-10-07-draft-6` | `7300ad9d0aa27acfa433262bf74abe5b89d16dbcb667a1fa69cfee58de77a969` | Verify individual Apple/Google six-month and annual products at the owner-selected US$0.99/US$1.99 USD base prices and store-returned localized prices, storefront availability and tax; approve renewal, cancellation, refunds, failed payment, grace and account-closure handling for every mobile role. |
| `/cooperative-disclosures` | draft `2026-10-07-draft-6` | `6aaf1013acab9759b331c865c373e9a01c4c3b84f0cfeffcefccfc4949920091` | Confirm operator and cooperative roles, funds flow, complete financing costs and guarantor duties, Halaal review claims, launch countries and any required financial-service authorisations. |

## /terms — Platform terms

HalaalVest provides software for cooperative administration. These platform terms are separate from your cooperative’s membership, savings, share, financing and guarantor agreements.

### Who provides the service

HalaalVest is operated by ZEROES AND ONE TECH HUB NIG LIMITED. Company registration number: RC 9264386. The 1 February 2026 CAC status extract listed 10, Old Jebba Road, Ilorin, Kwara State, Nigeria as the registered address; confirm the current address before these terms take effect. Governing law and dispute provisions also require review.

### Your account and authority

Use only accounts you are authorised to access. Cooperative administrators are responsible for assigning appropriate staff permissions, keeping membership records accurate and removing access when responsibilities change. Keep passwords and access codes secure and report suspected misuse.

### Cooperative decisions and member funds

The cooperative sets its membership rules, approves requests and maintains its financial records. Software eligibility estimates are not financing approval or a promise of available funds. Ask your cooperative for its identity, applicable agreements, charges, withdrawal rules and complaint contact.

### Acceptable use

Do not access another cooperative’s records, misrepresent transactions, upload unlawful material, interfere with service security or use the service for unauthorised financial activity. Access restrictions and account closure must preserve other members’ rights and legitimate financial records.

### Documents and content rights — review before launch

Cooperatives and authorised users may provide member documents, receipt evidence and support content. The final terms must identify who may submit this material, what rights or authority they must have, and the limited permission HalaalVest needs to store, display and process it for the service. Complaint, correction, removal and retention steps also require owner and legal approval. This draft does not establish that permission or settle ownership of the material.

### Subscriptions and closure

The web dashboard does not require a personal mobile app subscription. Each person who chooses the mobile app, including a member, staff member or administrator, buys their own Apple App Store or Google Play subscription for app access. The app fee is separate from cooperative contributions, financing repayments, share capital and levies. Store checkout must show the final price, billing period and renewal terms before purchase. Manage or cancel the subscription through the store account used to pay. Deleting a HalaalVest account does not cancel store renewal or settle cooperative obligations. Final refund, suspension and dispute terms require owner and legal review before sales open.

### Review before launch

Service commitments, liability provisions, suspension notice, export arrangements, eligibility and age requirements, termination effects and dispute terms require owner and legal review. This draft does not create an uptime guarantee or waive any statutory right.

## /privacy — Privacy notice

This notice describes HalaalVest’s cooperative software and the personal data involved in providing it. Your cooperative also has responsibilities for the member records it directs the service to process.

### Responsibility and contact

The platform operator is ZEROES AND ONE TECH HUB NIG LIMITED. Company registration number: RC 9264386. The 1 February 2026 CAC status extract listed 10, Old Jebba Road, Ilorin, Kwara State, Nigeria as the registered address; confirm the current address before this notice takes effect. The monitored privacy contact and allocation of controller and processor responsibilities with cooperatives are awaiting confirmation. The existing product contact is hello@halaalvest.com; monitoring and escalation arrangements must be verified before launch.

### Information used by the service

Depending on your role and enabled features, records include name, email, phone, cooperative access code, membership and employment details, account credentials, contributions, shares, financing and guarantor records, repayments, supporting documents, support messages, permissions and audit history. Sessions, device registration and push tokens support account security and notifications. For mobile app access, the service records the store provider, product, verified purchase identifiers or digests, subscription status and period, and provider-event history linked to the individual account.

### Why information is used

The service uses information to authenticate users, restrict access to the correct cooperative, maintain requested financial records, administer requests and approvals, deliver notifications, handle support and investigate operational problems. The legal bases for each purpose, and any additional consent required for optional processing, must be confirmed by the responsible operator and cooperative.

### Providers and diagnostics

Hosting, database, email, notification and any enabled payment or storage providers process data needed for their functions. Apple and Google process individual app subscription payments and provide purchase status for server verification. Enabled Sentry diagnostics are filtered to remove member identity and financial content. Logly receives bounded usage events; minimised analytics do not mean the service collects no data. The production processor list, locations and international-transfer safeguards require operator review.

### Device permissions

Push notifications require device permission. Device authentication can protect local app access without sending biometric templates to HalaalVest. You can change device permissions in your operating-system settings; disabling a permission can affect the associated feature.

### Retention and deletion

Deletion must distinguish login access, cooperative membership and shared financial records. Financial, audit or dispute records may require restricted retention for a documented obligation; that does not justify retaining unrelated personal information indefinitely. Category-specific periods, backup expiry and processor deletion procedures are not yet approved, and no deletion deadline is promised by this draft.

### Your requests

You can request access, correction or deletion and raise a privacy concern through the account-deletion and support pages. Identity and authority must be verified before records are disclosed or changed. The operator must confirm applicable response periods and the appropriate data-protection complaint authority for each launch country.

## /support — HalaalVest support

Get help with account access, software problems, privacy requests and billing questions. Contact your cooperative for decisions about contributions, membership, withdrawals, financing and guarantor obligations.

### Cooperative support

When available, open Support in your cooperative workspace to create a tracked case and follow staff replies. Support cases document an issue; they do not themselves reverse a payment or change financial records.

### Cannot sign in

Email the product contact below with your cooperative name, a safe description of the issue and any error reference shown. Never send a password or one-time code. Account recovery requires identity verification.

### Privacy and account deletion

Use the account-deletion page for a deletion request. For access, correction or a privacy concern, identify the request in your email subject. Platform and cooperative responsibilities must be clarified during review.

### Service expectations

The existing contact is hello@halaalvest.com. The owner must verify mailbox monitoring, response targets and escalation responsibility before launch. No round-the-clock support or response-time guarantee is stated.

## /delete-account — Delete your HalaalVest account

Request deletion of your HalaalVest login and associated personal data. This is different from leaving a cooperative, settling financing or closing a cooperative’s entire workspace.

### Start a request

When online verification is available, use the form on this page to request an email verification link if you cannot sign in. After verifying control of the account email, review and submit the request. If the form is unavailable or you do not know the workspace address, use the email contact option below. Never send a password, one-time code, bank details or identity-document attachment.

### Verification and scope

Support must verify control of the account and clarify which login, memberships and personal data the request covers. An administrator closing a whole workspace must establish authority and resolve ownership handover. One person’s request must not erase other members’ records.

### What completion involves

After verification and review, the responsible operator must revoke account access and device sessions, stop optional communications, erase or anonymise eligible information and coordinate processor deletion. A disabled login or a resolved support ticket alone does not prove deletion.

### Records that may remain

The operator must explain any retained financial, audit, security or dispute records, the applicable reason, access restrictions and retention period. The completion response must distinguish erased information, retained records and outstanding processor work. Retention periods and operational response times still require owner approval.

### Current readiness

This request channel and the end-to-end processing procedure require operational verification before store submission. Do not interpret this draft page as a completed account-erasure capability.

### Request, verification and email copy

The JSON below is exact source copy used by the deletion form, verification page and verification email; review all success, failure and unavailable states.

```json
{
  "email": {
    "eventLabel": "Account deletion request",
    "subject": "Verify your HalaalVest account deletion request",
    "previewText": "Confirm that you requested account deletion.",
    "bodyText": "Use this link within 30 minutes to verify control of your email and submit an account deletion request. The request will still require identity and scope review. If you did not request this, ignore this message.",
    "actionLabel": "Review deletion request"
  },
  "request": {
    "title": "Start an account deletion request",
    "instructions": "Enter your account email and your cooperative’s workspace short address or verified website domain. We will email a verification link if the account matches. If you only know the cooperative’s legal name, use the email contact option below.",
    "emailLabel": "Account email",
    "workspaceLabel": "Workspace short address or website domain",
    "workspacePlaceholder": "e.g. amanah or cooperative.ng",
    "submitLabel": "Email verification link",
    "sendingLabel": "Sending link…",
    "success": "If your details identify an account, check your inbox for a verification link. If none arrives, use the contact option below.",
    "failure": "The request could not be started. Please try again later or use the contact option below."
  },
  "verification": {
    "checking": "Checking verification link…",
    "missing": "This verification link is incomplete. Request a new link from the account deletion page.",
    "introduction": "This email link verifies control of the account email. It does not yet complete identity review or erase account data.",
    "details": "We will review cooperative administration handover, financial record retention and processor deletion separately. Requesting deletion does not cancel an Apple or Google subscription.",
    "confirmation": "I request deletion of this account and associated eligible personal data, and understand that shared cooperative records may need to be retained.",
    "submitLabel": "Submit deletion request",
    "submittingLabel": "Submitting…",
    "failure": "This link could not be verified or was already used. Request a new link from the account deletion page.",
    "successTitle": "Request submitted",
    "statusLabel": "Status:",
    "referenceLabel": "Your request reference is",
    "successCaveat": "An operator must still verify the full account scope and retention obligations. Account access is not deleted yet."
  },
  "unavailable": "Online deletion verification is not available on this deployment yet. Use the email contact option below to raise a request. The operator must confirm that this contact is monitored before public launch.",
  "contactLabel": "Prepare account deletion email"
}
```

## /billing-policy — Software billing policy

The web dashboard does not require a personal app subscription. Each mobile user buys their own Apple or Google app-access subscription; that fee is separate from cooperative money and member obligations.

### Price and renewal

The planned base prices are US$0.99 for six months or US$1.99 for one year. Prices in other storefronts are localized by Apple or Google and may differ due to available price tiers, currency conversion and taxes. Both periods provide the same mobile app features, and each member, staff member or administrator pays through their own store account. These are owner-selected prices, subject to actual Apple and Google product configuration and storefront verification before sales open. Store checkout must show the final local price, applicable taxes, billing period and automatic-renewal terms. No trial is planned for launch.

### Cancellation and refunds

Manage or cancel the subscription in the Apple or Google store account used to pay to stop future renewals. Uninstalling the app or deleting a HalaalVest account does not cancel the store subscription. The operator must approve the effects of cancellation, refund eligibility, failed payment, grace periods and account closure before sales open. This draft does not promise a refund entitlement or deny statutory rights.

### Mobile access

Mobile app access requires an individual subscription for every user role. Store product configuration, server verification and release validation must be completed before purchases are enabled. Cooperative contributions, share payments and financing repayments are not app subscription purchases.

## /cooperative-disclosures — Cooperative and financing disclosures

Understand your cooperative’s rules before committing funds or accepting financing. HalaalVest supplies software; each cooperative must identify the party responsible for its member services.

### Membership and savings

Obtain the cooperative’s membership rules, contribution commitments, levies, withdrawal and exit process, share ownership terms, voting rights and complaints procedure. Savings, share capital and cooperative profits are different records and may have different withdrawal conditions.

### Financing costs and obligations

Before accepting financing, review the principal, all charges, total payable, tenure, repayment amounts and dates, late-payment handling, early settlement, guarantor obligations and any payroll authorisation. Interest-free does not mean fee-free or zero total cost. Eligibility is subject to cooperative approval and available funds.

### Halaal methodology and investment risk

The software model avoids interest-bearing financing logic and keeps charges and profits explicit. The product name is not proof of independent Shariah certification. Ask the cooperative who reviews its products and agreements. Profits and returns are not guaranteed, and deposit insurance or regulatory approval must not be assumed.

### Regulatory scope

The operator must confirm launch markets and obtain a classification of the actual financing facilitation and funds-handling model. Store financial-service declarations and any required authorisations must match the operating model, including all applicable costs.

## In-app deletion request notice

Request notice version: `notice-sha256-9c5f5b198acdf5fa87c24ea8c9f729b55472807a628119d128d96d3744a39aac`. This is a content fingerprint of the in-app notice and complete public deletion-policy source, not an approval or publication hash.

Request deletion of your HalaalVest account and associated personal data across your cooperatives.

- We verify your identity and review any cooperative administration handover before revoking access.
- Records that must be retained for legal or cooperative financial obligations are reviewed separately; requesting deletion does not settle those obligations.
- Apple or Google subscriptions must also be cancelled through the store to stop future renewal charges.
- You can cancel this request in the app before processing begins. Access revocation alone does not mean erasure is complete.

export const publicDeletionFlowCopy = {
  email: {
    eventLabel: "Account deletion request",
    subject: "Verify your HalaalVest account deletion request",
    previewText: "Confirm that you requested account deletion.",
    bodyText:
      "Use this link within 30 minutes to verify control of your email and submit an account deletion request. The request will still require identity and scope review. If you did not request this, ignore this message.",
    actionLabel: "Review deletion request",
  },
  request: {
    title: "Start an account deletion request",
    instructions:
      "Enter your account email and your cooperative’s workspace short address or verified website domain. We will email a verification link if the account matches. If you only know the cooperative’s legal name, use the email contact option below.",
    emailLabel: "Account email",
    workspaceLabel: "Workspace short address or website domain",
    workspacePlaceholder: "e.g. amanah or cooperative.ng",
    submitLabel: "Email verification link",
    sendingLabel: "Sending link…",
    success:
      "If your details identify an account, check your inbox for a verification link. If none arrives, use the contact option below.",
    failure:
      "The request could not be started. Please try again later or use the contact option below.",
  },
  verification: {
    checking: "Checking verification link…",
    missing:
      "This verification link is incomplete. Request a new link from the account deletion page.",
    introduction:
      "This email link verifies control of the account email. It does not yet complete identity review or erase account data.",
    details:
      "We will review cooperative administration handover, financial record retention and processor deletion separately. Requesting deletion does not cancel an Apple or Google subscription.",
    confirmation:
      "I request deletion of this account and associated eligible personal data, and understand that shared cooperative records may need to be retained.",
    submitLabel: "Submit deletion request",
    submittingLabel: "Submitting…",
    failure:
      "This link could not be verified or was already used. Request a new link from the account deletion page.",
    successTitle: "Request submitted",
    statusLabel: "Status:",
    referenceLabel: "Your request reference is",
    successCaveat:
      "An operator must still verify the full account scope and retention obligations. Account access is not deleted yet.",
  },
  unavailable:
    "Online deletion verification is not available on this deployment yet. Use the email contact option below to raise a request. The operator must confirm that this contact is monitored before public launch.",
  contactLabel: "Prepare account deletion email",
}

export type PublicPolicy = {
  title: string
  introduction: string
  sections: { title: string; body: string }[]
  interactiveCopy?: typeof publicDeletionFlowCopy
}

// Review drafts are deliberately not contract-acceptance versions.
export const publicPolicyRevision = "2026-10-07-draft-6"
export const publicPolicyStatus = "draft" as const

export const publicPolicies = {
  terms: {
    title: "Platform terms",
    introduction:
      "HalaalVest provides software for cooperative administration. These platform terms are separate from your cooperative’s membership, savings, share, financing and guarantor agreements.",
    sections: [
      {
        title: "Who provides the service",
        body: "HalaalVest is operated by ZEROES AND ONE TECH HUB NIG LIMITED. Company registration number: RC 9264386. The 1 February 2026 CAC status extract listed 10, Old Jebba Road, Ilorin, Kwara State, Nigeria as the registered address; confirm the current address before these terms take effect. Governing law and dispute provisions also require review.",
      },
      {
        title: "Your account and authority",
        body: "Use only accounts you are authorised to access. Cooperative administrators are responsible for assigning appropriate staff permissions, keeping membership records accurate and removing access when responsibilities change. Keep passwords and access codes secure and report suspected misuse.",
      },
      {
        title: "Cooperative decisions and member funds",
        body: "The cooperative sets its membership rules, approves requests and maintains its financial records. Software eligibility estimates are not financing approval or a promise of available funds. Ask your cooperative for its identity, applicable agreements, charges, withdrawal rules and complaint contact.",
      },
      {
        title: "Acceptable use",
        body: "Do not access another cooperative’s records, misrepresent transactions, upload unlawful material, interfere with service security or use the service for unauthorised financial activity. Access restrictions and account closure must preserve other members’ rights and legitimate financial records.",
      },
      {
        title: "Documents and content rights — review before launch",
        body: "Cooperatives and authorised users may provide member documents, receipt evidence and support content. The final terms must identify who may submit this material, what rights or authority they must have, and the limited permission HalaalVest needs to store, display and process it for the service. Complaint, correction, removal and retention steps also require owner and legal approval. This draft does not establish that permission or settle ownership of the material.",
      },
      {
        title: "Subscriptions and closure",
        body: "The web dashboard does not require a personal mobile app subscription. Each person who chooses the mobile app, including a member, staff member or administrator, buys their own Apple App Store or Google Play subscription for app access. The app fee is separate from cooperative contributions, financing repayments, share capital and levies. Store checkout must show the final price, billing period and renewal terms before purchase. Manage or cancel the subscription through the store account used to pay. Deleting a HalaalVest account does not cancel store renewal or settle cooperative obligations. Final refund, suspension and dispute terms require owner and legal review before sales open.",
      },
      {
        title: "Review before launch",
        body: "Service commitments, liability provisions, suspension notice, export arrangements, eligibility and age requirements, termination effects and dispute terms require owner and legal review. This draft does not create an uptime guarantee or waive any statutory right.",
      },
    ],
  },
  privacy: {
    title: "Privacy notice",
    introduction:
      "This notice describes HalaalVest’s cooperative software and the personal data involved in providing it. Your cooperative also has responsibilities for the member records it directs the service to process.",
    sections: [
      {
        title: "Responsibility and contact",
        body: "The platform operator is ZEROES AND ONE TECH HUB NIG LIMITED. Company registration number: RC 9264386. The 1 February 2026 CAC status extract listed 10, Old Jebba Road, Ilorin, Kwara State, Nigeria as the registered address; confirm the current address before this notice takes effect. The monitored privacy contact and allocation of controller and processor responsibilities with cooperatives are awaiting confirmation. The existing product contact is hello@halaalvest.com; monitoring and escalation arrangements must be verified before launch.",
      },
      {
        title: "Information used by the service",
        body: "Depending on your role and enabled features, records include name, email, phone, cooperative access code, membership and employment details, account credentials, contributions, shares, financing and guarantor records, repayments, supporting documents, support messages, permissions and audit history. Sessions, device registration and push tokens support account security and notifications. For mobile app access, the service records the store provider, product, verified purchase identifiers or digests, subscription status and period, and provider-event history linked to the individual account.",
      },
      {
        title: "Why information is used",
        body: "The service uses information to authenticate users, restrict access to the correct cooperative, maintain requested financial records, administer requests and approvals, deliver notifications, handle support and investigate operational problems. The legal bases for each purpose, and any additional consent required for optional processing, must be confirmed by the responsible operator and cooperative.",
      },
      {
        title: "Providers and diagnostics",
        body: "Hosting, database, email, notification and any enabled payment or storage providers process data needed for their functions. Apple and Google process individual app subscription payments and provide purchase status for server verification. Enabled Sentry diagnostics are filtered to remove member identity and financial content. Logly receives bounded usage events; minimised analytics do not mean the service collects no data. The production processor list, locations and international-transfer safeguards require operator review.",
      },
      {
        title: "Device permissions",
        body: "Push notifications require device permission. Device authentication can protect local app access without sending biometric templates to HalaalVest. You can change device permissions in your operating-system settings; disabling a permission can affect the associated feature.",
      },
      {
        title: "Retention and deletion",
        body: "Deletion must distinguish login access, cooperative membership and shared financial records. Financial, audit or dispute records may require restricted retention for a documented obligation; that does not justify retaining unrelated personal information indefinitely. Category-specific periods, backup expiry and processor deletion procedures are not yet approved, and no deletion deadline is promised by this draft.",
      },
      {
        title: "Your requests",
        body: "You can request access, correction or deletion and raise a privacy concern through the account-deletion and support pages. Identity and authority must be verified before records are disclosed or changed. The operator must confirm applicable response periods and the appropriate data-protection complaint authority for each launch country.",
      },
    ],
  },
  "delete-account": {
    title: "Delete your HalaalVest account",
    interactiveCopy: publicDeletionFlowCopy,
    introduction:
      "Request deletion of your HalaalVest login and associated personal data. This is different from leaving a cooperative, settling financing or closing a cooperative’s entire workspace.",
    sections: [
      {
        title: "Start a request",
        body: "When online verification is available, use the form on this page to request an email verification link if you cannot sign in. After verifying control of the account email, review and submit the request. If the form is unavailable or you do not know the workspace address, use the email contact option below. Never send a password, one-time code, bank details or identity-document attachment.",
      },
      {
        title: "Verification and scope",
        body: "Support must verify control of the account and clarify which login, memberships and personal data the request covers. An administrator closing a whole workspace must establish authority and resolve ownership handover. One person’s request must not erase other members’ records.",
      },
      {
        title: "What completion involves",
        body: "After verification and review, the responsible operator must revoke account access and device sessions, stop optional communications, erase or anonymise eligible information and coordinate processor deletion. A disabled login or a resolved support ticket alone does not prove deletion.",
      },
      {
        title: "Records that may remain",
        body: "The operator must explain any retained financial, audit, security or dispute records, the applicable reason, access restrictions and retention period. The completion response must distinguish erased information, retained records and outstanding processor work. Retention periods and operational response times still require owner approval.",
      },
      {
        title: "Current readiness",
        body: "This request channel and the end-to-end processing procedure require operational verification before store submission. Do not interpret this draft page as a completed account-erasure capability.",
      },
    ],
  },
  support: {
    title: "HalaalVest support",
    introduction:
      "Get help with account access, software problems, privacy requests and billing questions. Contact your cooperative for decisions about contributions, membership, withdrawals, financing and guarantor obligations.",
    sections: [
      {
        title: "Cooperative support",
        body: "When available, open Support in your cooperative workspace to create a tracked case and follow staff replies. Support cases document an issue; they do not themselves reverse a payment or change financial records.",
      },
      {
        title: "Cannot sign in",
        body: "Email the product contact below with your cooperative name, a safe description of the issue and any error reference shown. Never send a password or one-time code. Account recovery requires identity verification.",
      },
      {
        title: "Privacy and account deletion",
        body: "Use the account-deletion page for a deletion request. For access, correction or a privacy concern, identify the request in your email subject. Platform and cooperative responsibilities must be clarified during review.",
      },
      {
        title: "Service expectations",
        body: "The existing contact is hello@halaalvest.com. The owner must verify mailbox monitoring, response targets and escalation responsibility before launch. No round-the-clock support or response-time guarantee is stated.",
      },
    ],
  },
  "billing-policy": {
    title: "Software billing policy",
    introduction:
      "The web dashboard does not require a personal app subscription. Each mobile user buys their own Apple or Google app-access subscription; that fee is separate from cooperative money and member obligations.",
    sections: [
      {
        title: "Price and renewal",
        body: "The planned base prices are US$0.99 for six months or US$1.99 for one year. Prices in other storefronts are localized by Apple or Google and may differ due to available price tiers, currency conversion and taxes. Both periods provide the same mobile app features, and each member, staff member or administrator pays through their own store account. These are owner-selected prices, subject to actual Apple and Google product configuration and storefront verification before sales open. Store checkout must show the final local price, applicable taxes, billing period and automatic-renewal terms. No trial is planned for launch.",
      },
      {
        title: "Cancellation and refunds",
        body: "Manage or cancel the subscription in the Apple or Google store account used to pay to stop future renewals. Uninstalling the app or deleting a HalaalVest account does not cancel the store subscription. The operator must approve the effects of cancellation, refund eligibility, failed payment, grace periods and account closure before sales open. This draft does not promise a refund entitlement or deny statutory rights.",
      },
      {
        title: "Mobile access",
        body: "Mobile app access requires an individual subscription for every user role. Store product configuration, server verification and release validation must be completed before purchases are enabled. Cooperative contributions, share payments and financing repayments are not app subscription purchases.",
      },
    ],
  },
  "cooperative-disclosures": {
    title: "Cooperative and financing disclosures",
    introduction:
      "Understand your cooperative’s rules before committing funds or accepting financing. HalaalVest supplies software; each cooperative must identify the party responsible for its member services.",
    sections: [
      {
        title: "Membership and savings",
        body: "Obtain the cooperative’s membership rules, contribution commitments, levies, withdrawal and exit process, share ownership terms, voting rights and complaints procedure. Savings, share capital and cooperative profits are different records and may have different withdrawal conditions.",
      },
      {
        title: "Financing costs and obligations",
        body: "Before accepting financing, review the principal, all charges, total payable, tenure, repayment amounts and dates, late-payment handling, early settlement, guarantor obligations and any payroll authorisation. Interest-free does not mean fee-free or zero total cost. Eligibility is subject to cooperative approval and available funds.",
      },
      {
        title: "Halaal methodology and investment risk",
        body: "The software model avoids interest-bearing financing logic and keeps charges and profits explicit. The product name is not proof of independent Shariah certification. Ask the cooperative who reviews its products and agreements. Profits and returns are not guaranteed, and deposit insurance or regulatory approval must not be assumed.",
      },
      {
        title: "Regulatory scope",
        body: "The operator must confirm launch markets and obtain a classification of the actual financing facilitation and funds-handling model. Store financial-service declarations and any required authorisations must match the operating model, including all applicable costs.",
      },
    ],
  },
} satisfies Record<string, PublicPolicy>

export type PolicyPublication =
  | { status: "draft"; version: string }
  | {
      status: "published"
      version: string
      effectiveAt: string
      approvedAt: string
      approvalReference: string
      approvedSnapshotHash: string
    }

// Publishing requires a reviewed content change and explicit approval evidence.
export const policyPublications: Record<
  keyof typeof publicPolicies,
  PolicyPublication
> = Object.fromEntries(
  Object.keys(publicPolicies).map((key) => [
    key,
    { status: "draft", version: publicPolicyRevision },
  ])
) as Record<keyof typeof publicPolicies, PolicyPublication>
export const requiredPlatformPolicyTypes = ["terms", "privacy"] as const

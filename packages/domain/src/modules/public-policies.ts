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
      "We will review cooperative administration handover, financial record retention and processor deletion separately. Cooperative charges already due remain subject to the cooperative’s rules.",
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
export const publicPolicyRevision = "2026-11-16-draft-9"
export const publicPolicyStatus = "draft" as const

export const publicPolicies = {
  terms: {
    title: "Platform terms",
    introduction:
      "HalaalVest provides software for cooperative administration. These platform terms are separate from your cooperative’s membership, savings, share, financing and guarantor agreements.",
    sections: [
      {
        title: "Who provides the service",
        body: "HalaalVest is operated by ZEROES AND ONE TECH HUB NIG LIMITED, a company registered in Nigeria with registration number RC 9264386, whose registered address is 10, Old Jebba Road, Ilorin, Kwara State, Nigeria. In these terms, “we” means that company and “you” means the person using a HalaalVest account. You can contact us at hello@halaalvest.com.",
      },
      {
        title: "Who can use HalaalVest",
        body: "You must be at least 18 years old, or the age of legal majority where you live if that is higher, and you must have been given access by a cooperative that uses HalaalVest. A cooperative that signs up for HalaalVest must be represented by a person with authority to act for it, and that person accepts these terms for the cooperative as well as for themselves.",
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
        title: "Documents and other content",
        body: "Cooperatives and their authorised users may upload member documents, receipt evidence and support messages. Upload only material you have the right or the cooperative’s authority to share. You and your cooperative keep ownership of that material. You give us a limited permission to store, display, copy and process it only as needed to provide, secure and support the service for your cooperative. To correct or remove material, ask your cooperative administrator or contact us; records the cooperative must keep for its accounts or audit may be restricted rather than removed.",
      },
      {
        title: "Fees, mobile access and account closure",
        body: "HalaalVest bills the cooperative, not individual members. The cooperative receives one bill a month for seats, website assistant messages above the free allowance and mobile access terms, as set out in the software billing policy. A cooperative may pass the seat fee to the members counted on its bill by charging their savings. Members can request mobile access from their cooperative. The cooperative approves access and discloses the charge before the member requests it, then applies that charge through its normal account process when due. Account closure does not settle charges already due under the cooperative’s rules.",
      },
      {
        title: "Availability, suspension and closure",
        body: "We work to keep HalaalVest available and secure, but we do not guarantee uninterrupted service, and maintenance or events outside our control can cause interruptions. We may suspend an account or workspace to protect the service, other users or cooperative records, or where these terms are seriously broken; where it is safe and lawful we will tell the affected cooperative first and explain how to resolve the issue. A cooperative may close its workspace at any time. Before closure, or within 30 days after it, a cooperative administrator can ask us for an export of the cooperative’s records.",
      },
      {
        title: "Responsibility and liability",
        body: "The cooperative, not HalaalVest, decides on membership, contributions, financing, profit sharing and withdrawals, and is responsible for those decisions. HalaalVest provides the software as it is, and we are not responsible for losses caused by a cooperative’s decisions, by information entered into the service, or by misuse of an account. To the extent the law allows, our total liability to a cooperative for any claim is limited to the fees that cooperative paid us in the 12 months before the claim. Nothing in these terms limits liability that cannot be limited by law, or any right you have under consumer protection law.",
      },
      {
        title: "Changes to these terms",
        body: "We may update these terms as the service changes. We will publish the new version with its effective date and, for changes that materially affect your rights, tell you in the service or by email before they take effect. Where an update needs your acceptance, we will ask for it the next time you use the service.",
      },
      {
        title: "Governing law and disputes",
        body: "These terms are governed by the laws of the Federal Republic of Nigeria. If you have a complaint, contact us first at hello@halaalvest.com so we can try to resolve it. If we cannot resolve it, the courts of Nigeria will have jurisdiction, without removing any right you have to bring a claim where you live.",
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
        body: "HalaalVest is operated by ZEROES AND ONE TECH HUB NIG LIMITED (RC 9264386), 10, Old Jebba Road, Ilorin, Kwara State, Nigeria. Your cooperative decides why and how its member records are kept, and is the controller of those records; we process them on the cooperative’s instructions to provide the service. We are the controller of the information we use to run HalaalVest itself, such as account sign-in, security, billing and service diagnostics. For any privacy question or request, contact us at hello@halaalvest.com.",
      },
      {
        title: "Information used by the service",
        body: "Depending on your role and enabled features, records include name, email, phone, cooperative access code, membership and employment details, account credentials, contributions, shares, financing and guarantor records, repayments, supporting documents, support messages, permissions and audit history. Sessions, device registration and push tokens support account security and notifications. For mobile access, the service records the request, acceptance of the disclosed charge, cooperative approval and access period. Charge and invoice records support reconciliation and audit.",
      },
      {
        title: "Why information is used",
        body: "We use information to sign you in, keep each cooperative’s records separate, maintain the financial records your cooperative asks us to keep, handle requests and approvals, send notifications, provide support and investigate problems. We rely on the following legal bases under the Nigeria Data Protection Act 2023 and similar laws: providing the service under these terms and the cooperative’s agreement with us; complying with legal obligations, such as keeping financial and audit records; our legitimate interest in keeping the service secure and reliable; and your consent for optional features such as push notifications, which you can withdraw at any time.",
      },
      {
        title: "Providers and diagnostics",
        body: "We use service providers for hosting, database, email, notifications, file storage and payments, and they process only the data needed for their function under contracts that require them to protect it. Sentry diagnostics are filtered to remove member identity and financial content. Logly receives limited usage events. Some providers process data outside Nigeria; where they do, we rely on the transfer safeguards that the Nigeria Data Protection Act 2023 allows, such as contractual protections. We do not sell personal data.",
      },
      {
        title: "Device permissions",
        body: "Push notifications require device permission. Device authentication can protect local app access without sending biometric templates to HalaalVest. You can change device permissions in your operating-system settings; disabling a permission can affect the associated feature.",
      },
      {
        title: "Retention and deletion",
        body: "We keep account information while your account is active. Financial, audit and dispute records belong to the cooperative’s books and are kept for as long as the cooperative or the law requires, with access restricted to people who need them. Other personal information is deleted or anonymised once it is no longer needed. When you ask us to delete your account, we remove your access, then delete or anonymise the information we are not required to keep, and tell you what we kept and why. Backups expire on a rolling schedule, so deleted information can remain in a backup for a short time before it is overwritten.",
      },
      {
        title: "Your rights and requests",
        body: "You can ask to access, correct or delete your personal information, to restrict or object to how it is used, to receive a copy of it, or to withdraw consent you gave. Send requests to hello@halaalvest.com or use the account-deletion page. We will check your identity first, and where your cooperative controls the record we will pass the request to it or act on its instructions. We aim to respond within 30 days. If you are not satisfied with our response, you can complain to the Nigeria Data Protection Commission or to the data protection authority where you live.",
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
      "HalaalVest sends each cooperative one bill a month. It covers seats, website assistant messages above the free allowance and mobile access terms due that month. Amounts are in Nigerian naira. HalaalVest takes no percentage of member savings, financing, repayments or profits.",
    sections: [
      {
        title: "Seat fee",
        body: "Each member whose membership is active when the month closes counts as one seat, at ₦35 per seat for that month. The cooperative chooses who pays. Either the cooperative pays the seat fee itself, or it charges ₦35 to each counted member, taken from that member’s savings. HalaalVest bills the cooperative for every seat either way.",
      },
      {
        title: "Website assistant",
        body: "Cooperative staff share 500 website assistant messages each month at no charge. Member messages and the mobile app are not counted. More messages are available only if the cooperative turns on assistant billing and sets a monthly naira cap. Each message above 500 then costs ₦15, up to that cap. With assistant billing off, or once the cap is reached, the assistant stops answering staff until the next month or until an administrator raises the cap. Lowering the cap stops further billable messages; messages already sent stay on the bill.",
      },
      {
        title: "Mobile access",
        body: "Members can request mobile access from their cooperative. Before requesting, a member sees the charge, ₦1,000 for 12 months, and when it is due. Access begins when the cooperative approves the request, and a new term requires a new request and approval. HalaalVest bills the cooperative for each approved term due that month. The cooperative posts the member’s charge to the member account through its normal charge process.",
      },
      {
        title: "The monthly bill",
        body: "After each month closes, HalaalVest issues the cooperative one bill listing seats, assistant messages above the allowance and mobile access terms. A month with nothing owed closes without a charge. Cooperative administrators and finance officers pay the bill from Billing in the dashboard, and record which of the cooperative’s funds paid it. Payment is made through Paystack, or by bank transfer that a HalaalVest platform owner marks paid once received. The cooperative pays HalaalVest directly; whether members have paid their own charges does not change the bill or members’ app access.",
      },
      {
        title: "Questions about a charge",
        body: "Members should ask their cooperative about the amount, due date or a disputed charge on their member account. Seat fee and mobile access charges appear as their own entries on the member account, separate from savings contributions, share capital and financing repayments. Cooperatives can raise questions about a bill through HalaalVest support.",
      },
      {
        title: "Review before launch",
        body: "Late payment, refunds, disputed bills and notice of price changes require owner and legal review. This draft does not set those terms.",
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
> = {
  ...(Object.fromEntries(
    Object.keys(publicPolicies).map((key) => [
      key,
      { status: "draft", version: publicPolicyRevision },
    ])
  ) as Record<keyof typeof publicPolicies, PolicyPublication>),
  // Owner approved the exact terms and privacy wording in chat on
  // 16 November 2026. The hash binds that text: any wording change stops the
  // publication from being effective until it is re-approved and re-hashed.
  terms: {
    status: "published",
    version: "2026-11-16",
    approvedAt: "2026-11-16T08:11:00.000Z",
    effectiveAt: "2026-11-16T08:11:00.000Z",
    approvalReference: "Owner approval in chat, 2026-11-16",
    approvedSnapshotHash:
      "fd10deedaf03e9f8e69cf68f163522a33bdbeddbc4d1bc326468555ee0c8e448",
  },
  privacy: {
    status: "published",
    version: "2026-11-16",
    approvedAt: "2026-11-16T08:11:00.000Z",
    effectiveAt: "2026-11-16T08:11:00.000Z",
    approvalReference: "Owner approval in chat, 2026-11-16",
    approvedSnapshotHash:
      "57bfc2f9f5b38537f58a9dea67fbbd23f1fa3a89c29d280bee1e9732c6109bbe",
  },
}
export const requiredPlatformPolicyTypes = ["terms", "privacy"] as const

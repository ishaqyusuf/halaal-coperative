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
export const publicPolicyRevision = "2026-11-16-draft-10"
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
    title: "Close your HalaalVest account",
    interactiveCopy: publicDeletionFlowCopy,
    introduction:
      "You can ask us to close your HalaalVest account and remove your personal details. Your cooperative holds your savings, shares and financing, so closing works like leaving a bank: your cooperative settles your money under its own rules first, and then we close your login. Records of your money stay in your cooperative’s books for the period the law requires.",
    sections: [
      {
        title: "How to ask",
        body: "If you can sign in, open More in the HalaalVest app and choose the option to close your account. If you cannot sign in, use the form on this page: enter your account email and your cooperative’s short address or website, and we will email you a link to confirm the request is yours. You can also email hello@halaalvest.com from the address on your account. Never send a password, one-time code, bank details or a copy of an identity document.",
      },
      {
        title: "What happens next",
        body: "First we check that the request comes from you, and we may ask you for more information. If you still have savings or shares, or still owe money, your cooperative settles your money under its rules: it pays out what it owes you, and you repay what you owe. If you have guaranteed someone else’s financing, your cooperative may keep you to that guarantee until the financing is repaid or another guarantor takes your place. Your cooperative can decline to settle, and must tell you why. Once your money is settled, or if there was none, we close your login.",
      },
      {
        title: "What closing removes",
        body: "When we close your account, you are signed out everywhere and can no longer sign in. We remove your password, device sign-ins, push notifications and assistant conversations. We then erase your contact details, identity and KYC details, member documents, sign-up details and the support messages you wrote that did not involve money. We email you when it is done, saying what we kept and why.",
      },
      {
        title: "What we keep",
        body: "Records of your money stay in your cooperative’s books with your name and member number, so the cooperative can show who it paid and who paid it. These include contributions, savings, shares, financing, repayments, receipts, charges, guarantees and support cases about money. We also keep records of the documents you accepted and the account’s activity history. These records are kept for the period the law requires, and only people who need them can see them. Backups expire on a rolling schedule, so removed details can stay in a backup for a short time.",
      },
      {
        title: "How long it takes",
        body: "We aim to finish within 30 days of your request. If your cooperative still needs to settle your money, we tell you, and we close your login once it has. You can withdraw your request in the app until your cooperative starts settling your money or we close your login.",
      },
      {
        title: "Administrators and whole workspaces",
        body: "This page is for one person’s account. Closing an account does not close the cooperative’s workspace or remove other members’ records. If you are a cooperative’s only administrator, another administrator must take over before we can close your account. To close a whole workspace, an administrator should contact us at hello@halaalvest.com.",
      },
    ],
  },
  support: {
    title: "HalaalVest support",
    introduction:
      "There are two places to get help. Your cooperative helps with your money and membership. HalaalVest helps with the software, your login, your cooperative’s HalaalVest bill and privacy requests.",
    sections: [
      {
        title: "Help from your cooperative",
        body: "For contributions, savings, shares, financing, guarantees, withdrawals, charges on your member account or leaving the cooperative, ask your cooperative. Members can open Ask for help in the app or on the web, and cooperative staff reply there. A support case records the question and the reply; it does not move money or change a record by itself.",
      },
      {
        title: "Help from HalaalVest",
        body: "Email hello@halaalvest.com if you cannot sign in, if the app or website is not working as it should, if your cooperative has a question about its HalaalVest bill, or if you want to make a privacy request. Tell us your name, your cooperative’s name and what happened, and include any error reference shown on screen. Never send a password, one-time code, bank details or a copy of an identity document.",
      },
      {
        title: "When we reply",
        body: "We read support email on working days, Monday to Friday, except Nigerian public holidays, and aim to reply within two working days. We do not offer round-the-clock support. Privacy requests are answered within the times set out in the privacy notice.",
      },
      {
        title: "Getting back into your account",
        body: "Your cooperative gives you access to HalaalVest, so it can often help you sign in again. If it cannot, email us. We check that the request comes from you before we change anything on an account.",
      },
      {
        title: "Privacy requests and closing your account",
        body: "To close your account, use the close-account page or the option in the app. For any other privacy request, such as getting a copy of your information or correcting it, email us with “Privacy request” in the subject.",
      },
      {
        title: "Security problems",
        body: "If you think someone else has used your account, or you have found a security weakness, email us with “Security” in the subject. Tell your cooperative as well if money may be affected.",
      },
      {
        title: "Complaints",
        body: "If you are unhappy with how we handled a request, reply to our email and ask for it to be reviewed. For a complaint about how your cooperative runs your account or your money, use the cooperative’s complaints procedure.",
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
        body: "Each member whose membership is active on the day the bill is issued counts as one seat, at ₦35 per seat for that month. The cooperative chooses who pays. Either the cooperative pays the seat fee itself, or it charges ₦35 to each counted member, taken from that member’s savings. Member charges begin once the cooperative has finished setting up its opening records; until then the cooperative pays its seats itself. HalaalVest bills the cooperative for every seat either way.",
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
        title: "When billing starts",
        body: "There is no free trial. A cooperative is billed for every month in which its workspace holds real records, including months spent setting up, starting with the month it joins HalaalVest. Test and demonstration workspaces are not billed.",
      },
      {
        title: "The monthly bill",
        body: "On the first day of each month, HalaalVest issues the cooperative one bill for the month before, listing seats, assistant messages above the allowance and mobile access terms. The bill is due when it is issued. A month with nothing owed closes without a charge. Cooperative administrators and finance officers pay the bill from Billing in the dashboard, and record which of the cooperative’s funds paid it. Payment is made through Paystack, or by bank transfer to the account HalaalVest gives the cooperative; a HalaalVest platform owner marks a transfer paid once the money arrives. The cooperative pays HalaalVest directly; whether members have paid their own charges does not change the bill or members’ app access.",
      },
      {
        title: "Late payment",
        body: "We do not charge late fees or interest. If a bill stays unpaid, we will contact the cooperative’s administrators. Continued non-payment can lead to the workspace being suspended under the platform terms, but only after we have told the cooperative and given it reasonable time to pay. Suspension never deletes the cooperative’s records.",
      },
      {
        title: "Mistakes, refunds and disputed bills",
        body: "If a cooperative thinks a bill is wrong, an administrator should email hello@halaalvest.com with the bill month and the reason. We will check the seats, assistant messages and mobile access terms behind the bill and reply. If we charged too much, or a bill was paid twice, we refund the difference to the account it came from or take it off the next bill, as the cooperative prefers. Otherwise, payments for a bill are not refundable.",
      },
      {
        title: "Questions about a member charge",
        body: "Members should ask their cooperative about the amount, due date or a disputed charge on their member account. Seat fee and mobile access charges appear as their own entries on the member account, separate from savings contributions, share capital and financing repayments.",
      },
      {
        title: "Price changes",
        body: "We will tell cooperative administrators at least 30 days before a price change takes effect, by email and in the dashboard. A new price applies only to months that start after it takes effect. A mobile access term keeps the price the member saw when they requested it.",
      },
    ],
  },
  "cooperative-disclosures": {
    title: "Cooperative and financing disclosures",
    introduction:
      "HalaalVest is software that cooperatives use to keep their members’ records. Your cooperative, not HalaalVest, provides your membership, savings, shares and financing. Read this before you commit money to a cooperative or accept financing from it.",
    sections: [
      {
        title: "Who provides your financial services",
        body: "Your cooperative takes your contributions, holds its members’ funds, decides on financing and shares its profits. HalaalVest is not a bank, lender, deposit-taker or investment adviser, and it does not hold, lend or move members’ money. Payments you make to the cooperative go to the cooperative’s own accounts, and HalaalVest records them as the cooperative enters and approves them. Ask your cooperative for its registered name, registration details and the people responsible for running it.",
      },
      {
        title: "Before you join or save",
        body: "Ask your cooperative for its membership rules, contribution commitments, levies and charges, how withdrawals and leaving work, what owning shares means, your voting rights and its complaints procedure. Savings, share capital and profit are separate records and can have different rules for withdrawal. When you leave, the cooperative settles your money under its rules before your account is closed.",
      },
      {
        title: "Before you accept financing",
        body: "A financing request in HalaalVest is not an approval and not a promise that funds are available. The app lists the charges separately from the amount you ask for; the amount shown does not include them. Before you accept, ask the cooperative for the amount, every charge, the total you will repay, the repayment amounts and dates, what happens if you pay late or early, and any payroll deduction you are authorising. Interest-free does not mean free: charges still apply, and the total you repay can be more than the amount you receive.",
      },
      {
        title: "Guaranteeing someone else",
        body: "If you agree to guarantee another member’s financing, you promise to help repay it if they stop paying. Your cooperative can ask you to pay, and may keep you to the guarantee until the financing is repaid or another guarantor takes your place, including if you want to leave the cooperative.",
      },
      {
        title: "Halaal approach and risk",
        body: "HalaalVest is built so that cooperatives can run financing without interest and show every charge and profit share openly. The name HalaalVest is not a Shariah certification of your cooperative or its products; ask your cooperative who reviews its products and agreements. Profits from the cooperative’s businesses are not guaranteed and can be lower than expected or nothing. Money you hold with a cooperative is not a bank deposit and is not insured by the Nigeria Deposit Insurance Corporation.",
      },
      {
        title: "Complaints about your cooperative",
        body: "Raise a problem about your money or membership with your cooperative first, using its complaints procedure. If it is not resolved, you can contact the authority that registered your cooperative in your state. For problems with the software itself, contact HalaalVest support.",
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
  // Owner approved every remaining draft ("all the draft policies are
  // approved") in chat on 18 November 2026: the revision 2026-11-16-draft-10
  // wording from 32542c3d, unchanged. Each hash binds that exact text, and the
  // delete-account hash also binds the live deletion form and email copy.
  support: {
    status: "published",
    version: "2026-11-18",
    approvedAt: "2026-11-18T07:54:00.000Z",
    effectiveAt: "2026-11-18T07:54:00.000Z",
    approvalReference: "Owner approval in chat, 2026-11-18",
    approvedSnapshotHash:
      "df5e6a1c1b8b6e790f9617f0db670fc350c2f338522a4b537eebfc0c9cf9142a",
  },
  "delete-account": {
    status: "published",
    version: "2026-11-18",
    approvedAt: "2026-11-18T07:54:00.000Z",
    effectiveAt: "2026-11-18T07:54:00.000Z",
    approvalReference: "Owner approval in chat, 2026-11-18",
    approvedSnapshotHash:
      "27c2649b79f0d0c2fdd3e9d9ccc886dcc26baa722c1c24ee5486e55ee1781af1",
  },
  "billing-policy": {
    status: "published",
    version: "2026-11-18",
    approvedAt: "2026-11-18T07:54:00.000Z",
    effectiveAt: "2026-11-18T07:54:00.000Z",
    approvalReference: "Owner approval in chat, 2026-11-18",
    approvedSnapshotHash:
      "1616db96ac0c5cd520415d34e63d3c8f47aa4e81ac4b8d23dc1b1b42a06eef4a",
  },
  "cooperative-disclosures": {
    status: "published",
    version: "2026-11-18",
    approvedAt: "2026-11-18T07:54:00.000Z",
    effectiveAt: "2026-11-18T07:54:00.000Z",
    approvalReference: "Owner approval in chat, 2026-11-18",
    approvedSnapshotHash:
      "90a82498e4134158dbc0399a3bc5b942ab1d73a94bcf652c3ed21a07bcbf30e0",
  },
}
export const requiredPlatformPolicyTypes = ["terms", "privacy"] as const

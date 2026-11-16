export const accountDeletionNoticeCopy = {
  scope:
    "Request deletion of your HalaalVest account and associated personal data across your cooperatives.",
  consequences: [
    "We verify your identity and review any cooperative administration handover before revoking access.",
    "Records that must be retained for legal or cooperative financial obligations are reviewed separately; requesting deletion does not settle those obligations.",
    "You can cancel this request in the app before processing begins. Access revocation alone does not mean erasure is complete.",
  ],
} as const

/**
 * When a privacy (account deletion) request is "done" (ADR-20261116
 * privacy request completion): within this many days of the request,
 * contact, ID and other personal details are erased, the cooperative's money
 * records are kept under the member's name and number, the person is told,
 * and the request is marked completed with an audit entry.
 */
export const PRIVACY_REQUEST_RESPONSE_DAYS = 30

export function privacyRequestDueAt(requestedAt: Date | string) {
  const start = new Date(requestedAt)
  return new Date(
    start.getTime() + PRIVACY_REQUEST_RESPONSE_DAYS * 24 * 60 * 60 * 1000
  )
}

/** The confirmation email the person gets when their request is done. */
export const privacyCompletionEmailCopy = {
  eventLabel: "Account closed",
  subject: "Your HalaalVest account is closed",
  previewText: "We have finished your request to close your account.",
  actionLabel: "Read the privacy notice",
  bodyText:
    "We have closed your HalaalVest account. Your sign-in, contact details, ID details, documents and support messages have been deleted or anonymised. Your cooperative must keep records of your money, such as contributions, shares, financing and repayments, for the period the law requires; those records keep your name and member number so the cooperative knows who it paid. This is the last email we will send to this address about your account.",
  referenceLabel: "Request reference",
  cooperativeLabel: "Cooperative",
  retainedLabel: "What we kept and why",
} as const

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
 * personal details are erased or anonymised, the cooperative's financial
 * records are kept with the person's identity removed, the person is told,
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
  eventLabel: "Account deletion complete",
  subject: "Your HalaalVest account deletion is complete",
  previewText: "We have finished your account deletion request.",
  actionLabel: "Read the privacy notice",
  bodyText:
    "We have finished your request to delete your HalaalVest account. Your sign-in, contact details, member profile, documents and support messages have been deleted or anonymised. Your cooperative must keep its financial records, such as contributions, shares, financing and repayments; those stay in its books with your name and contact details removed. This is the last email we will send to this address about your account.",
  referenceLabel: "Request reference",
  cooperativeLabel: "Cooperative",
  retainedLabel: "What we kept and why",
} as const

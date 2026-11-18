export const accountDeletionNoticeCopy = {
  // "Close my account" (owner, 18 Nov 2026): closing works like closing a
  // bank account, so the cooperative settles the member's money before the
  // login closes. Kept in line with the published close-account policy.
  scope:
    "Ask to close your HalaalVest account. Closing works like closing a bank account: your cooperative settles your money first, then we close your login.",
  consequences: [
    "We verify your identity first, and we may ask you for more information. If you run a cooperative, another administrator must take over.",
    "Your cooperative settles your savings, special savings, shares and loans before we close your login: it pays out what it owes you, and you repay what you owe. A guarantee on someone else’s loan must end first too.",
    "Records of your money are retained in your cooperative’s books, with your name and member number, for the period the law requires. Your contact and ID details are erased.",
    "You can cancel this request in the app until your cooperative starts settling your money or we close your login.",
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

import type { MemberStateTone } from "@/lib/members/member-status-words"

export type PlatformWord = { label: string; tone: MemberStateTone }

/**
 * Where a privacy (delete my account) request stands, in plain words.
 * The steps are: check who asked → end their access → write down what was
 * removed or kept.
 */
export function getPrivacyRequestWord(request: {
  accessRevokedAt?: Date | string | null
  status: string
}): PlatformWord {
  if (request.accessRevokedAt || request.status === "processing")
    return { label: "Access ended", tone: "muted" }

  switch (request.status) {
    case "submitted":
      return { label: "New", tone: "warning" }
    case "awaiting_information":
      return { label: "Waiting for them", tone: "warning" }
    case "verified":
      return { label: "Ready to end access", tone: "danger" }
    case "completed":
      return { label: "Done", tone: "good" }
    case "rejected":
      return { label: "Turned down", tone: "muted" }
    case "cancelled":
      return { label: "Cancelled", tone: "muted" }
    default:
      return { label: "Open", tone: "muted" }
  }
}

/** The one thing to do next on a privacy request. */
export function getPrivacyNextStep(request: {
  accessRevokedAt?: Date | string | null
  status: string
}) {
  if (request.accessRevokedAt || request.status === "processing")
    return "Write down what was removed and what must be kept."
  if (request.status === "verified") return "End their access."
  if (
    request.status === "submitted" ||
    request.status === "awaiting_information"
  )
    return "Check it is really them."
  return null
}

const hour = 60 * 60 * 1000

/**
 * How urgent a Google refund review is. Google gives a "review by" time;
 * after it passes Google decides without us.
 */
export function getRefundReviewWord(
  reviewBy: string | null | undefined,
  now: number | null
): PlatformWord {
  const due = reviewBy ? Date.parse(reviewBy) : Number.NaN

  if (!Number.isFinite(due)) return { label: "No deadline", tone: "danger" }
  if (now === null) return { label: "Waiting", tone: "muted" }
  if (due <= now) return { label: "Late", tone: "danger" }
  if (due - now <= 2 * hour) return { label: "Due soon", tone: "warning" }
  return { label: "Waiting", tone: "muted" }
}

/** "in 3 hours", "2 days ago": short time left or past for a deadline. */
export function formatTimeFromNow(
  value: string | null | undefined,
  now: number
) {
  const at = value ? Date.parse(value) : Number.NaN
  if (!Number.isFinite(at)) return null
  const diff = at - now
  const abs = Math.abs(diff)
  const amount =
    abs < hour
      ? `${Math.max(1, Math.round(abs / 60_000))} min`
      : abs < 48 * hour
        ? plural(Math.round(abs / hour), "hour")
        : plural(Math.round(abs / (24 * hour)), "day")
  return diff >= 0 ? `in ${amount}` : `${amount} ago`
}

export function plural(count: number, word: string) {
  return `${count.toLocaleString("en-NG")} ${word}${count === 1 ? "" : "s"}`
}

/** Plain words for a test-data removal run. */
export function getQaRunWord(status: string): PlatformWord {
  switch (status) {
    case "queued":
      return { label: "Starting", tone: "warning" }
    case "running":
      return { label: "Removing", tone: "warning" }
    case "completed":
      return { label: "Done", tone: "good" }
    case "partially_completed":
      return { label: "Partly done", tone: "danger" }
    case "blocked":
      return { label: "Stopped", tone: "danger" }
    case "failed":
      return { label: "Failed", tone: "danger" }
    default:
      return { label: "Unknown", tone: "muted" }
  }
}

/** What each processing-note category means, in plain words. */
export const privacyNoteCategoryWords = {
  member_profile_documents: "Member profile and documents",
  shared_financial_records: "Money records shared with the cooperative",
  support_notifications_audit: "Support, messages and activity history",
  private_uploads: "Uploaded files",
  legal_store_records: "Legal and app store records",
  external_processors_backups: "Outside services and backups",
  completion_contact: "Telling them it is done",
} as const

export type PrivacyNoteCategory = keyof typeof privacyNoteCategoryWords

import type { StatusCardTone } from "@/components/app/status-card"
import { privacyRequestDueAt } from "@halaalvest/domain/account-privacy-notice"
import type { PrivacyNotice, PrivacyRequest } from "../api/account-privacy-api"

type Status = PrivacyRequest["status"]

export type PrivacyStatusCopy = {
  body?: string
  cancel?: boolean
  icon: string
  pill: string
  /** Steps finished (Received, Verified, Processing, Completed). */
  step?: number
  title?: string
  tone: StatusCardTone
}

export const PRIVACY_STATUS: Record<Status, PrivacyStatusCopy> = {
  awaiting_information: {
    body: "We couldn’t verify your request yet. Check your email for what we need.",
    cancel: true,
    icon: "Mail",
    pill: "Needs information",
    step: 1,
    title: "We need more information",
    tone: "warning",
  },
  cancelled: { icon: "Undo2", pill: "Cancelled", tone: "neutral" },
  completed: { icon: "Check", pill: "Completed", tone: "success" },
  processing: {
    body: "Account access has ended. Data processing is still in progress.",
    icon: "RefreshCw",
    pill: "Processing",
    step: 2,
    title: "Your account is being deleted",
    tone: "brand",
  },
  rejected: { icon: "CircleX", pill: "Not processed", tone: "danger" },
  submitted: {
    body: "We verify your identity before anything changes. You can still cancel.",
    cancel: true,
    icon: "Clock",
    pill: "Received",
    step: 1,
    title: "Your deletion request was received",
    tone: "warning",
  },
  verified: {
    body: "Your request is queued for processing. You can still cancel until processing begins.",
    cancel: true,
    icon: "ShieldCheck",
    pill: "Verified",
    step: 2,
    title: "Your identity is verified",
    tone: "info",
  },
}

export const PRIVACY_STEPS = ["Received", "Verified", "Processing", "Completed"] as const

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
})
export const privacyDay = (value: Date | string) => dayFormat.format(new Date(value))

/** The request still moving through review (at most one at a time). */
export function livePrivacyRequest(requests: readonly PrivacyRequest[]) {
  return requests.find((request) => PRIVACY_STATUS[request.status].step !== undefined) ?? null
}

/** A request the person can still withdraw (not yet processing). */
export function canCancelPrivacyRequest(request: PrivacyRequest) {
  return Boolean(PRIVACY_STATUS[request.status].cancel) && !request.accessRevokedAt
}

export function pastPrivacyRequests(requests: readonly PrivacyRequest[]) {
  return requests.filter((request) => PRIVACY_STATUS[request.status].step === undefined)
}

export function privacyDueDay(request: Pick<PrivacyRequest, "requestedAt">) {
  return privacyDay(privacyRequestDueAt(request.requestedAt))
}

export function pastRequestNote(request: PrivacyRequest) {
  if (request.status === "cancelled") return `Cancelled on ${privacyDay(request.updatedAt)}`
  if (request.completionSummary) return request.completionSummary
  if (request.status === "completed" && request.completedAt)
    return `Completed on ${privacyDay(request.completedAt)}`
  return `Updated ${privacyDay(request.updatedAt)}`
}

/**
 * Short headings over the notice's consequence lines (presentation copy).
 * Matched by meaning, so a reordered or added line keeps a sensible
 * heading; anything unmatched gets a plain "Please review".
 */
const HEADINGS: { match: RegExp; heading: string; icon: string; tone: StatusCardTone }[] = [
  { heading: "We verify it’s you first", icon: "ShieldCheck", match: /verify your identity/i, tone: "brand" },
  { heading: "Money records are kept", icon: "Archive", match: /retained|financial obligations/i, tone: "warning" },
  { heading: "You can cancel before processing", icon: "Undo2", match: /cancel this request/i, tone: "info" },
]

export function noticeItems(notice: Pick<PrivacyNotice, "consequences">) {
  return notice.consequences.map((text) => {
    const found = HEADINGS.find((item) => item.match.test(text))
    return {
      heading: found?.heading ?? "Please review",
      icon: found?.icon ?? "Info",
      text,
      tone: found?.tone ?? ("neutral" as StatusCardTone),
    }
  })
}

/** "notice-sha256-1a2b…" → "1a2b3c4d": a short, quotable notice version. */
export function noticeVersionLabel(version: string) {
  const hash = version.replace(/^notice-sha256-/, "")
  return hash.length > 12 ? hash.slice(0, 8) : hash
}

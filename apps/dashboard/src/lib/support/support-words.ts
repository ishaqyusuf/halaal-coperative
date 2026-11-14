/**
 * Plain words for support cases. A case's status word depends on who is
 * looking and who wrote last: staff see "Needs reply" when the member spoke
 * last, the member sees "Answered" when staff did.
 */
import type {
  SupportCaseCategory,
  SupportCaseMessageAuthorType,
  SupportCasePriority,
  SupportCaseStatus,
} from "@halaalvest/db"
import type { MemberStateTone } from "@/lib/members/member-status-words"

export type SupportViewer = "member" | "staff"

export type SupportCaseState = {
  /** True when the viewer is the one who should act next. */
  isYourTurn: boolean
  label: string
  tone: MemberStateTone
}

export function isSupportCaseFinished(status: SupportCaseStatus) {
  return status === "resolved" || status === "closed"
}

export function getSupportCaseState(
  {
    lastAuthor,
    status,
  }: {
    lastAuthor?: SupportCaseMessageAuthorType | null
    status: SupportCaseStatus
  },
  viewer: SupportViewer
): SupportCaseState {
  if (status === "closed") {
    return { isYourTurn: false, label: "Closed", tone: "muted" }
  }

  if (status === "resolved") {
    return { isYourTurn: false, label: "Solved", tone: "good" }
  }

  const staffSpokeLast = lastAuthor === "staff"

  if (viewer === "staff") {
    if (!staffSpokeLast) {
      return { isYourTurn: true, label: "Needs reply", tone: "warning" }
    }

    return status === "waiting_on_member"
      ? { isYourTurn: false, label: "Waiting for member", tone: "muted" }
      : { isYourTurn: false, label: "Replied", tone: "muted" }
  }

  if (!staffSpokeLast) {
    return { isYourTurn: false, label: "Sent", tone: "muted" }
  }

  return status === "waiting_on_member"
    ? { isYourTurn: true, label: "Your reply needed", tone: "warning" }
    : { isYourTurn: false, label: "Answered", tone: "good" }
}

export const supportTopicLabels: Record<SupportCaseCategory, string> = {
  account_update: "My details",
  feature_request: "Suggestion",
  financing: "Funding",
  other: "Something else",
  payment_issue: "A payment",
  procurement: "An item request",
  shares: "Shares",
  technical: "Using the app",
}

/** Topics in the order a member is most likely to need them. */
export const supportTopicOptions: ReadonlyArray<{
  label: string
  value: SupportCaseCategory
}> = (
  [
    "payment_issue",
    "account_update",
    "financing",
    "procurement",
    "shares",
    "technical",
    "feature_request",
    "other",
  ] as const
).map((value) => ({ label: supportTopicLabels[value], value }))

export const supportPriorityLabels: Record<SupportCasePriority, string> = {
  high: "High",
  low: "Low",
  normal: "Normal",
  urgent: "Urgent",
}

export const supportPriorityOptions: ReadonlyArray<{
  label: string
  value: SupportCasePriority
}> = (["low", "normal", "high", "urgent"] as const).map((value) => ({
  label: supportPriorityLabels[value],
  value,
}))

/** Status choices staff can save from the case details (not the finishing ones). */
export const supportActiveStatusOptions: ReadonlyArray<{
  label: string
  value: SupportCaseStatus
}> = [
  { label: "New", value: "open" },
  { label: "Being checked", value: "in_progress" },
  { label: "Waiting for member", value: "waiting_on_member" },
]

/** The "Show" filter: values map to a status or a status group. */
export const supportShowFilterOptions = [
  { id: "active", name: "Open" },
  { id: "waiting_on_member", name: "Waiting for member" },
  { id: "finished", name: "Solved or closed" },
] as const

export const supportMemberShowFilterOptions = [
  { id: "active", name: "Open" },
  { id: "finished", name: "Solved or closed" },
] as const

/** A short subject from the first line of a member's message. */
export function supportSubjectFromMessage(
  message: string,
  topic: SupportCaseCategory
) {
  const firstLine = message.trim().split(/\r?\n/)[0]?.trim() ?? ""

  if (!firstLine) return supportTopicLabels[topic]
  if (firstLine.length <= 80) return firstLine

  const cut = firstLine.slice(0, 80)
  const lastSpace = cut.lastIndexOf(" ")

  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

export function formatSupportDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatSupportDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleString("en-NG", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  })
}

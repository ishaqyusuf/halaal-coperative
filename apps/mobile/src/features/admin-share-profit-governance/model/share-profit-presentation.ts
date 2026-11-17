import type { StatusTone } from "@/components/ui/status-pill"
import type {
  ProfitEntry,
  ProfitPeriod,
  ShareApplication,
} from "./admin-share-profit-governance-types"

export const LIFECYCLE = ["Draft", "Reviewed", "Approved", "Published"] as const
export const SHARE_LIFECYCLE = ["Requested", "Reviewed", "Approved", "Posted"] as const

const STATUS: Record<string, [string, StatusTone]> = {
  approved: ["Approved", "success"],
  archived: ["Archived", "neutral"],
  cancelled: ["Cancelled", "neutral"],
  closed: ["Closed", "neutral"],
  completed: ["Published", "success"],
  draft: ["Draft", "neutral"],
  pending: ["Pending", "warning"],
  published: ["Published", "success"],
  rejected: ["Rejected", "danger"],
  reviewed: ["Needs approval", "warning"],
}

export function shareProfitStatus(status: string) {
  const [label, tone] = STATUS[status] ?? [status, "neutral" as StatusTone]
  return { label, tone }
}

/**
 * Where a profit entry sits on Draft → Reviewed → Approved → Published.
 * 4 means every step is done (published).
 */
export function entryStage(status: ProfitEntry["status"]) {
  return { approved: 2, completed: 4, reviewed: 1 }[status as string] ?? 0
}

export function periodStage(period: ProfitPeriod) {
  if (period.status === "published" || period.status === "closed") return 4
  if (!period.entries.length) return 0
  return Math.min(...period.entries.map((entry) => entryStage(entry.status)), 4)
}

/** Pending sits on Requested; a decided request has finished every step. */
export function shareStage(status: ShareApplication["status"]) {
  return status === "pending" ? 0 : 4
}

export type PeriodChip = { label: string; tone: StatusTone }

/** The chips under a period card, like the approved design. */
export function periodChips(period: ProfitPeriod): PeriodChip[] {
  if (period.entries.some((entry) => entry.status === "reviewed" && !entry.allocationsReconcile))
    return [{ label: "Doesn’t reconcile", tone: "danger" }]
  const chips: PeriodChip[] = []
  if (period.pendingApprovalCount)
    chips.push({ label: `${period.pendingApprovalCount} to approve`, tone: "warning" })
  if (period.readyToPublishCount)
    chips.push({ label: `${period.readyToPublishCount} to publish`, tone: "brand" })
  if (chips.length) return chips
  const status = shareProfitStatus(period.status)
  return [{ label: status.label, tone: status.tone }]
}

/** Days since a request was sent, from its ISO time. */
export function daysSince(iso: string, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000))
}

export function evidenceError(note: string) {
  return note.trim().length < 2 ? "Add the evidence for the audit trail." : null
}

export function clampUnits(units: number, requested: number) {
  return Math.max(1, Math.min(requested, Math.round(units)))
}

/** Member holding after approving `units` of a pending request. */
export function holdingAfter(
  position: { compulsoryUnits: number; approvedOptionalUnits: number } | null,
  units: number
) {
  if (!position) return null
  return position.compulsoryUnits + position.approvedOptionalUnits + units
}
